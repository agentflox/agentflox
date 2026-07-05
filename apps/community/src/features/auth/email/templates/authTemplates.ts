import { baseEmailLayout } from './baseLayout';

export const magicLinkTemplate = (url: string) => {
    const content = `
    <h1 class="h1">Sign in to Agentflox</h1>
    <p class="p">Hello,</p>
    <p class="p">We received a request to sign in to your Agentflox account. Use the button below to authenticate securely. This link expires in 10 minutes.</p>
  `;
    return baseEmailLayout(content, { url, text: 'Sign In securely' });
};

export const verifyEmailTemplate = (url: string) => {
    const content = `
    <h1 class="h1">Verify your email</h1>
    <p class="p">Welcome to Agentflox! Please verify your email address to get started with your new account.</p>
  `;
    return baseEmailLayout(content, { url, text: 'Verify Email' });
};

export const resetPasswordTemplate = (url: string) => {
    const content = `
    <h1 class="h1">Reset your password</h1>
    <p class="p">We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
    <p class="p">Otherwise, click the button below to choose a new password.</p>
  `;
    return baseEmailLayout(content, { url, text: 'Reset Password' });
};
