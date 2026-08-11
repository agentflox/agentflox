import { Controller, Param, Post, Req, Res, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { prisma } from '@/lib/prisma';
import { OpenAIErrorHandler } from '@/utils/ai/errorHandler';
import { checkRateLimit } from '@/utils/ai/checkRateLimit';
import { AuthenticatedRequest, JwtAuthGuard } from '@/middleware/httpAuth';
import { assertProjectAccessForUser } from '@/utils/socket/granularAuth';
import { completeWithDefaultModel } from '@/services/models';

@Controller('v1/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  @Post('project/:projectId/compute')
  async compute(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    try {
      const userId = req.userId!;
      await assertProjectAccessForUser(userId, projectId);

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { _count: { select: { members: true } } },
      });
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const rateLimited = await checkRateLimit(req, { RPM: 30, RPD: 500 });

      if (rateLimited instanceof Response) {
        const text = await rateLimited.text();
        return res.status(rateLimited.status).type('application/json').send(text);
      }

      const teamSize = project._count.members;
      const teamExperience = teamSize >= 3 ? 0.7 : 0.4;
      const tractionLevel = project.tags.length > 3 ? 0.6 : 0.3;
      const productCompleteness = project.status === 'PUBLISHED' ? 0.7 : 0.4;
      const marketSize = project.tags.length ? 0.6 : 0.3;
      const competitivePosition = project.description.length > 100 ? 0.6 : 0.3;

      const fundingReadiness =
        0.25 * teamExperience +
        0.25 * tractionLevel +
        0.2 * productCompleteness +
        0.15 * marketSize +
        0.15 * competitivePosition;

      const prompt = [
        {
          role: 'system',
          content: 'You are an expert startup advisor analyzing project maturity and giving concise staged recommendations.',
        },
        {
          role: 'user',
          content:
            `Project:\nName: ${project.name}\nDescription: ${project.description}\nTags: ${project.tags?.join(', ')}\nTeam Size: ${teamSize}\nStatus: ${project.status}\n` +
            `Provide:\n- Stage classification (one of: Pre-MVP, Early MVP, Ready for launch, Ready to raise seed)\n- 5 bullet actionable recommendations\n- One-paragraph competitive advice based on general best practices (no specific data)`,
        },
      ] as any;

      const { completion } = await completeWithDefaultModel({
        userId,
        request: {
          messages: prompt,
          temperature: 0.3,
          stream: false,
        },
        usageContext: { action: 'ANALYZE', metadata: { source: 'analytics.controller', projectId } },
        skipEntitlement: true,
      });
      const advice = completion.choices?.[0]?.message?.content ?? '';

      return res.json({
        fundingReadiness,
        advice,
      });
    } catch (error: any) {
      if (error?.message?.includes('access') || error?.message?.includes('not found')) {
        return res.status(403).json({ error: error.message });
      }
      const handled = OpenAIErrorHandler.handleOpenAIError(error);
      if (handled instanceof Response) {
        const text = await handled.text();
        return res.status(handled.status).type('application/json').send(text);
      }
      throw new HttpException('Failed to compute analytics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
