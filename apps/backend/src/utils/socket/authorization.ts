import { redis } from '@/lib/redis';
import { supabaseAdmin } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

const MARKETPLACE_SUBMISSION_PREFIX = '__AF_MARKETPLACE_SUBMISSION__';

/**
 * Authorization helpers for socket events
 */

/**
 * Check if a user can send a message to another user
 */
export async function canSendMessage(senderId: string, receiverId: string, marketplaceListingId?: string | null): Promise<boolean> {
    try {
        // Don't allow messaging yourself
        if (senderId === receiverId) return false;

        // Check if sender is blocked by receiver
        const isBlocked = await redis.sismember(`blocked:${receiverId}`, senderId);
        if (isBlocked) return false;

        // 1. If they already have a conversation record together (any context), 
        // they are authorized to keep messaging.
        const conversation = await prisma.conversation.findFirst({
            where: {
                participantIds: { equals: [senderId, receiverId].sort() },
                ...(marketplaceListingId !== undefined ? { marketplaceListingId: marketplaceListingId || null } : {}),
            },
            select: { id: true },
        });
        if (conversation) return true;

        // 2. If no conversation exists yet, check if they are explicitly connected.
        const connected = await areConnected(senderId, receiverId);
        if (connected) return true;

        // 3. Check for specific marketplace listing context if provided.
        // If a user is messaging a listing author for the first time, allow it.
        if (marketplaceListingId) {
            const listing = await prisma.marketplaceListing.findUnique({
                where: { id: marketplaceListingId },
                select: { authorId: true },
            });
            if (listing?.authorId === receiverId) return true;
        }

        // 4. Fallback: check receiver's privacy settings
        const receiver = await prisma.user.findUnique({
            where: { id: receiverId },
            select: { settings: true },
        });

        if (!receiver) return false;

        const privacySettings = receiver.settings as any;
        if (privacySettings?.allowMessagesFrom === 'NONE') return false;
        
        // If not explicitly blocked and settings are open, allow.
        return privacySettings?.allowMessagesFrom !== 'CONNECTIONS_ONLY';
    } catch (error) {
        console.error('Error checking message authorization:', error);
        return false;
    }
}

/**
 * Check if two users are connected (following each other or team members)
 */
async function areConnected(userId1: string, userId2: string): Promise<boolean> {
    try {
        const connection = await prisma.connection.findFirst({
            where: {
                OR: [
                    { requesterId: userId1, receiverId: userId2, status: 'ACCEPTED' },
                    { requesterId: userId2, receiverId: userId1, status: 'ACCEPTED' },
                ],
            },
        });
        if (connection) return true;

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
