import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { AiModelAuthType, AiModelProvider } from '@agentflox/types';
import type { ResolvedCredentials } from './types';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getEncryptionKey(): Buffer {
  const raw =
    process.env.MODEL_CREDENTIALS_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    'dev-only-model-credentials-key';
  return createHash('sha256').update(raw).digest();
}

export function encryptCredentials(payload: Record<string, unknown>): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptCredentials(ciphertext: string): ResolvedCredentials {
  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const data = buf.subarray(IV_LEN + 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as ResolvedCredentials;
}

export function getPlatformApiKey(provider: AiModelProvider): string | undefined {
  switch (provider) {
    case 'OPENAI':
      return process.env.OPENAI_API_KEY;
    case 'ANTHROPIC':
      return process.env.ANTHROPIC_API_KEY;
    case 'GOOGLE':
      return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    default:
      return undefined;
  }
}

export function maskSecret(secret?: string | null): string | null {
  if (!secret) return null;
  if (secret.length <= 8) return '••••';
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}

export function resolveApiKeyFromCredentials(
  authType: AiModelAuthType | null | undefined,
  credentials?: ResolvedCredentials | null,
): string | undefined {
  if (!credentials) return undefined;
  if (authType === 'OAUTH_TOKEN') {
    return credentials.accessToken || credentials.apiKey;
  }
  return credentials.apiKey || credentials.accessToken;
}

/** Strip secrets from error messages / stacks before logging or returning to clients. */
export function scrubError(err: unknown): Error {
  const original = err instanceof Error ? err : new Error(String(err));
  const patterns = [
    /sk-[a-zA-Z0-9_-]+/g,
    /Bearer\s+[A-Za-z0-9._\-]+/gi,
    /api[_-]?key["']?\s*[:=]\s*["'][^"']+["']/gi,
    /x-api-key["']?\s*[:=]\s*["'][^"']+["']/gi,
    /AIza[0-9A-Za-z\-_]{20,}/g,
  ];
  let message = original.message || String(err);
  for (const p of patterns) message = message.replace(p, '[REDACTED]');
  const scrubbed = new Error(message);
  scrubbed.name = original.name;
  if (original.stack) {
    let stack = original.stack;
    for (const p of patterns) stack = stack.replace(p, '[REDACTED]');
    scrubbed.stack = stack;
  }
  return scrubbed;
}
