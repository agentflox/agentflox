import type { Request } from 'express';

type HeaderSource =
    | Request
    | { headers: Record<string, string | string[] | undefined> }
    | { headers: { get(name: string): string | undefined } };

function readHeader(source: HeaderSource, name: string): string | undefined {
    const lower = name.toLowerCase();

    if ('get' in source.headers && typeof source.headers.get === 'function') {
        const value = source.headers.get(name) ?? source.headers.get(lower);
        return value?.split(',')[0]?.trim() || undefined;
    }

    const record = source.headers as Record<string, string | string[] | undefined>;
    const value = record[name] ?? record[lower];
    if (Array.isArray(value)) return value[0]?.split(',')[0]?.trim() || undefined;
    return value?.split(',')[0]?.trim() || undefined;
}

/** Cloudflare sets both headers on proxied requests. */
export function isBehindCloudflare(source: HeaderSource): boolean {
    return Boolean(readHeader(source, 'cf-connecting-ip') && readHeader(source, 'cf-ray'));
}

export function getClientIpFromHeaders(
    source: HeaderSource,
    fallbackIp?: string
): string {
    if (isBehindCloudflare(source)) {
        const cfIp = readHeader(source, 'cf-connecting-ip');
        if (cfIp) return cfIp;
    }

    const xForwardedFor = readHeader(source, 'x-forwarded-for');
    if (xForwardedFor) return xForwardedFor;

    const xRealIp = readHeader(source, 'x-real-ip');
    if (xRealIp) return xRealIp;

    if (fallbackIp) return fallbackIp;

    return 'unknown';
}

export function getClientIp(req: Request): string {
    return getClientIpFromHeaders(req, req.ip || req.socket?.remoteAddress || undefined);
}
