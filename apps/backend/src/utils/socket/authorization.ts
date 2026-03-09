import { redis } from '@/lib/redis';
import { supabaseAdmin } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

/**
 * Authorization helpers for socket events
 */

/**
 * Check if a user can send a message to another user
 */
export async function canSendMessage(senderId: string, receiverId: string): Promise<boolean> {
    try {
        // Don't allow messaging yourself
        if (senderId === receiverId) return false;

        // Check if sender is blocked by receiver
        const isBlocked = await redis.sismember(`blocked:${receiverId}`, senderId);
        if (isBlocked) return false;

        // Check receiver's privacy settings
        const { data: receiver } = await supabaseAdmin
            .from('users')
            .select('privacy_settings')
            .eq('id', receiverId)
            .single();

        if (!receiver) return false;

        const privacySettings = receiver.privacy_settings as any;

        // If privacy is set to NONE, no one can message
        if (privacySettings?.allowMessagesFrom === 'NONE') return false;

        // If privacy is set to CONNECTIONS_ONLY, check connection
        if (privacySettings?.allowMessagesFrom === 'CONNECTIONS_ONLY') {
            return await areConnected(senderId, receiverId);
        }

        // If privacy is set to TEAM_ONLY, check team membership
        if (privacySettings?.allowMessagesFrom === 'TEAM_ONLY') {
            return await areTeamMembers(senderId, receiverId);
        }

        // Default: allow messaging
        return true;
    } catch (error) {
        console.error('Error checking message authorization:', error);
        // Fail closed: deny access on error
        return false;
    }
}

/**
 * Check if two users are connected (following each other or team members)
 */
async function areConnected(userId1: string, userId2: string): Promise<boolean> {
    try {
        // Check if they follow each other
        const { data: connections } = await supabaseAdmin
            .from('user_connections')
            .select('id')
            .or(`and(follower_id.eq.${userId1},following_id.eq.${userId2}),and(follower_id.eq.${userId2},following_id.eq.${userId1})`)
            .limit(1);

        if (connections && connections.length > 0) return true;

        // Check if they're in the same team
        return await areTeamMembers(userId1, userId2);
    } catch (error) {
        console.error('Error checking user connection:', error);
        return false;
    }
}

/**
 * Check if users are members of the same team
 */
async function areTeamMembers(userId1: string, userId2: string): Promise<boolean> {
    try {
        const teams1 = await prisma.teamMember.findMany({
            where: { userId: userId1 },
            select: { teamId: true },
        });

        const teams2 = await prisma.teamMember.findMany({
            where: { userId: userId2 },
            select: { teamId: true },
        });

        const teamIds1 = new Set(teams1.map((t) => t.teamId));
        const teamIds2 = new Set(teams2.map((t) => t.teamId));

        // Check for common teams
        for (const teamId of teamIds1) {
            if (teamIds2.has(teamId)) return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking team membership:', error);
        return false;
    }
}

/**
 * Check if a user can access a channel
 */
export async function canAccessChannel(userId: string, channelId: string): Promise<boolean> {
    try {
        // Check if user is a channel member
        const { data: member } = await supabaseAdmin
            .from('channel_members')
            .select('id')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .maybeSingle();

        if (member) return true;

        // Check if user is the channel owner
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: { createdBy: true },
        });

        return channel?.createdBy === userId;
    } catch (error) {
        console.error('Error checking channel access:', error);
        return false;
    }
}

/**
 * Get conversation ID for two users (deterministic)
 */
export function getConversationId(userId1: string, userId2: string): string {
    // Sort user IDs to ensure consistent conversation ID
    const [user1, user2] = [userId1, userId2].sort();
    return `${user1}:${user2}`;
}

/**
 * Get friend IDs for targeted presence broadcasting
 */
export async function getFriendIds(userId: string): Promise<string[]> {
    try {
        const { data: connections } = await supabaseAdmin
            .from('user_connections')
            .select('following_id')
            .eq('follower_id', userId);

        return connections?.map((c: any) => c.following_id) || [];
    } catch (error) {
        console.error('Error getting friend IDs:', error);
        return [];
    }
}

/**
 * Get team member IDs for presence broadcasting
 */
export async function getTeamMemberIds(userId: string): Promise<string[]> {
    try {
        const teams = await prisma.teamMember.findMany({
            where: { userId },
            select: { teamId: true },
        });

        const teamIds = teams.map((t) => t.teamId);

        const members = await prisma.teamMember.findMany({
            where: {
                teamId: { in: teamIds },
                userId: { not: userId },
            },
            select: { userId: true },
        });

        return [...new Set(members.map((m) => m.userId))];
    } catch (error) {
        console.error('Error getting team member IDs:', error);
        return [];
    }
}
