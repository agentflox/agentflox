/**
 * Shared execution artifact types + normalize/infer helpers for agent/tool/swarm outputs.
 * Image/video are url-first; never persist large base64 into content.
 */

export type ArtifactType =
  | 'markdown'
  | 'code'
  | 'json'
  | 'image'
  | 'video'
  | 'text'
  | 'unsupported';

export interface ExecutionArtifact {
  id?: string;
  filename: string;
  type: ArtifactType;
  /** Meaningful for markdown | code | json | text. Empty/unused for image/video. */
  content?: string;
  /** Required for image/video; preferred when tools return hosted media. */
  url?: string;
  mimeType?: string;
  detail?: string;
}

/** Soft cap for text content stored on events / return payloads (~150KB). */
export const ARTIFACT_TEXT_CAP = 150_000;

const IMAGE_EXT = /\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi)(\?|$)/i;
const BASE64_RE = /^data:(image|video)\/[a-z0-9+.-]+;base64,/i;

export function truncateArtifactText(text: string, cap = ARTIFACT_TEXT_CAP): string {
  if (!text || text.length <= cap) return text;
  return `${text.slice(0, cap)}\n\n…[truncated ${text.length - cap} chars]`;
}

export function inferArtifactType(input: {
  filename?: string;
  url?: string;
  content?: string;
  toolName?: string;
  mimeType?: string;
}): ArtifactType {
  const { filename = '', url = '', content = '', toolName = '', mimeType = '' } = input;
  const name = `${toolName} ${filename}`.toLowerCase();

  if (mimeType.startsWith('image/') || IMAGE_EXT.test(url) || IMAGE_EXT.test(filename) || /generateimage|image/.test(name)) {
    return url ? 'image' : BASE64_RE.test(content) ? 'unsupported' : 'image';
  }
  if (mimeType.startsWith('video/') || VIDEO_EXT.test(url) || VIDEO_EXT.test(filename) || /generatemovie|video/.test(name)) {
    return url ? 'video' : BASE64_RE.test(content) ? 'unsupported' : 'video';
  }
  if (filename.endsWith('.json') || (content.trim().startsWith('{') && content.trim().endsWith('}'))) {
    try {
      JSON.parse(content);
      return 'json';
    } catch { /* fall through */ }
  }
  if (
    filename.match(/\.(js|ts|tsx|py|rb|go|rs|java|c|cpp|sh|sql)$/i) ||
    /script|code|generatecode/.test(name) ||
    content.includes('```')
  ) {
    return 'code';
  }
  if (filename.endsWith('.md') || content.includes('# ') || content.includes('\n## ')) {
    return 'markdown';
  }
  return 'text';
}

/** Unwrap nested tool result wrappers: { status, result: { content|script|url|… } } */
export function unwrapToolPayload(raw: unknown): Record<string, any> | string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return unwrapToolPayload(JSON.parse(raw));
    } catch {
      return raw;
    }
  }
  if (typeof raw !== 'object') return String(raw);

  const obj = raw as Record<string, any>;
  const inner =
    typeof obj.result === 'object' && obj.result !== null
      ? obj.result
      : obj;

  return inner;
}

/**
 * Build zero or more ExecutionArtifacts from a tool call result.
 * Omits unsupported base64-only media (no hosted URL).
 */
export function buildArtifactsFromToolResult(
  toolName: string,
  rawResult: unknown,
  opts?: { filenameBase?: string }
): ExecutionArtifact[] {
  const filenameBase = (opts?.filenameBase || toolName || 'output')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'output';

  const unwrapped = unwrapToolPayload(rawResult);
  if (unwrapped == null) return [];

  if (typeof unwrapped === 'string') {
    const trimmed = unwrapped.trim();
    if (!trimmed || trimmed === 'null') return [];
    if (BASE64_RE.test(trimmed)) {
      return [{
        filename: `${filenameBase}.bin`,
        type: 'unsupported',
        detail: 'Media has no hosted URL; cannot display',
      }];
    }
    const type = inferArtifactType({ filename: `${filenameBase}.md`, content: trimmed, toolName });
    return [{
      filename: type === 'code' ? `${filenameBase}.txt` : `${filenameBase}.md`,
      type,
      content: truncateArtifactText(trimmed),
    }];
  }

  const url = typeof unwrapped.url === 'string' ? unwrapped.url : undefined;
  const contentField =
    (typeof unwrapped.content === 'string' && unwrapped.content) ||
    (typeof unwrapped.script === 'string' && unwrapped.script) ||
    (typeof unwrapped.documentation === 'string' && unwrapped.documentation) ||
    (typeof unwrapped.text === 'string' && unwrapped.text) ||
    undefined;
  const detail =
    (typeof unwrapped.prompt === 'string' && unwrapped.prompt) ||
    (typeof unwrapped.title === 'string' && unwrapped.title) ||
    undefined;

  if (url) {
    const type = inferArtifactType({ url, toolName, filename: filenameBase });
    if (type === 'image' || type === 'video') {
      return [{
        filename: `${filenameBase}${type === 'image' ? '.png' : '.mp4'}`,
        type,
        url,
        detail,
        content: undefined,
      }];
    }
  }

  // Base64 data URL without a separate hosted url
  if (contentField && BASE64_RE.test(contentField)) {
    return [{
      filename: `${filenameBase}.bin`,
      type: 'unsupported',
      detail: 'Media has no hosted URL; cannot display',
    }];
  }

  if (contentField && contentField.trim() && contentField.trim() !== 'null') {
    const type = inferArtifactType({
      content: contentField,
      toolName,
      filename: typeof unwrapped.script === 'string' ? `${filenameBase}.txt` : `${filenameBase}.md`,
    });
    return [{
      filename: type === 'code' ? `${filenameBase}.txt` : type === 'json' ? `${filenameBase}.json` : `${filenameBase}.md`,
      type,
      content: truncateArtifactText(contentField),
      detail,
    }];
  }

  // Fallback: meaningful object → json artifact (capped)
  if (Object.keys(unwrapped).length > 0) {
    const json = truncateArtifactText(JSON.stringify(unwrapped, null, 2));
    return [{
      filename: `${filenameBase}.json`,
      type: 'json',
      content: json,
      detail,
    }];
  }

  return [];
}

/** Prefer richest text-like artifact content for upstream handoff; else URL caption. */
export function pickUpstreamResult(
  artifacts: ExecutionArtifact[],
  fallback: string,
  cap = ARTIFACT_TEXT_CAP
): string {
  const textLike = [...artifacts]
    .reverse()
    .find((a) => a.type !== 'image' && a.type !== 'video' && a.type !== 'unsupported' && a.content);
  if (textLike?.content) return truncateArtifactText(textLike.content, cap);

  const media = [...artifacts].reverse().find((a) => (a.type === 'image' || a.type === 'video') && a.url);
  if (media?.url) {
    return truncateArtifactText(
      `${media.type === 'image' ? 'Image' : 'Video'}: ${media.url}${media.detail ? `\n${media.detail}` : ''}`,
      cap
    );
  }

  return truncateArtifactText(fallback || '', cap);
}

/**
 * Parse swarm conversation ids:
 *   swarm-task-conv-<taskId>
 *   swarm-task-conv-<taskId>-review-<suffix>
 * AgentTask.id is String @id (not UUID-enforced). Task ids must not contain `-review-`.
 */
export function parseSwarmTaskConversationId(
  conversationId: string
): { taskId: string; isReview: boolean } | null {
  if (!conversationId?.startsWith('swarm-task-conv-')) return null;
  const rest = conversationId.slice('swarm-task-conv-'.length);
  if (!rest) return null;
  const reviewIdx = rest.indexOf('-review-');
  if (reviewIdx >= 0) {
    const taskId = rest.slice(0, reviewIdx);
    if (!taskId) return null;
    return { taskId, isReview: true };
  }
  return { taskId: rest, isReview: false };
}

/**
 * Collect typed artifacts from workforce/tool step result maps
 * (mirrors frontend collectArtifacts heuristics, url-first for media).
 */
export function collectArtifactsFromStepResults(
  steps: Record<string, any> | null | undefined,
  opts?: { finalOutput?: any }
): ExecutionArtifact[] {
  const out: ExecutionArtifact[] = [];
  if (!steps || typeof steps !== 'object') {
    if (opts?.finalOutput != null) {
      out.push(...buildArtifactsFromToolResult('final_output', opts.finalOutput));
    }
    return out;
  }

  for (const [stepId, result] of Object.entries(steps)) {
    if (!result || typeof result !== 'object') {
      if (typeof result === 'string' && result.trim()) {
        out.push(...buildArtifactsFromToolResult(stepId, result, { filenameBase: stepId }));
      }
      continue;
    }

    // Agent-style array of tool outputs
    if (Array.isArray(result.output) && result.output[0]?.hasOwnProperty?.('result')) {
      result.output.forEach((step: any, i: number) => {
        if (!step?.result || step.success === false) return;
        out.push(
          ...buildArtifactsFromToolResult(step.toolName || `${stepId}-${i}`, step.result, {
            filenameBase: step.toolName || stepId,
          })
        );
      });
      if (typeof result.result === 'string' && result.result.trim()) {
        out.push(...buildArtifactsFromToolResult(`${stepId}-summary`, result.result, { filenameBase: `${stepId}-summary` }));
      }
      continue;
    }

    const candidate = result.output ?? result.result ?? result.response ?? result;
    if (candidate?.taskId && typeof candidate.title === 'string') continue; // task card, not artifact

    out.push(...buildArtifactsFromToolResult(stepId, candidate, { filenameBase: stepId }));
  }

  if (opts?.finalOutput != null) {
    const finals = buildArtifactsFromToolResult('final_output', opts.finalOutput);
    for (const a of finals) {
      if (!out.some((x) => x.filename === a.filename && x.content === a.content && x.url === a.url)) {
        out.push(a);
      }
    }
  }

  return out.filter((a) => a.type !== 'unsupported');
}
