import axios from 'axios';

/**
 * Get authentication token for backend requests
 * Uses the token endpoint to get a valid JWT
 */
export async function fetchAuthToken(session?: any): Promise<string | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await axios.get('/api/auth/token', { withCredentials: true });
      return res?.data?.data?.token;
    } catch (err) {
      return null;
    }
  }
  if (!session?.user?.id) return null;
  const { sign } = await import('jsonwebtoken');
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn('No AUTH_SECRET found, backend requests may fail');
    return null;
  }
  return sign(
    {
      id: session.user.id,
      sub: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    secret,
    { expiresIn: '24h' }
  );
}

/**
 * Make authenticated request to backend
 */
export async function sendBackendRequest(
  endpoint: string,
  options: RequestInit = {},
  session?: any
): Promise<Response> {
  // Use 127.0.0.1 instead of localhost to avoid DNS issues in Node environment
  let baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || 'http://127.0.0.1:3002';

  // Normalize localhost to 127.0.0.1 for internal server-to-server calls
  if (typeof window === 'undefined') {
    baseUrl = baseUrl.replace('localhost', '127.0.0.1');
  }

  const url = `${baseUrl}${endpoint}`;

  try {
    const token = await fetchAuthToken(session);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  } catch (error) {
    console.error(`[Backend Request Failed] URL: ${url}`, error);
    throw error;
  }
}
