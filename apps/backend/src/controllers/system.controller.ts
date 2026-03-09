import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { sendMatchNotification } from '@/services/matching/utils/notificationUtils';
import type { MatchNotification } from '@/services/matching/types';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

@Controller('notifications')
export class NotificationsController {
  @Post('match')
  async match(@Body() body: Partial<MatchNotification>, @Res() res: Response) {
    try {
      const { userId, matchId, matchType, matchTitle, score, reason } = body || {};
      const validTypes: Array<MatchNotification['matchType']> = ['project', 'proposal', 'team', 'profile'];

      if (
        !userId ||
        !matchId ||
        !matchType ||
        !validTypes.includes(matchType) ||
        !matchTitle ||
        typeof reason !== 'string'
      ) {
        return res.status(400).json({
          error: 'userId, matchId, matchType, matchTitle and reason are required',
          validMatchTypes: validTypes,
        });
      }

      await sendMatchNotification({
        userId,
        matchId,
        matchType,
        matchTitle,
        score: typeof score === 'number' ? score : Number(score ?? 0),
        reason,
      });

      return res.status(202).json({ status: 'queued' });
    } catch (error) {
      console.error('Failed to process match notification', error);
      return res.status(500).json({ error: 'Failed to process notification' });
    }
  }
}


