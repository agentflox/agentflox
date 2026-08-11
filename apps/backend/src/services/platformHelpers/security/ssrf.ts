import dns from 'dns/promises';
import net from 'net';

const BLOCKED_ERROR = 'URL blocked by SSRF policy';

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const ranges: Array<[number, number]> = [
    [ipv4ToInt('0.0.0.0'), ipv4ToInt('0.255.255.255')],
    [ipv4ToInt('10.0.0.0'), ipv4ToInt('10.255.255.255')],
    [ipv4ToInt('127.0.0.0'), ipv4ToInt('127.255.255.255')],
    [ipv4ToInt('169.254.0.0'), ipv4ToInt('169.254.255.255')],
    [ipv4ToInt('172.16.0.0'), ipv4ToInt('172.31.255.255')],
    [ipv4ToInt('192.168.0.0'), ipv4ToInt('192.168.255.255')],
    [ipv4ToInt('224.0.0.0'), ipv4ToInt('255.255.255.255')],
  ];
  return ranges.some(([start, end]) => n >= start && n <= end);
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
  if (normalized.startsWith('fe80')) return true; // link-local
  // IPv4-mapped
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

/**
 * Validate a user-supplied URL before outbound fetch. Resolves DNS and blocks
 * loopback / private / link-local / metadata addresses.
 */
export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    throw new Error(BLOCKED_ERROR);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(BLOCKED_ERROR);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) throw new Error(BLOCKED_ERROR);

  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error(BLOCKED_ERROR);
    return parsed;
  }

  // Block obvious local hostnames without DNS
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    throw new Error(BLOCKED_ERROR);
  }

  let records: string[] = [];
  try {
    const result = await dns.lookup(hostname, { all: true, verbatim: true });
    records = result.map((r) => r.address);
  } catch {
    throw new Error(BLOCKED_ERROR);
  }

  if (!records.length || records.some(isBlockedIp)) {
    throw new Error(BLOCKED_ERROR);
  }

  return parsed;
}

export { BLOCKED_ERROR as SSRF_BLOCKED_MESSAGE };
