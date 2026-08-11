export function getMaxDownloadBytes(): number {
  const n = Number(process.env.HELPER_MAX_DOWNLOAD_BYTES || 15 * 1024 * 1024);
  return Number.isFinite(n) && n > 0 ? n : 15 * 1024 * 1024;
}

export function getMaxExtractedChars(): number {
  const n = Number(process.env.HELPER_MAX_EXTRACTED_CHARS || 1_500_000);
  return Number.isFinite(n) && n > 0 ? n : 1_500_000;
}

/**
 * Read response body with a hard byte cap. Aborts if Content-Length or streamed
 * size exceeds the limit.
 */
export async function readResponseWithLimit(
  response: Response,
  maxBytes = getMaxDownloadBytes(),
): Promise<Buffer> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    throw new Error(`Download exceeds max size of ${maxBytes} bytes`);
  }

  if (!response.body) {
    const ab = await response.arrayBuffer();
    if (ab.byteLength > maxBytes) throw new Error(`Download exceeds max size of ${maxBytes} bytes`);
    return Buffer.from(ab);
  }

  const reader = (response.body as any).getReader?.();
  if (!reader) {
    const ab = await response.arrayBuffer();
    if (ab.byteLength > maxBytes) throw new Error(`Download exceeds max size of ${maxBytes} bytes`);
    return Buffer.from(ab);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try { reader.cancel(); } catch { /* ignore */ }
        throw new Error(`Download exceeds max size of ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export function truncateText(text: string, maxChars = getMaxExtractedChars()): { text: string; truncated: boolean } {
  if (!text || text.length <= maxChars) return { text: text || '', truncated: false };
  return { text: text.slice(0, maxChars), truncated: true };
}
