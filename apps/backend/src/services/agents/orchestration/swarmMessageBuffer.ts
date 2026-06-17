import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { createContextLogger } from '@/lib/logger';

const logger = createContextLogger({ service: 'SwarmMessageBuffer' });

// How many messages to buffer before forcing a flush
const MAX_BUFFER_SIZE = 20;
// How long to wait before flushing a non-full buffer (ms)
const FLUSH_INTERVAL_MS = 750;

interface BufferedMessage {
    conversationId: string;
    content: string;
    metadata: any;
}

/**
 * Redis-backed batched writer for swarm aiMessage rows.
 *
 * Instead of one INSERT per swarm event (which can be 15–30 per cycle),
 * we RPUSH serialized rows into a Redis list keyed by conversationId.
 * A periodic flusher (started once at service boot) drains all lists
 * and calls prisma.aiMessage.createMany — a single round-trip per session
 * per flush interval regardless of how many events fired.
 *
 * Redis list key: swarm:msgbuf:{conversationId}
 * TTL on the list:  10 minutes (safety expiry for orphaned buffers)
 */
export class SwarmMessageBuffer {
    private flushTimer: NodeJS.Timeout | null = null;

    /** Start the background flush loop (call once at service startup) */
    start() {
        if (this.flushTimer) return;
        this.flushTimer = setInterval(() => this.flushAll().catch(err =>
            logger.warn(`Buffer flush error: ${err?.message}`)
        ), FLUSH_INTERVAL_MS);
        logger.info('SwarmMessageBuffer flush loop started');
    }

    /** Stop the flush loop and do a final drain (call on graceful shutdown) */
    async stop() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flushAll();
        logger.info('SwarmMessageBuffer stopped, final flush complete');
    }

    /**
     * Buffer a message for a conversation.
     * Triggers an early flush if the buffer exceeds MAX_BUFFER_SIZE.
     */
    async push(conversationId: string, content: string, metadata: any): Promise<void> {
        const key = `swarm:msgbuf:${conversationId}`;
        const row: BufferedMessage = { conversationId, content, metadata };
        const len = await redis.rpush(key, JSON.stringify(row));
        // Set TTL on every push so orphaned buffers don't live forever
        await redis.expire(key, 600); // 10 min TTL

        if (len >= MAX_BUFFER_SIZE) {
            // Flush this session immediately without waiting for the timer
            this.flushConversation(conversationId).catch(err =>
                logger.warn(`Early flush error (${conversationId}): ${err?.message}`)
            );
        }
    }

    /** Flush all active buffer lists */
    private async flushAll(): Promise<void> {
        // Scan for all active buffer keys
        let cursor = '0';
        const keys: string[] = [];
        do {
            const [next, found] = await redis.scan(cursor, 'MATCH', 'swarm:msgbuf:*', 'COUNT', 100);
            cursor = next;
            keys.push(...found);
        } while (cursor !== '0');

        if (keys.length === 0) return;

        await Promise.allSettled(
            keys.map(key => {
                const conversationId = key.replace('swarm:msgbuf:', '');
                return this.flushConversation(conversationId);
            })
        );
    }

    /** Atomically drain one conversation's buffer and write to DB */
    private async flushConversation(conversationId: string): Promise<void> {
        const key = `swarm:msgbuf:${conversationId}`;

        // Atomically get-and-delete the entire list
        const pipeline = redis.pipeline();
        pipeline.lrange(key, 0, -1);
        pipeline.del(key);
        const results = await pipeline.exec();

        const rawRows = (results?.[0]?.[1] as string[]) ?? [];
        if (rawRows.length === 0) return;

        const rows: BufferedMessage[] = rawRows.map(r => JSON.parse(r));

        try {
            // Single createMany call — one DB round-trip for N messages
            await prisma.aiMessage.createMany({
                data: rows.map(r => ({
                    conversationId: r.conversationId,
                    role: 'ASSISTANT' as const,
                    content: r.content,
                    metadata: r.metadata,
                })),
                skipDuplicates: true,
            });

            // Single update to bump messageCount and lastMessageAt
            await prisma.aiConversation.update({
                where: { id: conversationId },
                data: {
                    messageCount: { increment: rows.length },
                    lastMessageAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            logger.debug(`Flushed ${rows.length} messages for conversation ${conversationId}`);
        } catch (err: any) {
            logger.warn(`Failed to flush buffer for ${conversationId}: ${err?.message}`);
            
            // If the conversation was deleted from the DB, drop the messages to prevent infinite retry loops.
            const isDeleted = err?.code === 'P2003' || err?.message?.includes('Foreign key constraint') || err?.code === 'P2025' || err?.message?.includes('not found');
            if (isDeleted) {
                logger.error(`[Buffer] Conversation ${conversationId} appears deleted from DB. Dropping ${rows.length} messages and killing orphaned session.`);
                await redis.del(`swarm:session:${conversationId}`);
                await redis.hdel('swarm:sessions', conversationId);
                return; // Do not repush
            }

            // Re-push failed rows back so they are retried next cycle (e.g. temporary DB connection drop)
            if (rawRows.length > 0) {
                const repushPipeline = redis.pipeline();
                rawRows.forEach(r => repushPipeline.rpush(key, r));
                repushPipeline.expire(key, 600);
                await repushPipeline.exec();
            }
        }
    }
}

export const swarmMessageBuffer = new SwarmMessageBuffer();
