import {

  ModelEntitlementError,

  ModelNotFoundError,

  ModelUnauthorizedError,

  ModelValidationError,

} from './types';

import { scrubError } from './credentials';



/**

 * Shared user-facing error taxonomy for model + execution surfaces.

 * Call sites should use `toUserFacingError` / `getUserFacingErrorMessage`.

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



export type UserFacingError = {

  kind: UserFacingErrorKind;

  code: string;

  message: string;

  httpStatus: number;

};



/** @deprecated Prefer UserFacingError — kept for existing imports. */

export type UserFacingModelError = UserFacingError;



type ErrBits = {

  msg: string;

  lower: string;

  status?: number;

  code?: string;

  name?: string;

  userMessage?: string;

  category?: string;

};



function extractBits(err: unknown): ErrBits {

  const scrubbed = scrubError(err);

  const msg = (scrubbed.message || String(err ?? '') || '').trim();

  const lower = msg.toLowerCase();

  const status =

    typeof (err as any)?.status === 'number'

      ? (err as any).status

      : typeof (err as any)?.statusCode === 'number'

        ? (err as any).statusCode

        : typeof (err as any)?.response?.status === 'number'

          ? (err as any).response.status

          : undefined;

  const codeRaw =

    (err as any)?.code ||

    (err as any)?.error?.code ||

    (typeof err === 'object' && err && 'name' in err ? undefined : undefined);

  const name =

    typeof err === 'object' && err && 'name' in err

      ? String((err as any).name || '')

      : undefined;

  const code =

    (typeof codeRaw === 'string' && codeRaw) ||

    (name && /Error$/.test(name) ? name : undefined);

  const userMessage =

    typeof (err as any)?.userMessage === 'string'

      ? (err as any).userMessage.trim()

      : undefined;

  const category =

    typeof (err as any)?.category === 'string' ? (err as any).category : undefined;



  return { msg, lower, status, code, name, userMessage, category };

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



/**

 * Map any model/provider/execution/network failure to a safe, typed client message.

 */

export function toUserFacingError(err: unknown): UserFacingError {

  const { msg, lower, status, code, name, userMessage, category } = extractBits(err);



  // Prefer explicit product userMessage (builders, gates, etc.)

  if (userMessage) {

    const agentCode = typeof code === 'string' ? code : 'AGENT_ERROR';

    return {

      kind: kindFromCode(agentCode) || inferKindFromMessage(userMessage) || 'execution',

      code: agentCode,

      message: userMessage,

      httpStatus: /INSUFFICIENT|TOKEN|QUOTA|LIMIT|USAGE/i.test(agentCode) ? 402 : status && status >= 400 ? status : 500,

    };

  }



  // Billing / execution quota classes (by name — avoid circular import of error classes)

  if (

    name === 'ExecutionQuotaExceededError' ||

    category === 'QUOTA' ||

    /execution quota|run out of executions|execution limit reached/i.test(lower)

  ) {

    return {

      kind: 'quota',

      code: 'EXEC_QUOTA',

      message: 'You have reached your execution limit. Upgrade your plan or wait for the quota to reset.',

      httpStatus: 402,

    };

  }

  if (

    name === 'NoActiveSubscriptionError' ||

    category === 'SUBSCRIPTION' ||

    /no active subscription/i.test(lower)

  ) {

    return {

      kind: 'quota',

      code: 'EXEC_SUBSCRIPTION',

      message: 'An active subscription is required to run this. Upgrade your plan and try again.',

      httpStatus: 402,

    };

  }

  if (

    name === 'ConcurrentRunsExceededError' ||

    (category === 'RATE' && /concurrent/i.test(lower)) ||

    /concurrent execution limit|too many concurrent/i.test(lower)

  ) {

    return {

      kind: 'rate_limit',

      code: 'EXEC_CONCURRENT',

      message: 'Too many runs are in progress. Wait for one to finish, then try again.',

      httpStatus: 429,

    };

  }



  // Explicit codes first

  const upperCode = (code || '').toUpperCase();

  if (upperCode === 'MODEL_NOT_FOUND' || err instanceof ModelNotFoundError) {

    return {

      kind: 'model',

      code: 'MODEL_NOT_FOUND',

      message: 'The selected model is not available. Pick another model from the dropdown and try again.',

      httpStatus: 404,

    };

  }

  if (upperCode === 'MODEL_UNAUTHORIZED' || err instanceof ModelUnauthorizedError) {

    return {

      kind: 'auth',

      code: 'MODEL_UNAUTHORIZED',

      message: 'You do not have access to this model. Choose a different model or update your plan.',

      httpStatus: 403,

    };

  }

  if (upperCode === 'MODEL_ENTITLEMENT' || err instanceof ModelEntitlementError) {

    return {

      kind: 'quota',

      code: 'MODEL_ENTITLEMENT',

      message: msg || 'This model requires a paid plan. Upgrade your plan or select another model.',

      httpStatus: 403,

    };

  }

  if (upperCode === 'MODEL_VALIDATION' || err instanceof ModelValidationError) {

    if (/api key|credential|oauth|access token/i.test(msg)) {

      return {

        kind: 'auth',

        code: 'MODEL_API_KEY',

        message: 'Model API key is missing or invalid. Update the key in Model settings and try again.',

        httpStatus: 400,

      };

    }

    return {

      kind: 'validation',

      code: 'MODEL_VALIDATION',

      message: msg || 'Model configuration is invalid. Check model settings and try again.',

      httpStatus: 400,

    };

  }



  // Ingest / queue (Inngest)

  if (

    /inngest|queue is unavailable|background task queuing failed|orchestrator dispatch failed|failed to (send|enqueue).*(event|job|queue)/i.test(

      lower

    ) ||

    upperCode.includes('INNGEST') ||

    upperCode.includes('INGEST')

  ) {

    return {

      kind: 'ingest',

      code: 'INNGEST_UNAVAILABLE',

      message: 'The execution queue is unavailable. Please try again in a moment.',

      httpStatus: 503,

    };

  }



  // Tool timeout

  if (

    /tool\s+[\"'].+[\"']\s+timed out|tool .*timed out|tool execution timed out|timed out concurrently/i.test(

      lower

    ) ||

    upperCode === 'TOOL_TIMEOUT'

  ) {

    return {

      kind: 'timeout',

      code: 'TOOL_TIMEOUT',

      message: 'A tool call timed out. Try again, or simplify the step and retry.',

      httpStatus: 504,

    };

  }



  // Workflow / step timeout

  if (

    /step .+timed out|timed out waiting for agent|workflow.*(timed out|timeout)|recursion depth exceeded/i.test(

      lower

    ) ||

    upperCode === 'WORKFLOW_TIMEOUT' ||

    upperCode === 'STEP_TIMEOUT'

  ) {

    const depth = /recursion depth|max depth|max_depth/i.test(lower);

    return {

      kind: 'timeout',

      code: depth ? 'WORKFLOW_DEPTH' : 'WORKFLOW_TIMEOUT',

      message: depth

        ? 'This workflow exceeded the maximum number of steps and was stopped.'

        : 'A workflow step timed out waiting for a response. Please try again.',

      httpStatus: 504,

    };

  }



  // Code / sandbox timeout & runtime

  if (

    /script execution timed out|code (step )?timed out|execution timed out after \d+/i.test(lower) ||

    upperCode === 'CODE_TIMEOUT' ||

    (upperCode === 'TIMEOUT' && /script|code|sandbox|js|python/i.test(lower))

  ) {

    return {

      kind: 'timeout',

      code: 'CODE_TIMEOUT',

      message: 'Code execution timed out. Reduce work in the step or raise the timeout and try again.',

      httpStatus: 504,

    };

  }

  if (

    upperCode === 'RUNTIME' ||

    /sandbox|code execution failed|referenceerror|typeerror|syntaxerror/i.test(lower)

  ) {

    return {

      kind: 'runtime',

      code: 'RUNTIME',

      message: msg || 'A step failed at runtime. Check the step logs and try again.',

      httpStatus: 500,

    };

  }



  // HTTP / API tool timeout wording

  if (/httprequest:.*timed out|request timed out after \d+s/i.test(lower)) {

    return {

      kind: 'timeout',

      code: 'HTTP_TIMEOUT',

      message: 'An outbound HTTP request timed out. Check the endpoint and try again.',

      httpStatus: 504,

    };

  }



  // Model auth / API key

  if (

    status === 401 ||

    status === 403 ||

    /invalid[_ ]?api[_ ]?key|incorrect api key|authentication|unauthorized|permission_denied|invalid.?key|api key.*incorrect|wrong.*api.?key|platform api key not configured|missing api key/i.test(

      lower

    )

  ) {

    // Prefer execution auth only when clearly not model-related

    if (/execution|tool|workflow|swarm/i.test(lower) && !/model|openai|anthropic|api key/i.test(lower)) {

      return {

        kind: 'auth',

        code: 'EXEC_UNAUTHORIZED',

        message: 'You are not authorized to run this. Check permissions and try again.',

        httpStatus: status === 403 ? 403 : 401,

      };

    }

    return {

      kind: 'auth',

      code: 'MODEL_API_KEY',

      message: /platform api key not configured|missing api key/i.test(lower)

        ? 'Model API key is not configured. Add a valid key in Model settings and try again.'

        : 'Model API key is incorrect or unauthorized. Update the key in Model settings and try again.',

      httpStatus: status === 403 ? 403 : 401,

    };

  }



  // Model unavailable

  if (

    status === 404 ||

    /model[_ ]?not[_ ]?found|does not exist|unknown model|model.*unavailable|no such model/i.test(lower)

  ) {

    return {

      kind: 'model',

      code: 'MODEL_UNAVAILABLE',

      message: 'This model is not available right now. Select another model and try again.',

      httpStatus: 404,

    };

  }



  // Rate limits — distinguish model vs execution when possible

  if (status === 429 || /rate[_ ]?limit|too many requests|quota exceeded|rpm|tpm/i.test(lower)) {

    if (/tool|execution|invoke|concurrent|swarm|workforce/i.test(lower) && !/model|token|tpm|openai/i.test(lower)) {

      return {

        kind: 'rate_limit',

        code: 'EXEC_RATE_LIMIT',

        message: 'Execution rate limit reached. Wait a moment and try again.',

        httpStatus: 429,

      };

    }

    return {

      kind: 'rate_limit',

      code: 'MODEL_RATE_LIMIT',

      message: 'Model rate limit reached. Wait a moment and try again, or switch to another model.',

      httpStatus: 429,

    };

  }



  // Token / model credit exhaustion

  if (

    /insufficient[_\s]?tokens|insufficient[_\s]?quota|out of (tokens|credits|usage)|token limit|credit.*exhausted|billing|payment[_ ]?required/i.test(

      lower

    ) ||

    status === 402

  ) {

    if (/execution/i.test(lower) && !/token|model|credit/i.test(lower)) {

      return {

        kind: 'quota',

        code: 'EXEC_QUOTA',

        message: 'You have reached your execution limit. Upgrade your plan or wait for the quota to reset.',

        httpStatus: 402,

      };

    }

    return {

      kind: 'quota',

      code: 'MODEL_USAGE_EXHAUSTED',

      message: 'You have run out of model usage/credits. Upgrade your plan or purchase more tokens.',

      httpStatus: 402,

    };

  }



  // Timeouts / network — classify by context

  if (

    /timeout|timed out|etimedout|econnreset|econnrefused|fetch failed|network|socket hang up|abort/i.test(lower) ||

    code === 'ETIMEDOUT' ||

    code === 'ECONNRESET' ||

    code === 'ECONNREFUSED'

  ) {

    if (/tool|workflow|step|agent response|execution|swarm|httpRequest/i.test(lower)) {

      return {

        kind: 'timeout',

        code: 'EXEC_TIMEOUT',

        message: 'The run timed out. Please try again.',

        httpStatus: 504,

      };

    }

    if (/model|openai|anthropic|completion|llm|chat\.completions/i.test(lower)) {

      return {

        kind: 'timeout',

        code: 'MODEL_TIMEOUT',

        message: 'The model request timed out or the network failed. Please try again.',

        httpStatus: 504,

      };

    }

    return {

      kind: 'timeout',

      code: 'TIMEOUT',

      message: 'The request timed out or the network failed. Please try again.',

      httpStatus: 504,

    };

  }



  // Overloaded provider

  if (status === 503 || status === 502 || /overloaded|capacity|service unavailable|bad gateway/i.test(lower)) {

    return {

      kind: 'model',

      code: 'MODEL_UNAVAILABLE',

      message: 'The model provider is temporarily unavailable. Please try again shortly.',

      httpStatus: status || 503,

    };

  }



  // Generic execution failure wording

  if (/execution failed|run failed|step failed|workflow failed|task failed/i.test(lower)) {

    return {

      kind: 'execution',

      code: typeof code === 'string' ? code : 'EXEC_FAILED',

      message: msg || 'The run failed. Check the logs and try again.',

      httpStatus: status && status >= 400 && status < 600 ? status : 500,

    };

  }



  return {

    kind: kindFromCode(code) || 'unknown',

    code: typeof code === 'string' ? code : 'ERROR',

    message: msg || 'Something went wrong. Please try again.',

    httpStatus: status && status >= 400 && status < 600 ? status : 500,

  };

}



function inferKindFromMessage(message: string): UserFacingErrorKind | null {

  const lower = message.toLowerCase();

  if (/timed out|timeout/.test(lower)) return 'timeout';

  if (/rate limit|too many/.test(lower)) return 'rate_limit';

  if (/quota|usage|credits|subscription|upgrade/.test(lower)) return 'quota';

  if (/queue|inngest/.test(lower)) return 'ingest';

  if (/api key|unauthorized|access/.test(lower)) return 'auth';

  if (/model/.test(lower)) return 'model';

  if (/tool|workflow|step|execution|run/.test(lower)) return 'execution';

  if (/runtime|sandbox/.test(lower)) return 'runtime';

  return null;

}



/** Convenience: user-visible message only. */

export function getUserFacingErrorMessage(err: unknown): string {

  return toUserFacingError(err).message;

}



/** @deprecated Prefer toUserFacingError — same classifier, kept for existing imports. */

export function toUserFacingModelError(err: unknown): UserFacingError {

  return toUserFacingError(err);

}



/** @deprecated Prefer getUserFacingErrorMessage. */

export function getUserFacingModelErrorMessage(err: unknown): string {

  return getUserFacingErrorMessage(err);

}


