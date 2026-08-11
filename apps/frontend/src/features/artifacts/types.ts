/**
 * Shared execution artifact types for run UIs (swarm, workforce, chat, tools).
 * Keep in sync with apps/backend/src/services/agents/artifacts/executionArtifact.ts
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
  content?: string;
  url?: string;
  mimeType?: string;
  detail?: string;
}

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
  return typeof obj.result === 'object' && obj.result !== null ? obj.result : obj;
}

export function normalizeArtifact(
  input: Partial<ExecutionArtifact> & { filename?: string; content?: string; url?: string },
  toolName?: string
): ExecutionArtifact | null {
  const unwrapped = unwrapToolPayload(input.content ?? input);
  let url = input.url;
  let content = typeof input.content === 'string' ? input.content : undefined;
  let detail = input.detail;

  if (unwrapped && typeof unwrapped === 'object') {
    if (typeof unwrapped.url === 'string') url = unwrapped.url;
    content =
      (typeof unwrapped.content === 'string' && unwrapped.content) ||
      (typeof unwrapped.script === 'string' && unwrapped.script) ||
      (typeof unwrapped.documentation === 'string' && unwrapped.documentation) ||
      (typeof unwrapped.text === 'string' && unwrapped.text) ||
      content;
    detail =
      detail ||
      (typeof unwrapped.prompt === 'string' ? unwrapped.prompt : undefined) ||
      (typeof unwrapped.title === 'string' ? unwrapped.title : undefined);
  } else if (typeof unwrapped === 'string') {
    content = unwrapped;
  }

  const filename = input.filename || 'artifact.md';
  const type =
    input.type ||
    inferArtifactType({ filename, url, content: content || '', toolName, mimeType: input.mimeType });

  if ((type === 'image' || type === 'video') && !url) {
    if (content && BASE64_RE.test(content)) {
      return { filename, type: 'unsupported', detail: 'Media has no hosted URL; cannot display' };
    }
    if (!content) return null;
  }

  if (type === 'image' || type === 'video') {
    return { id: input.id, filename, type, url, detail, mimeType: input.mimeType };
  }

  if (!content?.trim()) return null;

  return {
    id: input.id,
    filename,
    type,
    content: truncateArtifactText(content),
    detail,
    mimeType: input.mimeType,
  };
}

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
    const normalized = normalizeArtifact({ filename: `${filenameBase}.md`, content: unwrapped }, toolName);
    return normalized ? [normalized] : [];
  }

  const normalized = normalizeArtifact(
    {
      filename: `${filenameBase}.md`,
      url: typeof unwrapped.url === 'string' ? unwrapped.url : undefined,
      content:
        (typeof unwrapped.content === 'string' && unwrapped.content) ||
        (typeof unwrapped.script === 'string' && unwrapped.script) ||
        undefined,
      detail:
        (typeof unwrapped.prompt === 'string' && unwrapped.prompt) ||
        (typeof unwrapped.title === 'string' && unwrapped.title) ||
        undefined,
    },
    toolName
  );
  return normalized ? [normalized] : [];
}
