import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import env from '@/config/env';
import { addMatchingJob, getQueueStats } from '@/services/matching/processors/queue';
import { generateEmbedding } from '@/services/matching/embeddingService';
import { checkRateLimit } from '@/utils/ai/checkRateLimit';
import { prisma } from '@/lib/prisma';
import { findMatchingProjectsForMemberProfile, findMatchingTeamsForMemberProfile } from '@/services/matching/matchingService';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Increase pool size (20 connections)
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if no connection available after 5s
});

@Controller('v1/matching')
export class MatchingController {
  @Post('run')
  async runMatching(@Req() req: any, @Res() res: Response) {
    const schema = z.object({
      type: z.enum(['full', 'project', 'proposal', 'team', 'profile']).default('full'),
      entityId: z.string().optional(),
      priority: z.number().int().min(0).max(10).optional(),
    });

    const body = schema.parse(req.body || {});

    await addMatchingJob({ type: body.type, entityId: body.entityId }, { priority: body.priority ?? 1 });
    res.json({ ok: true });
  }

  @Get('stats')
  async stats(_req: any, @Res() res: Response) {
    const stats = await getQueueStats();
    res.json(stats);
  }

  @Post('search')
  async search(@Req() req: any, @Res() res: Response) {
    const schema = z.object({
      userId: z.string().optional(),
      type: z.enum(['projects', 'proposals', 'teams']).default('projects'),
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(20),
      filters: z
        .object({
          industry: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          stage: z.array(z.string()).optional(),
          location: z.array(z.string()).optional(),
        })
        .optional(),
    });

    const body = schema.parse(req.body || {});

    const rateLimited = await checkRateLimit(
      {
        headers: {
          get: (key: string) => {
            const headerValue = req.headers[key.toLowerCase()];
            if (Array.isArray(headerValue)) {
              return headerValue[0];
            }
            return headerValue as string | undefined;
          },
        },
      },
      { RPM: 60, RPD: 2000 }
    );

    if (rateLimited instanceof Response) {
      const text = await rateLimited.text();
      return res.status(rateLimited.status).type('application/json').send(text);
    }

    const vector = await generateEmbedding(body.query);

    let sql = '';
    const params: any[] = [vector, body.limit];

    if (body.type === 'projects') {
      sql = `
      SELECT p.id, p.name, p.description, p.tags, p.industry,
             1 - (p.embedding <=> $1::vector) AS similarity
      FROM projects p
      WHERE p.is_public = true AND p.is_active = true AND p.embedding IS NOT NULL
      ORDER BY p.embedding <=> $1::vector
      LIMIT $2
    `;
    } else if (body.type === 'proposals') {
      sql = `
      SELECT pr.id, pr.title, pr.short_summary AS description, pr.industry,
             1 - (pr.embedding <=> $1::vector) AS similarity
      FROM proposals pr
      WHERE pr.visibility = 'PUBLIC' AND pr.embedding IS NOT NULL
      ORDER BY pr.embedding <=> $1::vector
      LIMIT $2
    `;
    } else {
      sql = `
      SELECT t.id, t.name, t.description, t.industry, t.skills,
             1 - (t.embedding <=> $1::vector) AS similarity
      FROM teams t
      WHERE t.is_active = true AND t.embedding IS NOT NULL
      ORDER BY t.embedding <=> $1::vector
      LIMIT $2
    `;
    }

    const result = await pool.query(sql, params);
    const filters = body.filters || {};

    const filtered = result.rows.filter((row) => {
      let ok = true;

      if (filters.industry?.length) {
        const rowInd = (row.industry || []).map((x: string) => x.toLowerCase());
        ok &&= filters.industry.some((i) => rowInd.includes(i.toLowerCase()));
      }

      if (filters.tags?.length && row.tags) {
        const rowTags = (row.tags || []).map((x: string) => x.toLowerCase());
        ok &&= filters.tags.some((t) => rowTags.includes(t.toLowerCase()));
      }

      return ok;
    });

    res.json(filtered);
  }

  @Get('user/:userId')
  async getUserMatches(
    @Param('userId') userId: string,
    @Query('limit') limitParam: string | undefined,
    @Res() res: Response
  ) {
    try {
      const limit = Number(limitParam ?? 20);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isActive: true,
          skills: { select: { skill: { select: { name: true } } } },
          memberProfile: { select: { rolePreferences: true, industryPreferences: true } },
          founderProfile: { select: { industryPreferences: true, locationPreferences: true } },
          investorProfile: { select: { preferredIndustries: true, preferredStages: true, geographicFocus: true } },
          proposals: { where: { category: 'COFOUNDER' }, select: { id: true }, take: 1 },
        },
      });

      if (!user || !user.isActive) {
        return res.status(404).json({ error: 'User not found or inactive' });
      }

      const [teams, projects] = await Promise.all([
        findMatchingTeamsForMemberProfile(userId, limit),
        findMatchingProjectsForMemberProfile(userId, limit),
      ]);

      const roleRefs = [
        ...(user.memberProfile?.rolePreferences || []),
        ...(user.skills || []).map((us: { skill: { name: string | null } | null }) => us.skill?.name).filter(Boolean) as string[],
        ...(user.investorProfile ? ['Investor'] : []),
        ...(user.founderProfile ? ['Founder'] : []),
        ...((user.proposals && user.proposals.length > 0) ? ['CoFounder'] : []),
      ];
      const industryRefs = [
        ...(user.memberProfile?.industryPreferences || []),
        ...(user.founderProfile?.industryPreferences || []),
        ...(user.investorProfile?.preferredIndustries || []),
      ];
      const stageRefs = [
        ...(user.investorProfile?.preferredStages || []),
      ];
      const geoRefs = [
        ...(user.founderProfile?.locationPreferences || []),
        ...(user.investorProfile?.geographicFocus || []),
      ];

      return res.json({
        userId,
        refs: { roleRefs, industryRefs, stageRefs, geoRefs },
        teams,
        projects,
        count: { teams: teams.length, projects: projects.length },
      });
    } catch (error) {
      console.error('[service-server] user matching failed', error);
      return res.status(500).json({ error: 'Failed to compute user matches' });
    }
  }
}

