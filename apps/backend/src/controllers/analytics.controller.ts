import { Controller, Param, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logAiUsage } from '@/services/matching/utils/usageUtils';
import { openai } from '@/lib/openai';
import { OpenAIErrorHandler } from '@/utils/ai/errorHandler';
import { countTokens } from '@/utils/ai/countTokens';
import { fetchModel } from '@/utils/ai/fetchModel';
import { checkRateLimit } from '@/utils/ai/checkRateLimit';

@Controller('v1/analytics')
export class AnalyticsController {
  @Post('project/:projectId/compute')
  async compute(@Param('projectId') projectId: string, @Req() req: any, @Res() res: Response) {
  const body = z
    .object({
      userId: z.string().optional(),
      normalizedModel: z.string().optional(),
    })
    .parse(req.body || {});

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const rateLimited = await checkRateLimit(req, { RPM: 30, RPD: 500 });

  if (rateLimited instanceof Response) {
    const text = await rateLimited.text();
    return res.status(rateLimited.status).type('application/json').send(text);
  }

  const teamExperience = project.teamSize >= 3 ? 0.7 : 0.4;
  const tractionLevel = (project.viewCount + project.likeCount) > 100 ? 0.6 : 0.3;
  const productCompleteness = project.status === 'PUBLISHED' ? 0.7 : 0.4;
  const marketSize = project.industry?.length ? 0.6 : 0.3;
  const competitivePosition = project.competitiveEdge ? 0.6 : 0.3;

  const fundingReadiness =
    0.25 * teamExperience +
    0.25 * tractionLevel +
    0.2 * productCompleteness +
    0.15 * marketSize +
    0.15 * competitivePosition;

  const openai = initializeOpenAI();
  const selectedModel = await fetchModel();
  const chatModel = selectedModel?.name ?? 'gpt-4.1-mini';
  const temperature = selectedModel?.temperature ?? 0.3;
  const prompt = [
    {
      role: 'system',
      content: 'You are an expert startup advisor analyzing project maturity and giving concise staged recommendations.',
    },
    {
      role: 'user',
      content:
        `Project:\nName: ${project.name}\nDescription: ${project.description}\nIndustry: ${project.industry?.join(', ')}\nTags: ${project.tags?.join(', ')}\nTeam Size: ${project.teamSize}\nStatus: ${project.status}\n` +
        `Provide:\n- Stage classification (one of: Pre-MVP, Early MVP, Ready for launch, Ready to raise seed)\n- 5 bullet actionable recommendations\n- One-paragraph competitive advice based on general best practices (no specific data)`,
    },
  ] as any;

  try {
    const start = Date.now();
    const completion = await openai.chat.completions.create({
      model: chatModel,
      messages: prompt,
      temperature,
    });
    const durationMs = Date.now() - start;
    const advice = completion.choices?.[0]?.message?.content ?? '';

    const tokens = await countTokens({ input: prompt, completion: advice, model: chatModel });
    const estimatedTokens = (tokens.inputTokens ?? 0) + (tokens.outputTokens ?? 0);
    const fallbackTokens =
      estimatedTokens > 0 ? estimatedTokens : Math.ceil(JSON.stringify(prompt).length / 4);
    const usageTokens = completion.usage?.total_tokens;
    const totalTokens = typeof usageTokens === 'number' ? usageTokens : fallbackTokens;

    await logAiUsage({
      action: 'ANALYZE',
      model: chatModel,
      tokensUsed: totalTokens,
      metadata: { durationMs, projectId, inputTokens: tokens.inputTokens, outputTokens: tokens.outputTokens },
      userId: body.userId,
    });

    return res.json({
      fundingReadiness,
      advice,
    });
  } catch (error) {
    const handled = OpenAIErrorHandler.handleOpenAIError(error);
    const text = await handled.text();
    return res.status(handled.status).type('application/json').send(text);
  }
  }
}

