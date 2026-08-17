/**
 * Shared user-facing error formatter for model + execution failures.
 * Keep in sync with apps/backend/src/services/models/errors.ts intent.
 */

export type UserFacingErrorKind =
  | 'model'
  | 'execution'
  | 'timeout'
  | 'rate_limit'
  | 'quota'
  | 'ingest'
  | 'runtime'
  | 'auth'
  | 'validation'
  | 'unknown';

export type FormattedUserFacingError = {
  kind: UserFacingErrorKind;
  code: string;
  message: string;
};

type ErrBits = {
  msg: string;
  lower: string;
  code: string;
  status?: number;
  kind?: string;
};

function extractBits(err: unknown): ErrBits {
  let msg = '';
  let code = '';
  let status: number | undefined;
  let kind: string | undefined;

  if (err == null) {
    return { msg: '', lower: '', code: '' };
  }
  if (typeof err === 'string') {
    msg = err;
  } else if (err instanceof Error) {
    msg = err.message || '';
    code = String((err as any).code || err.name || '');
    status = (err as any).status || (err as any).statusCode;
    kind = (err as any).kind;
  } else if (typeof err === 'object') {
    const o = err as Record<string, any>;
    msg = String(o.message || o.error || o.userMessage || '');
    code = String(o.code || '');
    kind = typeof o.kind === 'string' ? o.kind : undefined;
    status =
      typeof o.status === 'number'
        ? o.status
        : typeof o.statusCode === 'number'
          ? o.statusCode
          : undefined;
    if (!msg && typeof o.error === 'object' && o.error?.message) {
      msg = String(o.error.message);
    }
  }

  // Nested JSON error blobs
  if (msg.startsWith('{')) {
    try {
      const parsed = JSON.parse(msg);
      const nested = parsed?.message || parsed?.error?.message || parsed?.error;
      if (typeof nested === 'string' && nested.trim()) {
        return extractBits({
          message: nested,
          code: parsed?.code || code,
          kind: parsed?.kind || kind,
          status: parsed?.status || status,
        });
      }
    } catch {
      /* ignore */
    }
  }

  return { msg: msg.trim(), lower: msg.toLowerCase(), code, status, kind };
}

function kindFromCode(code?: string): UserFacingErrorKind | null {
  if (!code) return null;
  const c = code.toUpperCase();
  if (c.startsWith('MODEL_')) {
    if (c.includes('TIMEOUT')) return 'timeout';
    if (c.includes('RATE')) return 'rate_limit';
    if (c.includes('USAGE') || c.includes('QUOTA') || c.includes('ENTITLEMENT')) return 'quota';
    if (c.includes('UNAUTHORIZED') || c.includes('API_KEY')) return 'auth';
    if (c.includes('VALIDATION')) return 'validation';
    return 'model';
  }
  if (c.includes('TIMEOUT') || c === 'ETIMEDOUT') return 'timeout';
  if (c.includes('RATE') || c.includes('CONCURRENT')) return 'rate_limit';
  if (c.includes('QUOTA') || c.includes('USAGE') || c.includes('SUBSCRIPTION')) return 'quota';
  if (c.includes('INNGEST') || c.includes('INGEST') || c.includes('QUEUE')) return 'ingest';
  if (c.includes('RUNTIME') || c.includes('SANDBOX') || c.includes('CODE_')) return 'runtime';
  if (c.startsWith('TOOL_') || c.startsWith('WORKFLOW_') || c.startsWith('EXEC_') || c.startsWith('AGENT_')) {
    return 'execution';
  }
  return null;
}

/** Already-friendly backend messages — pass through without remapping. */
function isAlreadyFriendly(msg: string): boolean {
  return /model api key|not available|rate limit|timed out|run out of model usage|requires a paid plan|do not have access|select another model|execution limit|execution queue|workflow step|tool call timed out|code execution timed out|outbound http request|too many runs|active subscription/i.test(
    msg
  );
}

export function toUserFacingError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): FormattedUserFacingError {
  const { msg, lower, code, status, kind: rawKind } = extractBits(err);
  const upperCode = (code || '').toUpperCase();

  if (msg && isAlreadyFriendly(msg)) {
    return {
      kind: (rawKind as UserFacingErrorKind) || kindFromCode(code) || 'unknown',
      code: code || 'ERROR',
      message: msg,
    };
  }

  // Explicit codes
  if (upperCode === 'MODEL_NOT_FOUND' || /model not found|unknown model|no such model/i.test(lower)) {
    return {
      kind: 'model',
      code: 'MODEL_NOT_FOUND',
      message: 'The selected model is not available. Pick another model from the dropdown and try again.',
    };
  }
  if (
    upperCode === 'MODEL_UNAUTHORIZED' ||
    upperCode === 'MODEL_ENTITLEMENT' ||
    /requires a paid plan|not authorized to use/i.test(lower)
  ) {
    return {
      kind: upperCode === 'MODEL_ENTITLEMENT' ? 'quota' : 'auth',
      code: upperCode || 'MODEL_UNAUTHORIZED',
      message: msg || 'You do not have access to this model. Choose a different model or update your plan.',
    };
  }
  if (
    upperCode === 'MODEL_API_KEY' ||
    status === 401 ||
    /invalid[_ ]?api[_ ]?key|incorrect api key|authentication|unauthorized|api key.*incorrect|missing api key|platform api key/i.test(
      lower
    )
  ) {
    return {
      kind: 'auth',
      code: 'MODEL_API_KEY',
      message: 'Model API key is missing or incorrect. Update the key in Model settings and try again.',
    };
  }

  // Ingest
  if (
    upperCode.includes('INNGEST') ||
    upperCode.includes('INGEST') ||
    /inngest|queue is unavailable|background task queuing|orchestrator dispatch failed/i.test(lower)
  ) {
    return {
      kind: 'ingest',
      code: 'INNGEST_UNAVAILABLE',
      message: 'The execution queue is unavailable. Please try again in a moment.',
    };
  }

  // Tool / workflow / code timeouts (before generic model timeout)
  if (
    upperCode === 'TOOL_TIMEOUT' ||
    /tool\s+[\"'].+[\"']\s+timed out|tool .*timed out|tool execution timed out/i.test(lower)
  ) {
    return {
      kind: 'timeout',
      code: 'TOOL_TIMEOUT',
      message: 'A tool call timed out. Try again, or simplify the step and retry.',
    };
  }
  if (
    upperCode === 'WORKFLOW_TIMEOUT' ||
    upperCode === 'STEP_TIMEOUT' ||
    upperCode === 'WORKFLOW_DEPTH' ||
    /step .+timed out|timed out waiting for agent|workflow.*(timed out|timeout)|recursion depth exceeded/i.test(
      lower
    )
  ) {
    const depth = /recursion depth|max depth/i.test(lower) || upperCode === 'WORKFLOW_DEPTH';
    return {
      kind: 'timeout',
      code: depth ? 'WORKFLOW_DEPTH' : 'WORKFLOW_TIMEOUT',
      message: depth
        ? 'This workflow exceeded the maximum number of steps and was stopped.'
        : 'A workflow step timed out waiting for a response. Please try again.',
    };
  }
  if (
    upperCode === 'CODE_TIMEOUT' ||
    /script execution timed out|code (step )?timed out|execution timed out after \d+/i.test(lower)
  ) {
    return {
      kind: 'timeout',
      code: 'CODE_TIMEOUT',
      message: 'Code execution timed out. Reduce work in the step or raise the timeout and try again.',
    };
  }
  if (/httprequest:.*timed out|request timed out after \d+s/i.test(lower) || upperCode === 'HTTP_TIMEOUT') {
    return {
      kind: 'timeout',
      code: 'HTTP_TIMEOUT',
      message: 'An outbound HTTP request timed out. Check the endpoint and try again.',
    };
  }

  // Execution quota / concurrent
  if (
    upperCode === 'EXEC_QUOTA' ||
    upperCode === 'EXEC_SUBSCRIPTION' ||
    /execution quota|execution limit|no active subscription/i.test(lower)
  ) {
    return {
      kind: 'quota',
      code: upperCode.includes('SUBSCRIPTION') ? 'EXEC_SUBSCRIPTION' : 'EXEC_QUOTA',
      message: /subscription/i.test(lower)
        ? 'An active subscription is required to run this. Upgrade your plan and try again.'
        : 'You have reached your execution limit. Upgrade your plan or wait for the quota to reset.',
    };
  }
  if (upperCode === 'EXEC_CONCURRENT' || /concurrent execution|too many concurrent|too many runs/i.test(lower)) {
    return {
      kind: 'rate_limit',
      code: 'EXEC_CONCURRENT',
      message: 'Too many runs are in progress. Wait for one to finish, then try again.',
    };
  }

  // Rate limits
  if (upperCode === 'EXEC_RATE_LIMIT' || upperCode === 'MODEL_RATE_LIMIT' || status === 429 || /rate[_ ]?limit|too many requests/i.test(lower)) {
    if (
      upperCode.startsWith('EXEC_') ||
      (/tool|execution|invoke|concurrent|swarm|workforce/i.test(lower) && !/model|token|tpm|openai/i.test(lower))
    ) {
      return {
        kind: 'rate_limit',
        code: 'EXEC_RATE_LIMIT',
        message: 'Execution rate limit reached. Wait a moment and try again.',
      };
    }
    return {
      kind: 'rate_limit',
      code: 'MODEL_RATE_LIMIT',
      message: 'Model rate limit reached. Wait a moment and try again, or switch to another model.',
    };
  }

  // Model usage
  if (
    upperCode === 'MODEL_USAGE_EXHAUSTED' ||
    status === 402 ||
    /insufficient[_\s]?tokens|insufficient[_\s]?quota|out of (tokens|credits|usage)|token limit|credit.*exhausted/i.test(
      lower
    )
  ) {
    return {
      kind: 'quota',
      code: 'MODEL_USAGE_EXHAUSTED',
      message: 'You have run out of model usage/credits. Upgrade your plan or purchase more tokens.',
    };
  }

  // Runtime
  if (upperCode === 'RUNTIME' || /sandbox|code execution failed|referenceerror|typeerror|syntaxerror/i.test(lower)) {
    return {
      kind: 'runtime',
      code: 'RUNTIME',
      message: msg || 'A step failed at runtime. Check the step logs and try again.',
    };
  }

  // Timeouts / network
  if (
    upperCode.includes('TIMEOUT') ||
    /timeout|timed out|etimedout|econnreset|network|fetch failed|socket hang up/i.test(lower)
  ) {
    if (/tool|workflow|step|agent response|execution|swarm|httpRequest/i.test(lower)) {
      return {
        kind: 'timeout',
        code: 'EXEC_TIMEOUT',
        message: 'The run timed out. Please try again.',
      };
    }
    if (/model|openai|anthropic|completion|llm/i.test(lower) || upperCode === 'MODEL_TIMEOUT') {
      return {
        kind: 'timeout',
        code: 'MODEL_TIMEOUT',
        message: 'The model request timed out or the network failed. Please try again.',
      };
    }
    return {
      kind: 'timeout',
      code: 'TIMEOUT',
      message: 'The request timed out or the network failed. Please try again.',
    };
  }

  if (
    upperCode === 'MODEL_UNAVAILABLE' ||
    status === 503 ||
    status === 502 ||
    /overloaded|service unavailable|bad gateway/i.test(lower)
  ) {
    return {
      kind: 'model',
      code: 'MODEL_UNAVAILABLE',
      message: 'The model provider is temporarily unavailable. Please try again shortly.',
    };
  }

  if (/execution failed|run failed|step failed|workflow failed|task failed/i.test(lower)) {
    return {
      kind: 'execution',
      code: code || 'EXEC_FAILED',
      message: msg || 'The run failed. Check the logs and try again.',
    };
  }

  return {
    kind: (rawKind as UserFacingErrorKind) || kindFromCode(code) || 'unknown',
    code: code || 'ERROR',
    message: msg || fallback,
  };
}

/** Message-only helper used across stream/chat UI. */
export function formatUserFacingErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  return toUserFacingError(err, fallback).message;
}

/** @deprecated Prefer formatUserFacingErrorMessage — same classifier. */
export function formatModelErrorMessage(
  err: unknown,
  fallback = 'Something went wrong while using the model. Please try again.'
): string {
  return formatUserFacingErrorMessage(err, fallback);
}
