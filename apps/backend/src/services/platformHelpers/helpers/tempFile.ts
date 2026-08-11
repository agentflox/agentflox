import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';
import { recordHelperUsage } from '../usage';
import type { HelperArgs, HelperContext, HelperResult } from '../types';

/**
 * Upload bytes/path content to Supabase storage and return a public URL.
 * Accepts base64 string, utf8 string, or { data, encoding }.
 */
export async function insertTempFile(
  args: HelperArgs,
  ctx: HelperContext,
): Promise<HelperResult> {
  const bucket = process.env.HELPER_TEMP_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'temp-files';
  const raw = args.file_path_or_bytes ?? args.file ?? args.data ?? args.content;
  const ext = String(args.ext || args.extension || 'bin').replace(/^\./, '');

  if (raw === undefined || raw === null || raw === '') {
    return { status: 'error', error: 'file_path_or_bytes is required' };
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      status: 'error',
      error: 'Temp file storage not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    };
  }

  let buffer: Buffer;
  if (Buffer.isBuffer(raw)) {
    buffer = raw;
  } else if (typeof raw === 'object' && raw?.data) {
    buffer = Buffer.from(String(raw.data), raw.encoding === 'base64' ? 'base64' : 'utf8');
  } else if (typeof raw === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 64 && args.encoding === 'base64') {
    buffer = Buffer.from(raw, 'base64');
  } else {
    buffer = Buffer.from(String(raw), 'utf8');
  }

  const path = `helpers/${ctx.userId || 'anon'}/${ctx.runId || 'run'}/${randomUUID()}.${ext}`;

  try {
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
      contentType: 'application/octet-stream',
      upsert: false,
    });
    if (error) {
      return { status: 'error', error: `Upload failed: ${error.message}` };
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const url = data?.publicUrl;
    if (!url) return { status: 'error', error: 'Failed to resolve public URL' };

    await recordHelperUsage({
      ctx,
      helperName: 'insert_temp_file',
      billable: true,
      success: true,
      meta: { bytes: buffer.length, bucket },
      estimatedTokens: 1,
    });

    return { status: 'success', url, path, bucket, bytes: buffer.length };
  } catch (err: any) {
    logger.error('[Helper] insert_temp_file failed', { error: err?.message });
    return { status: 'error', error: err?.message || 'insert_temp_file failed' };
  }
}
