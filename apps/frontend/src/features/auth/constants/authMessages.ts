/**
 * Centralized authentication messages for user-friendly error handling.
 * These messages should be used instead of raw API error messages
 * to provide a consistent and professional user experience.
 */

export const AUTH_MESSAGES = {
    SUCCESS: {
        LOGIN: "Welcome back! You have successfully logged in.",
        REGISTER: "Account created successfully! Redirecting...",
        MAGIC_LINK_SENT: "Magic link sent! Check your inbox for the sign-in link.",
        PASSWORD_RESET_REQUESTED: "If an account exists with this email, we've sent a password reset link.",
        PASSWORD_RESET_SUCCESS: "Password updated successfully! Redirecting to login...",
    },
    ERROR: {
        // Login errors
        INVALID_CREDENTIALS: "The email or password you entered is incorrect.",
        TOKEN_EXPIRED: "Your session has expired. Please log in again.",
        ACCOUNT_LOCKED: "Your account has been temporarily locked. Please try again later.",

        // Registration errors
        USER_EXISTS: "An account with this email already exists.",
        REGISTRATION_FAILED: "Unable to create account. Please try again.",

        // Password errors
        WEAK_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, and a number.",
        PASSWORDS_NOT_MATCH: "Passwords do not match.",
        PASSWORD_RESET_FAILED: "Unable to reset password. Please try again.",

        // Token/Link errors
        INVALID_TOKEN: "This link is invalid or has expired. Please request a new one.",
        MAGIC_LINK_FAILED: "Unable to send magic link. Please try again.",

        // OAuth errors
        GOOGLE_CONNECT_FAILED: "Unable to connect to Google. Please try again.",
        OAUTH_FAILED: "Unable to sign in with this method. Please try again.",

        // Network/Server errors
        NETWORK_ERROR: "Unable to connect to the server. Please check your internet connection.",
        SERVER_ERROR: "Something went wrong on our end. Please try again later.",
        GENERIC: "Something went wrong. Please try again.",
    },
    WARNING: {
        WEAK_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, and a number.",
    },
    INFO: {
        REDIRECTING: "Redirecting...",
        CHECK_EMAIL: "Please check your email for further instructions.",
    },
} as const;

// Type for accessing messages
export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
export type SuccessMessageKey = keyof typeof AUTH_MESSAGES.SUCCESS;
export type ErrorMessageKey = keyof typeof AUTH_MESSAGES.ERROR;
export type WarningMessageKey = keyof typeof AUTH_MESSAGES.WARNING;
export type InfoMessageKey = keyof typeof AUTH_MESSAGES.INFO;

/**
 * Maps API error codes to user-friendly messages.
 * Use this to convert backend error codes to display messages.
 */
export const ERROR_CODE_TO_MESSAGE: Record<string, string> = {
    // Standard API error codes
    VALIDATION_ERROR: AUTH_MESSAGES.ERROR.GENERIC,
    INVALID_CREDENTIALS: AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS,
    USER_EXISTS: AUTH_MESSAGES.ERROR.USER_EXISTS,
    USER_NOT_FOUND: AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS, // Don't reveal user existence
    TOKEN_EXPIRED: AUTH_MESSAGES.ERROR.TOKEN_EXPIRED,
    TOKEN_INVALID: AUTH_MESSAGES.ERROR.INVALID_TOKEN,
    MISSING_REQUIRED_FIELDS: AUTH_MESSAGES.ERROR.GENERIC,
    WEAK_PASSWORD: AUTH_MESSAGES.ERROR.WEAK_PASSWORD,
    UNAUTHORIZED: AUTH_MESSAGES.ERROR.TOKEN_EXPIRED,
    FORBIDDEN: AUTH_MESSAGES.ERROR.GENERIC,
    RATE_LIMITED: AUTH_MESSAGES.ERROR.ACCOUNT_LOCKED,
    INTERNAL_ERROR: AUTH_MESSAGES.ERROR.SERVER_ERROR,
    SERVICE_UNAVAILABLE: AUTH_MESSAGES.ERROR.SERVER_ERROR,
    DATABASE_ERROR: AUTH_MESSAGES.ERROR.SERVER_ERROR,
    EMAIL_SEND_FAILED: AUTH_MESSAGES.ERROR.SERVER_ERROR,

    // NextAuth error codes
    Configuration: AUTH_MESSAGES.ERROR.SERVER_ERROR,
    AccessDenied: AUTH_MESSAGES.ERROR.GENERIC,
    Verification: AUTH_MESSAGES.ERROR.INVALID_TOKEN,
    OAuthSignin: AUTH_MESSAGES.ERROR.OAUTH_FAILED,
    OAuthCallback: AUTH_MESSAGES.ERROR.OAUTH_FAILED,
    OAuthCreateAccount: AUTH_MESSAGES.ERROR.OAUTH_FAILED,
    EmailCreateAccount: AUTH_MESSAGES.ERROR.REGISTRATION_FAILED,
    Callback: AUTH_MESSAGES.ERROR.GENERIC,
    OAuthAccountNotLinked: AUTH_MESSAGES.ERROR.USER_EXISTS,
    EmailSignin: AUTH_MESSAGES.ERROR.MAGIC_LINK_FAILED,
    CredentialsSignin: AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS,
    SessionRequired: AUTH_MESSAGES.ERROR.TOKEN_EXPIRED,
    Default: AUTH_MESSAGES.ERROR.GENERIC,
};

/**
 * Get a user-friendly error message from an error code or raw message.
 * Falls back to generic error if code is not recognized.
 */
export function getUserFriendlyMessage(
    errorCodeOrMessage: string | undefined | null,
    fallback: string = AUTH_MESSAGES.ERROR.GENERIC
): string {
    if (!errorCodeOrMessage) return fallback;

    // Check if it's a known error code
    if (ERROR_CODE_TO_MESSAGE[errorCodeOrMessage]) {
        return ERROR_CODE_TO_MESSAGE[errorCodeOrMessage];
    }

    // Check for common error patterns in raw messages
    const lowerMessage = errorCodeOrMessage.toLowerCase();

    if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
        return AUTH_MESSAGES.ERROR.USER_EXISTS;
    }
    if (lowerMessage.includes('invalid') && lowerMessage.includes('credentials')) {
        return AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS;
    }
    if (lowerMessage.includes('expired')) {
        return AUTH_MESSAGES.ERROR.TOKEN_EXPIRED;
    }
    if (lowerMessage.includes('not found')) {
        return AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS; // Don't reveal user existence
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
        return AUTH_MESSAGES.ERROR.NETWORK_ERROR;
    }
    if (lowerMessage.includes('server') || lowerMessage.includes('internal')) {
        return AUTH_MESSAGES.ERROR.SERVER_ERROR;
    }

    // Return fallback for unrecognized errors
    return fallback;
}
