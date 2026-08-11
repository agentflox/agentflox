import logger from '@/lib/logger';
import { assertSafeOutboundUrl, SSRF_BLOCKED_MESSAGE } from '../security/ssrf';
import { readResponseWithLimit, truncateText } from '../policy/limits';
import { recordHelperUsage } from '../usage';
import type { HelperArgs, HelperContext, HelperResult } from '../types';

function resolveDownloadUrl(rawUrl: string): string {
  const url = String(rawUrl || '').trim();
  if (!url) return url;
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (driveFile?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveFile[1]}`;
  }
  const driveOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (/drive\.google\.com\/open/i.test(url) && driveOpen?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveOpen[1]}`;
  }
  return url;
}

function guessFilename(url: string, contentType: string | null): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').filter(Boolean).pop();
    if (base && base.includes('.')) return decodeURIComponent(base);
  } catch { /* ignore */ }
  if (contentType?.includes('pdf')) return 'document.pdf';
  if (contentType?.includes('html')) return 'document.html';
  if (contentType?.includes('word')) return 'document.docx';
  return 'document.bin';
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();
    return (data as any)?.text || '';
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await (mammoth as any).extractRawText({ buffer });
    return result?.value || '';
  } catch {
    return '';
  }
}

function extractSimpleTables(text: string): Array<{ header: string[]; rows: string[][] }> {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const tables: Array<{ header: string[]; rows: string[][] }> = [];
  let current: string[][] = [];
  const flush = () => {
    if (current.length >= 2) tables.push({ header: current[0], rows: current.slice(1) });
    current = [];
  };
  for (const line of lines) {
    let cells: string[] | null = null;
    if (line.includes('\t') && line.split('\t').length >= 2) {
      cells = line.split('\t').map((c) => c.trim());
    } else if ((line.match(/\|/g) || []).length >= 2) {
      cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    }
    if (cells && cells.length >= 2) current.push(cells);
    else if (current.length) flush();
  }
  flush();
  return tables.slice(0, 20);
}

/**
 * Fetch URL with SSRF checks and manual redirect following (re-validate each hop).
 */
async function safeFetch(url: string, signal?: AbortSignal, maxRedirects = 5): Promise<Response> {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafeOutboundUrl(current);
    const response = await fetch(current, {
      redirect: 'manual',
      signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentFloxHelper/1.0)' },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const loc = response.headers.get('location');
      if (!loc) throw new Error(`Redirect without Location from ${current}`);
      current = new URL(loc, current).toString();
      continue;
    }
    return response;
  }
  throw new Error('Too many redirects');
}

export async function fileToTextLlmFriendly(
  args: HelperArgs,
  ctx: HelperContext,
  signal?: AbortSignal,
): Promise<HelperResult> {
  const fileUrl = resolveDownloadUrl(
    args.file_url || args.fileUrl || args.url || args.pdf_file_url || args.pdf_url || '',
  );
  if (!fileUrl) {
    return { status: 'error', text: '', tables: [], error: 'file_url is required' };
  }

  try {
    const response = await safeFetch(fileUrl, signal);
    if (!response.ok) {
      return {
        status: 'error',
        text: '',
        tables: [],
        error: `Failed to download file (${response.status}) from ${fileUrl}`,
        file_url: fileUrl,
      };
    }

    const contentType = response.headers.get('content-type');
    const buffer = await readResponseWithLimit(response);
    const filename = guessFilename(fileUrl, contentType);

    const asTextPreview = buffer.slice(0, 200).toString('utf8');
    if (/<!doctype html|<html/i.test(asTextPreview) && /drive\.google/i.test(fileUrl)) {
      return {
        status: 'error',
        text: '',
        tables: [],
        error:
          'Google Drive blocked direct download (login/virus-scan page). Use a publicly downloadable direct PDF URL, or File → Share → Anyone with the link + a smaller file.',
        file_url: fileUrl,
      };
    }

    let text = '';
    const lowerName = filename.toLowerCase();
    const isPdf =
      lowerName.endsWith('.pdf') ||
      contentType?.includes('pdf') ||
      buffer.slice(0, 4).toString() === '%PDF';
    const isDocx =
      lowerName.endsWith('.docx') ||
      contentType?.includes('wordprocessingml') ||
      contentType?.includes('officedocument.wordprocessingml');

    if (isPdf) {
      text = await extractPdfText(buffer);
    } else if (isDocx) {
      text = await extractDocxText(buffer);
      if (!text) {
        return {
          status: 'error',
          text: '',
          tables: [],
          error: 'DOCX extraction failed. Install mammoth or convert to PDF/TXT.',
          file_url: fileUrl,
        };
      }
    } else if (
      contentType?.startsWith('text/') ||
      /\.(txt|md|csv|json|xml|html|log)$/i.test(lowerName)
    ) {
      text = buffer.toString('utf8');
    } else {
      try {
        text = await extractPdfText(buffer);
      } catch {
        text = buffer.toString('utf8');
      }
    }

    const truncated = truncateText(text);
    const tables = extractSimpleTables(truncated.text);

    await recordHelperUsage({
      ctx,
      helperName: 'file_to_text_llm_friendly',
      billable: true,
      success: true,
      meta: { bytes: buffer.length, truncated: truncated.truncated },
      estimatedTokens: Math.max(1, Math.ceil(buffer.length / 4000)),
    });

    return {
      status: 'success',
      text: truncated.text,
      tables,
      truncated: truncated.truncated,
      file_url: fileUrl,
      filename,
      character_count: truncated.text.length,
      word_count: truncated.text.trim() ? truncated.text.trim().split(/\s+/).length : 0,
      bytes_downloaded: buffer.length,
    };
  } catch (err: any) {
    const message = err?.message || 'file_to_text_llm_friendly failed';
    const isSsrf = message.includes(SSRF_BLOCKED_MESSAGE) || /SSRF/i.test(message);
    logger.error('[Helper] file_to_text failed', { error: message, fileUrl });
    await recordHelperUsage({
      ctx,
      helperName: 'file_to_text_llm_friendly',
      billable: false,
      success: false,
      meta: { error: message },
    });
    return {
      status: 'error',
      text: '',
      tables: [],
      error: isSsrf ? SSRF_BLOCKED_MESSAGE : message,
      file_url: fileUrl,
    };
  }
}
