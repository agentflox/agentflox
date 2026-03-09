'use server'

import axios, { AxiosError } from "axios";
import { signIn, signOut } from '@/lib/auth';
import { redirect } from "next/navigation";
import { AuthError } from 'next-auth';
import { API_ENDPOINTS } from '@/constants/api';
import { getServerSideURL } from '@/utils/utilities/getURL';
import {
    AuthActionResult,
    createAuthSuccess,
    createAuthError,
    AUTH_ERROR_CODES
} from '@/features/auth/types/apiResponse';

/**
 * Sign in with Google OAuth.
 * Redirects to Google for authentication.
 */
export async function SignInWithGoogle(callbackUrl?: string): Promise<void> {
    await signIn('google', { callbackUrl: callbackUrl || '/' });
}

/**
 * Sign in with GitHub OAuth.
 * Redirects to GitHub for authentication.
 */
export async function SignInWithGithub(callbackUrl?: string): Promise<void> {
    await signIn('github', { callbackUrl: callbackUrl || '/' });
}

/**
 * Sign in with email and password credentials.
 * @throws AuthError on invalid credentials
 */
export async function SignInWithCredentials(
    email: string,
    password: string,
    callbackUrl?: string
): Promise<AuthActionResult> {
    try {
        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
            callbackUrl: callbackUrl || '/'
        });

        if (result?.error) {
            return createAuthError(
                AUTH_ERROR_CODES.INVALID_CREDENTIALS,
                'Invalid credentials'
            );
        }

        return createAuthSuccess();
    } catch (error) {
        if (error instanceof AuthError) {
            return createAuthError(
                AUTH_ERROR_CODES.INVALID_CREDENTIALS,
                error.message
            );
        }
        throw error;
    }
}

/**
 * Sign in with magic link (passwordless).
 * Sends a magic link to the provided email.
 */
export async function SignInWithMagicLink(
    email: string,
    callbackUrl?: string
): Promise<AuthActionResult> {
    try {
        await signIn('nodemailer', {
            email,
            redirect: false,
            callbackUrl: callbackUrl || '/'
        });
        return createAuthSuccess();
    } catch (error) {
        if (error instanceof AuthError) {
            return createAuthError(
                AUTH_ERROR_CODES.EMAIL_SEND_FAILED,
                error.message
            );
        }
        return createAuthError(
            AUTH_ERROR_CODES.INTERNAL_ERROR,
            'Failed to send magic link'
        );
    }
}

/**
 * Register a new user with email and password.
 * Sends a verification email to complete registration.
 */
export async function RegisterUser(
    email: string,
    password: string
): Promise<AuthActionResult<{ message: string }>> {
    try {
        const res = await axios.post(
            `${getServerSideURL()}${API_ENDPOINTS.auth.register}`,
            { email, password },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 30000, // 30 second timeout
            }
        );

        if (res.data.success) {
            return createAuthSuccess({ message: "Registration successful" });
        }

        return createAuthError(
            AUTH_ERROR_CODES.INTERNAL_ERROR,
            res.data.message || "Registration failed"
        );
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ message?: string; code?: string }>;

            // Handle specific error codes from API
            const errorCode = axiosError.response?.data?.code;
            const errorMessage = axiosError.response?.data?.message;

            if (axiosError.response?.status === 409 ||
                errorMessage?.toLowerCase().includes('exists')) {
                return createAuthError(
                    AUTH_ERROR_CODES.USER_EXISTS,
                    'User already exists'
                );
            }

            if (axiosError.response?.status === 400) {
                return createAuthError(
                    AUTH_ERROR_CODES.VALIDATION_ERROR,
                    errorMessage || 'Invalid input'
                );
            }

            if (!axiosError.response) {
                return createAuthError(
                    AUTH_ERROR_CODES.SERVICE_UNAVAILABLE,
                    'Unable to connect to server'
                );
            }

            return createAuthError(
                AUTH_ERROR_CODES.INTERNAL_ERROR,
                errorMessage || 'Registration failed'
            );
        }

        return createAuthError(
            AUTH_ERROR_CODES.INTERNAL_ERROR,
            'An unexpected error occurred'
        );
    }
}

/**
 * Sign out the current user.
 * Redirects to login page after sign out.
 */
export async function SignOut(): Promise<void> {
    await signOut({ redirectTo: "/login" });
}

/**
 * Complete onboarding and redirect to home.
 */
export async function completeOnboarding(): Promise<never> {
    redirect("/");
}

/**
 * Request a password reset email.
 * Always returns success for security (doesn't reveal if email exists).
 */
export async function RequestPasswordReset(
    email: string
): Promise<AuthActionResult> {
    try {
        await axios.post(
            `${getServerSideURL()}${API_ENDPOINTS.auth.reset.request}`,
            { email },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000, // 30 second timeout
            }
        );

        // Always return success for security (don't reveal if email exists)
        return createAuthSuccess();
    } catch (error) {
        // Log error internally but return success to user for security
        console.error('Password reset request error:', error);
        return createAuthSuccess();
    }
}

/**
 * Confirm password reset with token and new password.
 */
export async function ConfirmPasswordReset(
    token: string,
    newPassword: string
): Promise<AuthActionResult> {
    try {
        const res = await axios.post(
            `${getServerSideURL()}${API_ENDPOINTS.auth.reset.confirm}`,
            { token, newPassword },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000, // 30 second timeout
            }
        );

        if (res.data.success) {
            return createAuthSuccess();
        }

        return createAuthError(
            AUTH_ERROR_CODES.INTERNAL_ERROR,
            'Failed to reset password'
        );
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ message?: string }>;

            if (axiosError.response?.status === 400) {
                return createAuthError(
                    AUTH_ERROR_CODES.TOKEN_INVALID,
                    'Invalid or expired token'
                );
            }

            if (!axiosError.response) {
                return createAuthError(
                    AUTH_ERROR_CODES.SERVICE_UNAVAILABLE,
                    'Unable to connect to server'
                );
            }
        }

        return createAuthError(
            AUTH_ERROR_CODES.INTERNAL_ERROR,
            'Failed to reset password'
        );
    }
}
