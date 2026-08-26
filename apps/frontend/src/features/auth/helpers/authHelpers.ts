const AUTH_PAGES = ['/login', '/register', '/auth', '/forgot-password'];

function isAuthRoute(path: string): boolean {
    return AUTH_PAGES.some(route => path === route || path.startsWith(route + '?') || path.startsWith(route + '/'));
}

/**
 * Validates and sanitizes callback URL to prevent open redirect attacks
 * Only allows internal URLs (same origin) and non-auth pages
 */
export function validateCallbackUrl(url: string | null): string {
    if (!url) return '/';

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);

    // Guard against circular redirects to login/auth routes
    if (isAuthRoute(decodedUrl)) {
        return '/';
    }

    // Only allow relative paths (starting with /)
    if (decodedUrl.startsWith('/') && !decodedUrl.startsWith('//')) {
        return decodedUrl;
    }

    // Check if it's a full URL with the same origin
    if (typeof window !== 'undefined') {
        try {
            const urlObj = new URL(decodedUrl, window.location.origin);
            if (urlObj.origin === window.location.origin) {
                const target = urlObj.pathname + urlObj.search + urlObj.hash;
                return isAuthRoute(target) ? '/' : target;
            }
        } catch {
            // Invalid URL, return default
        }
    }

    // Default to home if validation fails
    return '/';
}

