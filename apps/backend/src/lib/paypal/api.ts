import { env } from '@/config/env';

export function getPayPalApiBase(): string {
    return env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
        throw new Error('PayPal credentials are not configured');
    }

    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
        return cachedToken.value;
    }

    const tokenUrl = `${getPayPalApiBase()}/v1/oauth2/token`;
    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to retrieve PayPal access token: ${err}`);
    }

    const data = await res.json() as { access_token: string; expires_in?: number };
    cachedToken = {
        value: data.access_token,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
}
