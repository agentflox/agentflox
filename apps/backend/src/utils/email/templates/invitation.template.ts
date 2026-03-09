import { EmailTemplate, EmailTheme } from '../types';

export interface InvitationEmailData {
    recipientName?: string;
    inviterName: string;
    workspaceName?: string;
    itemName?: string;
    itemType?: string;
    role?: string;
    permission?: string;
    invitationUrl: string;
    expiresAt: Date;
}

export class InvitationEmailTemplates {
    /**
     * Invitation to join workspace as member
     */
    static getWorkspaceMemberInvite(data: InvitationEmailData, theme: EmailTheme): EmailTemplate {
        const expiryDays = Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        return {
            subject: `${data.inviterName} invited you to join ${data.workspaceName || 'a workspace'}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${theme.backgroundColor};">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, ${theme.brandColor} 0%, #5a7dfa 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You're Invited!</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: ${theme.textColor};">
                                ${data.recipientName ? `Hi ${data.recipientName},` : 'Hi there,'}
                            </p>
                            
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: ${theme.textColor};">
                                <strong>${data.inviterName}</strong> has invited you to join <strong>${data.workspaceName || 'their workspace'}</strong> as a <strong>${data.role || 'member'}</strong>.
                            </p>
                            
                            <div style="background-color: #f8f9fa; border-left: 4px solid ${theme.brandColor}; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #6c757d;">
                                    <strong>Workspace:</strong> ${data.workspaceName || 'N/A'}<br>
                                    <strong>Role:</strong> ${data.role || 'Member'}<br>
                                    <strong>Expires:</strong> ${expiryDays} day${expiryDays !== 1 ? 's' : ''}
                                </p>
                            </div>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${data.invitationUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${theme.brandColor}; color: ${theme.buttonText}; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0; font-size: 14px; line-height: 20px; color: #6c757d; text-align: center;">
                                Or copy and paste this link into your browser:<br>
                                <a href="${data.invitationUrl}" style="color: ${theme.brandColor}; word-break: break-all;">${data.invitationUrl}</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #6c757d;">
                                If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                            <p style="margin: 8px 0 0; font-size: 12px; color: #6c757d;">
                                © ${new Date().getFullYear()} Agentflox. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
            text: `
You're invited to join ${data.workspaceName || 'a workspace'}!

${data.inviterName} has invited you to join as a ${data.role || 'member'}.

Click the link below to accept:
${data.invitationUrl}

This invitation expires in ${expiryDays} day${expiryDays !== 1 ? 's' : ''}.

If you didn't expect this invitation, you can safely ignore this email.
            `.trim()
        };
    }

    /**
     * Invitation to specific item (Space, Project, Task, etc.)
     */
    static getItemGuestInvite(data: InvitationEmailData, theme: EmailTheme): EmailTemplate {
        const expiryDays = Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const itemTypeLabel = data.itemType?.charAt(0).toUpperCase() + data.itemType?.slice(1) || 'item';

        return {
            subject: `${data.inviterName} invited you to collaborate on ${data.itemName || 'an item'}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaboration Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${theme.backgroundColor};">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, ${theme.brandColor} 0%, #5a7dfa 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎯 Collaboration Invite</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: ${theme.textColor};">
                                ${data.recipientName ? `Hi ${data.recipientName},` : 'Hi there,'}
                            </p>
                            
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: ${theme.textColor};">
                                <strong>${data.inviterName}</strong> wants to collaborate with you on a ${itemTypeLabel.toLowerCase()}.
                            </p>
                            
                            <div style="background-color: #f8f9fa; border-left: 4px solid ${theme.brandColor}; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #6c757d;">
                                    <strong>${itemTypeLabel}:</strong> ${data.itemName || 'N/A'}<br>
                                    ${data.workspaceName ? `<strong>Workspace:</strong> ${data.workspaceName}<br>` : ''}
                                    <strong>Access Level:</strong> ${data.permission || 'View'}<br>
                                    <strong>Expires:</strong> ${expiryDays} day${expiryDays !== 1 ? 's' : ''}
                                </p>
                            </div>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${data.invitationUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${theme.brandColor}; color: ${theme.buttonText}; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                            View & Accept
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0; font-size: 14px; line-height: 20px; color: #6c757d; text-align: center;">
                                Or copy and paste this link into your browser:<br>
                                <a href="${data.invitationUrl}" style="color: ${theme.brandColor}; word-break: break-all;">${data.invitationUrl}</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #6c757d;">
                                If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                            <p style="margin: 8px 0 0; font-size: 12px; color: #6c757d;">
                                © ${new Date().getFullYear()} Agentflox. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
            text: `
Collaboration Invitation

${data.inviterName} has invited you to collaborate on: ${data.itemName || 'an item'}

${itemTypeLabel}: ${data.itemName || 'N/A'}
${data.workspaceName ? `Workspace: ${data.workspaceName}` : ''}
Access Level: ${data.permission || 'View'}

Click the link below to accept:
${data.invitationUrl}

This invitation expires in ${expiryDays} day${expiryDays !== 1 ? 's' : ''}.

If you didn't expect this invitation, you can safely ignore this email.
            `.trim()
        };
    }
}

export default InvitationEmailTemplates;
