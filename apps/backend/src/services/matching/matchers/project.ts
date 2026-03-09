import { Pool } from 'pg';
import { prisma } from '@/lib/prisma';
import { MATCHING_CONFIG } from '@/services/matching/config/shared';
import { EmbeddingHelper } from '@/services/matching/helpers/embedding';
import { logger } from '@/services/matching/lib/logger';
import { matchLatency, matchingErrors } from '@/services/matching/lib/metrics';
import { withSpan } from '@/services/matching/lib/tracer';
import { getMatchingCache } from '@/services/matching/lib/cache';
import { MatchQueryBuilder } from '@/services/matching/helpers/queryBuilder';
import {
  calculateSimilarity,
  calculateIndustryMatch,
  calculateRoleMatch,
} from '@/services/matching/helpers/calculateSimilarity';
import { calculateWeightedScore, finalizeMatches } from '@/services/matching/helpers/calculateScore';
import type { MatchResult } from '@/services/matching/types';

export class ProjectMatcher {
  private embeddingHelper: EmbeddingHelper;
  private queryBuilder: MatchQueryBuilder;
  private embeddingCache: Map<string, number[] | null>;
  private cache = getMatchingCache();

  constructor(private pool: Pool) {
    this.embeddingHelper = new EmbeddingHelper(pool);
    this.queryBuilder = new MatchQueryBuilder(pool);
    this.embeddingCache = new Map();
  }

  private async getProjectEmbedding(projectId: string): Promise<number[] | null> {
    if (this.embeddingCache.has(projectId)) {
      return this.embeddingCache.get(projectId) ?? null;
    }
    const embedding = await this.embeddingHelper.ensureEmbedding(
      'project',
      projectId,
      'projects'
    );
    this.embeddingCache.set(projectId, embedding ?? null);
    return embedding ?? null;
  }

  /**
   * Find matching member profiles for project hiring
   */
  async findProfilesForHiring(
    projectId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    return withSpan('ProjectMatcher.findProfilesForHiring', { projectId, limit }, async (span) => {
      const timer = matchLatency.startTimer({ entity_type: 'project', status: 'pending' });

      try {
        // Check cache first
        const cached = await this.cache.getCachedMatches(projectId, 'profiles');
        if (cached) {
          timer({ status: 'cache_hit' });
          span.setAttribute('cache.hit', true);
          logger.debug({ projectId, matchCount: cached.length }, 'Using cached profile matches');
          return cached.slice(0, limit);
        }

        span.setAttribute('cache.hit', false);

        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: {
            isPublic: true,
            isHiring: true,
            hiringRoles: true,
            industry: true,
          },
        });

        if (
          !project?.isPublic ||
          !project?.isHiring ||
          !project.hiringRoles?.length
        ) {
          timer({ status: 'skipped' });
          logger.debug({ projectId, reason: 'not_hiring_or_not_public' }, 'Skipping profile matching');
          return [];
        }

        span.setAttribute('project.isPublic', project.isPublic);
        span.setAttribute('project.hiringRoles', project.hiringRoles.length);

        const embedding = await this.getProjectEmbedding(projectId);

        if (!embedding) {
          timer({ status: 'error' });
          matchingErrors.inc({ entity_type: 'project', error_type: 'missing_embedding', operation: 'findProfilesForHiring' });
          return [];
        }

        const result = await this.pool.query(
          `
          SELECT
            u.id as user_id,
            mp.role_preferences,
            mp.industry_preferences,
            u.name,
            u.bio,
            1 - (u.embedding <=> $1::vector) AS similarity
          FROM users u
          JOIN member_profiles mp ON mp.user_id = u.id
          WHERE u.embedding IS NOT NULL
            AND u.is_active = true
            AND (mp.industry_preferences && $2::text[])
            AND (mp.role_preferences && $3::text[])
          ORDER BY u.embedding <=> $1::vector
          LIMIT $4
          `,
          [embedding, project.industry || [], project.hiringRoles, limit]
        );

        const matches = this.buildProfileMatches(result.rows, project.industry || [], project.hiringRoles);

        // Cache the results
        await this.cache.cacheMatches(projectId, 'profiles', matches, 900); // 15 min TTL

        timer({ status: 'success' });
        span.setAttribute('matches.count', matches.length);

        logger.info({
          projectId,
          matchCount: matches.length,
          operation: 'findProfilesForHiring',
        }, 'Found profile matches for project');

        return matches;
      } catch (error: any) {
        timer({ status: 'error' });
        matchingErrors.inc({ entity_type: 'project', error_type: error.code || 'unknown', operation: 'findProfilesForHiring' });
        logger.error({ projectId, error: error.message }, 'Error finding profile matches');
        throw error;
      }
    });
  }

  /**
   * Find matching teams for project hiring
   */
  async findTeamsForHiring(
    projectId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        isPublic: true,
        hiringRoles: true,
        industry: true,
      },
    });

    if (!project?.isPublic || !project.hiringRoles?.length) {
      return [];
    }

    const embedding = await this.getProjectEmbedding(projectId);

    if (!embedding) return [];

    const result = await this.queryBuilder.executeVectorQuery(
      'teams',
      [
        'teams.id',
        'teams.name',
        'teams.description',
        'teams.industry',
        'teams.skills',
        'teams.hiring_roles',
        'teams.owner_id',
      ],
      embedding,
      {
        industries: project.industry || [],
        roles: project.hiringRoles,
        isActive: true,
      },
      limit
    );

    return this.buildTeamMatches(
      result.rows,
      project.industry || [],
      project.hiringRoles
    );
  }

  /**
   * Find matching proposals for project hiring
   */
  async findProposalsForHiring(
    projectId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        isPublic: true,
        hiringRoles: true,
        industry: true,
      },
    });

    if (!project?.isPublic || !project.hiringRoles?.length) {
      return [];
    }

    const embedding = await this.getProjectEmbedding(projectId);

    if (!embedding) return [];

    const result = await this.pool.query(
      `
      SELECT 
        p.id,
        p.title,
        p."shortSummary" AS "shortSummary",
        p.industry,
        p.category,
        p.intent,
        p.keywords,
        p.tags,
        1 - (p.embedding <=> $1::vector) AS similarity
      FROM proposals p
      WHERE p.embedding IS NOT NULL
        AND p.visibility = 'PUBLIC'
        AND p.intent = 'SEEKING'
        AND (p.industry && $2::text[])
        AND ((p.keywords && $3::text[]) OR (p.tags && $3::text[]))
      ORDER BY p.embedding <=> $1::vector
      LIMIT $4
      `,
      [embedding, project.industry || [], project.hiringRoles, limit]
    );

    return this.buildProposalMatches(
      result.rows,
      project.industry || [],
      project.hiringRoles
    );
  }

  private buildProfileMatches(
    rows: any[],
    industries: string[],
    roles: string[]
  ): MatchResult[] {
    const weights = MATCHING_CONFIG.weights.hiring;

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry_preferences || []
      );
      const roleMatch = calculateRoleMatch(roles, row.role_preferences || []);

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: roleMatch,
        },
        weights
      );

      return {
        id: row.user_id,
        similarity,
        finalScore: score,
        metadata: {
          name: row.name,
          bio: row.bio,
          rolePreferences: row.role_preferences,
          industryPreferences: row.industry_preferences,
        },
      };
    });
  }

  private buildTeamMatches(
    rows: any[],
    industries: string[],
    roles: string[]
  ): MatchResult[] {
    const weights = MATCHING_CONFIG.weights.hiring;

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );
      const roleSignal = Math.max(
        calculateRoleMatch(roles, row.hiring_roles || []),
        calculateRoleMatch(roles, row.skills || [])
      );

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: roleSignal,
        },
        weights
      );

      return {
        id: row.id,
        similarity,
        finalScore: score,
        metadata: {
          name: row.name,
          description: row.description,
          industry: row.industry,
          skills: row.skills,
          hiringRoles: row.hiring_roles,
          ownerId: row.owner_id,
        },
      };
    });
  }

  private buildProposalMatches(
    rows: any[],
    industries: string[],
    roles: string[]
  ): MatchResult[] {
    const weights = MATCHING_CONFIG.weights.proposal;

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );
      const roleSignal = Math.max(
        calculateRoleMatch(roles, row.keywords || []),
        calculateRoleMatch(roles, row.tags || [])
      );

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: roleSignal,
        },
        weights
      );

      return {
        id: row.id,
        similarity,
        finalScore: score,
        metadata: {
          title: row.title,
          shortSummary: row.shortSummary,
          industry: row.industry,
          category: row.category,
          intent: row.intent,
        },
      };
    });
  }
}