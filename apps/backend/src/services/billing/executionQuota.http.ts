import type { Response as ExpressResponse } from 'express';
import {
  ConcurrentRunsExceededError,
  ExecutionQuotaExceededError,
  NoActiveSubscriptionError,
} from './executionQuota.errors';

/** Map execution quota errors to HTTP JSON. Returns true if handled. */
export function sendExecutionQuotaError(
  res: ExpressResponse,
  error: unknown,
): boolean {
  if (error instanceof ExecutionQuotaExceededError) {
    res.status(error.statusCode).json({
      error: error.message,
      category: error.category,
      upgradeUrl: '/dashboard/billing/upgrade',
    });
    return true;
  }
  if (error instanceof NoActiveSubscriptionError) {
    res.status(error.statusCode).json({
      error: error.message,
      category: error.category,
      upgradeUrl: '/dashboard/billing/upgrade',
    });
    return true;
  }
  if (error instanceof ConcurrentRunsExceededError) {
    res.status(error.statusCode).json({
      error: error.message,
      category: error.category,
      upgradeUrl: '/dashboard/billing/upgrade',
    });
    return true;
  }
  return false;
}
