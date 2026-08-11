export type HelperArgs = Record<string, any>;

export interface HelperContext {
  userId?: string;
  toolId?: string;
  runId?: string;
  /** Scoped bearer token for this run (optional; used by sandboxes) */
  scopedToken?: string;
}

export interface HelperResult {
  status?: 'success' | 'error';
  error?: string;
  [key: string]: any;
}

export type HelperHandler = (
  args: HelperArgs,
  ctx: HelperContext,
  signal?: AbortSignal,
) => Promise<HelperResult>;

export interface HelperDefinition {
  name: string;
  aliases?: string[];
  description: string;
  argsSchema?: Record<string, string>;
  timeoutMs: number;
  billable: boolean;
  retries?: number;
  handler: HelperHandler;
}

export interface ListedHelper {
  id: string;
  aliases: string[];
  description: string;
  argsSchema: Record<string, string>;
  timeoutMs: number;
  billable: boolean;
}
