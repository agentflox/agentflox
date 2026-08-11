import { Body, Controller, Get, Headers, Post, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { JwtAuthGuard, AuthenticatedRequest } from '@/middleware/httpAuth';
import { Req } from '@nestjs/common';
import {
  bearerFromAuthHeader,
  callPlatformHelper,
  listHelperDefinitions,
  verifyScopedHelperToken,
} from '@/services/platformHelpers';

const callSchema = z.object({
  name: z.string().min(1),
  args: z.record(z.any()).optional().default({}),
});

@Controller('v1')
export class PlatformHelpersController {
  /** Public catalog of available helpers (auth required). */
  @Get('platform-helpers')
  @UseGuards(JwtAuthGuard)
  list(@Req() _req: AuthenticatedRequest) {
    return { helpers: listHelperDefinitions() };
  }

  /**
   * Internal helper dispatch for sandboxes (Modal / remote).
   * Auth: scoped per-run Bearer token (not user JWT).
   */
  @Post('internal/helpers/call')
  async call(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
    @Res() res: ExpressResponse,
  ) {
    try {
      const bearer = bearerFromAuthHeader(authorization);
      if (!bearer) {
        return res.status(401).json({ status: 'error', error: 'Missing bearer token' });
      }
      const claims = verifyScopedHelperToken(bearer);
      const parsed = callSchema.parse(body);
      const result = await callPlatformHelper(parsed.name, parsed.args || {}, {
        userId: claims.userId,
        runId: claims.runId,
        toolId: claims.toolId,
        scopedToken: bearer,
      });
      return res.status(200).json(result);
    } catch (err: any) {
      const status = /token|Unauthorized|Invalid|expired/i.test(err?.message || '') ? 401 : 400;
      return res.status(status).json({
        status: 'error',
        error: err?.message || 'Helper call failed',
      });
    }
  }
}
