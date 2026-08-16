import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

export type IntegrationCredentialPayload = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  tokenType?: string | null;
  scope?: string | null;
  accountId: string;
  provider: string;
};

function getEncryptionKey(): Buffer {
  const raw =
    process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    'dev-only-integration-credentials-key';
  return createHash('sha256').update(raw).digest();
}

export function encryptIntegrationCredentials(payload: IntegrationCredentialPayload): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptIntegrationCredentials(ciphertext: string): IntegrationCredentialPayload {
  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const data = buf.subarray(IV_LEN + 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as IntegrationCredentialPayload;
}
