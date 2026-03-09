import { prisma, NotificationType } from '@agentflox/database';
import { redisPub } from '@/lib/redis';
import type { MatchNotification } from '@/services/matching/types';
import { getEmailTransporter } from '@/utils/email/getEmailTransporter';

/**
 * Send match notification (database + real-time + email)
 */
export async function sendMatchNotification(notification: MatchNotification): Promise<void> {
  try {
    // Create notification in database
    const dbNotification = await prisma.notification.create({
      data: {
        userId: notification.userId,
        type: NotificationType.MATCH_FOUND,
        title: 'New Match Found!',
        message: notification.reason,
        actorIds: [],
        entityType: notification.matchType.toUpperCase(),
        entityId: notification.matchId,
        metadata: {
          score: notification.score,
          matchType: notification.matchType,
          matchTitle: notification.matchTitle,
        },
        read: false,
        aggregateKey: `MATCH_FOUND:${notification.userId}:${notification.matchId}`,
      },
    });

    // Send real-time notification via Redis pub/sub
    try {
      await redisPub.publish(
        'notifications',
        JSON.stringify({
          userId: notification.userId,
          notification: {
            id: dbNotification.id,
            type: dbNotification.type,
            title: dbNotification.title,
            message: dbNotification.message,
            entityId: dbNotification.entityId,
            entityType: dbNotification.entityType,
            createdAt: dbNotification.createdAt,
          },
        })
      );
    } catch (error) {
      console.error('Failed to send real-time notification:', error);
      // Continue even if real-time fails
    }

    // Send email notification
    try {
      await sendMatchEmail(notification);
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Continue even if email fails
    }

    console.log(`[Notification] Sent match notification to user ${notification.userId}`);
  } catch (error) {
    console.error(`[Notification] Failed to send notification:`, error);
    throw error;
  }
}

/**
 * Send email notification for match
 */
async function sendMatchEmail(notification: MatchNotification): Promise<void> {
  const transporter = getEmailTransporter();
  if (!transporter) {
    return; // Skip if email not configured
  }

  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { email: true, name: true },
  });

  if (!user || !user.email) {
    console.warn(`[Email] User ${notification.userId} has no email address`);
    return;
  }

  const matchTypeLabels: Record<string, string> = {
    project: 'Project',
    proposal: 'Proposal',
    team: 'Team',
    profile: 'Profile',
  };

  const matchTypeLabel = matchTypeLabels[notification.matchType] || 'Match';
  const scorePercent = Math.round(notification.score * 100);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Match Found</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🎯 New Match Found!</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Hi ${user.name || 'there'},</p>
        <p style="font-size: 16px;">We found a great match for you!</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h2 style="margin-top: 0; color: #667eea;">${notification.matchTitle}</h2>
          <p style="margin: 10px 0;"><strong>Match Type:</strong> ${matchTypeLabel}</p>
          <p style="margin: 10px 0;"><strong>Match Score:</strong> ${scorePercent}%</p>
          <p style="margin: 10px 0; color: #666;">${notification.reason}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.agentflox.com'}/dashboard/matches" 
             style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Match
          </a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This match was found using our AI-powered matching system that analyzes compatibility based on your profile and preferences.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>You're receiving this because you have match notifications enabled.</p>
        <p>© ${new Date().getFullYear()} Agentflox. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
New Match Found!

Hi ${user.name || 'there'},

We found a great match for you!

${notification.matchTitle}
Match Type: ${matchTypeLabel}
Match Score: ${scorePercent}%

${notification.reason}

View your match: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.agentflox.com'}/dashboard/matches

This match was found using our AI-powered matching system.

© ${new Date().getFullYear()} Agentflox. All rights reserved.
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: `🎯 New Match Found: ${notification.matchTitle}`,
    html,
    text,
  });

  console.log(`[Email] Sent match email to ${user.email}`);
}

