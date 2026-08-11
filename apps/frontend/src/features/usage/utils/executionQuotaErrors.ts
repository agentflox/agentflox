/**
 * Parse backend execution-quota error responses (402/429 with category).
 */

export type ExecutionQuotaCategory = 'QUOTA' | 'SUBSCRIPTION' | 'RATE';

export type ExecutionQuotaClientError = {
  status: number;
  category: ExecutionQuotaCategory;
  message: string;
  upgradeUrl?: string;
  used?: number;
  max?: number;
  remaining?: number;
};

const CATEGORY_COPY: Record<ExecutionQuotaCategory, string> = {
  QUOTA: 'Execution limit reached — upgrade for more runs',
  SUBSCRIPTION: 'No active subscription — reactivate or upgrade your plan',
  RATE: 'Too many concurrent runs — try again shortly',
};

function quotaMeterFields(body: any): Pick<ExecutionQuotaClientError, 'used' | 'max' | 'remaining'> {
  const remaining =
    typeof body?.remainingExecutions === 'number'
      ? body.remainingExecutions
      : typeof body?.remaining === 'number'
        ? body.remaining
        : undefined;
  const max =
    typeof body?.maxExecutions === 'number'
      ? body.maxExecutions
      : typeof body?.max === 'number'
        ? body.max
        : undefined;
  const used =
    typeof body?.used === 'number'
      ? body.used
      : typeof max === 'number' && typeof remaining === 'number' && max >= 0 && remaining >= 0
        ? Math.max(0, max - remaining)
        : undefined;
  return { used, max, remaining };
}

export function isExecutionQuotaError(
  error: unknown,
): error is ExecutionQuotaClientError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'category' in error &&
    typeof (error as ExecutionQuotaClientError).category === 'string' &&
    ['QUOTA', 'SUBSCRIPTION', 'RATE'].includes(
      (error as ExecutionQuotaClientError).category,
    )
  );
}

export function messageForExecutionQuota(
  category: ExecutionQuotaCategory,
  fallback?: string,
): string {
  return CATEGORY_COPY[category] || fallback || 'Unable to start execution';
}

/** Parse a failed fetch Response into a typed quota error when applicable. */
export async function parseExecutionQuotaResponse(
  res: Response,
): Promise<ExecutionQuotaClientError | null> {
  if (res.status !== 402 && res.status !== 429) return null;
  try {
    const body = await res.clone().json();
    const category = body?.category as ExecutionQuotaCategory | undefined;
    if (!category || !['QUOTA', 'SUBSCRIPTION', 'RATE'].includes(category)) {
      // 402 without category still treat as quota
      if (res.status === 402) {
        return {
          status: 402,
          category: 'QUOTA',
          message: body?.error || body?.message || CATEGORY_COPY.QUOTA,
          upgradeUrl: body?.upgradeUrl,
          ...quotaMeterFields(body),
        };
      }
      return null;
    }
    return {
      status: res.status,
      category,
      message: body?.error || body?.message || messageForExecutionQuota(category),
      upgradeUrl: body?.upgradeUrl || '/dashboard/billing/upgrade',
      ...quotaMeterFields(body),
    };
  } catch {
    if (res.status === 402) {
      return {
        status: 402,
        category: 'QUOTA',
        message: CATEGORY_COPY.QUOTA,
        upgradeUrl: '/dashboard/billing/upgrade',
      };
    }
    return null;
  }
}
