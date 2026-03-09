/**
 * Validates and sanitizes callback URL to prevent open redirect attacks
 * Only allows internal URLs (same origin)
 */
export function validateCallbackUrl(url: string | null): string {
    if (!url) return '/';

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);

    // Only allow relative paths (starting with /)
    if (decodedUrl.startsWith('/') && !decodedUrl.startsWith('//')) {
        return decodedUrl;
    }

    // Check if it's a full URL with the same origin
    if (typeof window !== 'undefined') {
        try {
            const urlObj = new URL(decodedUrl, window.location.origin);
            if (urlObj.origin === window.location.origin) {
                return urlObj.pathname + urlObj.search + urlObj.hash;
            }
        } catch {
            // Invalid URL, return default
        }
    }

    // Default to home if validation fails
    return '/';
}
