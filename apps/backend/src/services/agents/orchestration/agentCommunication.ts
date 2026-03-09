import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import CircuitBreaker from 'opossum';
import { redisPub, redisSub, redis } from '@/lib/redis';
import { inngest } from '@/lib/inngest';
import { agentRegistryService } from './agentRegistry';
import { agentExecutionService } from './agentExecutionService';

/**
 * Agent Communication Service
 * Enables secure, policy-controlled agent-to-agent messaging via Redis Pub/Sub
 */

export interface AgentMessage {
    content: string;
    type: 'REQUEST' | 'RESPONSE' | 'NOTIFICATION';
    data?: Record<string, any>;
}

export interface MessageEnvelope {
    id: string;
    from: string;
    to: string;
    message: AgentMessage;
    timestamp: Date;
    ttl: number;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    requireAck: boolean;
    correlationId?: string;
    signature?: string;
}

export interface CommunicationOptions {
    ttl?: number;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    requireAck?: boolean;
    synchronous?: boolean;
    timeout?: number;
}

export interface AgentResponse {
    messageId: string;
    status: 'QUEUED' | 'DELIVERED' | 'FAILED';
    response?: any;
    error?: string;
}

@Injectable()
export class AgentCommunicationService implements OnModuleInit {
    private pendingResponses: Map<string, (response: any) => void> = new Map();
    private activeListeners: Set<string> = new Set();
    private streamBreaker: CircuitBreaker;

    constructor() {
        this.streamBreaker = new CircuitBreaker(
            async ({ streamKey, envelope }: { streamKey: string; envelope: MessageEnvelope }) => {
                // Primary path: durable write to Redis Stream + Pub/Sub
                await redis.xadd(streamKey, 'MAXLEN', '~', '1000', '*', 'envelope', JSON.stringify(envelope));
                await redisPub.publish(`agent:${envelope.to}:inbox`, JSON.stringify(envelope));
            },
            {
                timeout: 5000,
                errorThresholdPercentage: 50,
                resetTimeout: 30000,
                name: 'agent-dispatch',
            }
        );

        // DLQ fallback – write envelope to a dispatch DLQ stream for later inspection
        this.streamBreaker.fallback(async ({ streamKey, envelope }: { streamKey: string; envelope: MessageEnvelope }) => {
            try {
                await redis.xadd(
                    'agent:dispatch:dlq',
                    'MAXLEN',
                    '~',
                    '2000',
                    '*',
                    'payload',
                    JSON.stringify({ streamKey, envelope })
                );
            } catch (err) {
                console.error('[AgentComm] Failed to write to dispatch DLQ', err);
            }
        });
    }

    async onModuleInit() {
        // Subscribe to a global response channel to handle distributed sync calls
        await redisSub.subscribe('agent:responses');
        redisSub.on('message', (channel, message) => {
            if (channel === 'agent:responses') {
                try {
                    const data = JSON.parse(message);
                    const resolver = this.pendingResponses.get(data.messageId);
                    if (resolver) {
                        resolver(data);
                        this.pendingResponses.delete(data.messageId);
                    }
                } catch (e) {
                    console.error('[AgentComm] Error parsing response message:', e);
                }
            }
        });
    }

    /**
     * Create a consumer group for an agent's stream if it doesn't exist
     */
    private async ensureConsumerGroup(agentId: string) {
        const streamKey = `agent:${agentId}:stream`;
        const groupName = 'agent_workers';
        try {
            // Using MKSTREAM to create the stream if it doesn't exist
            await redis.xgroup('CREATE', streamKey, groupName, '$', 'MKSTREAM');
            console.log(`[AgentComm] Created consumer group ${groupName} for ${streamKey}`);
        } catch (error: any) {
            if (!error.message?.includes('BUSYGROUP')) {
                console.error(`[AgentComm] Error creating consumer group:`, error);
            }
        }
    }

    /**
     * Send message from one agent to another using durable Redis Streams
     */
    async sendMessage(
        fromAgentId: string,
        toAgentId: string,
        message: AgentMessage,
        options: CommunicationOptions = {}
    ): Promise<AgentResponse> {
        const envelope: MessageEnvelope = {
            id: randomUUID(),
            from: fromAgentId,
            to: toAgentId,
            message,
            timestamp: new Date(),
            ttl: options.ttl || 60000,
            priority: options.priority || 'NORMAL',
            requireAck: options.requireAck !== false,
        };

        const [fromAgent, toAgent] = await Promise.all([
            agentRegistryService.getAgent(fromAgentId),
            agentRegistryService.getAgent(toAgentId),
        ]);

        if (!fromAgent && fromAgentId !== 'system') {
            return {
                messageId: envelope.id,
                status: 'FAILED',
                error: `Sender agent not found: ${fromAgentId}`,
            };
        }

        if (!toAgent) {
            return {
                messageId: envelope.id,
                status: 'FAILED',
                error: `Recipient agent not found: ${toAgentId}`,
            };
        }

        const allowed = await this.checkCommunicationPolicy(fromAgent, toAgent);
        if (!allowed) {
            return {
                messageId: envelope.id,
                status: 'FAILED',
                error: 'Communication not allowed by policy',
            };
        }

        // SIGN the message to prevent spoofing
        envelope.signature = this.signMessage(envelope);

        try {
            const streamKey = `agent:${toAgentId}:stream`;
            await this.streamBreaker.fire({ streamKey, envelope });
            console.log(`[AgentComm] Message durable in ${streamKey}: ${envelope.id}`);
        } catch (error) {
            console.error('[AgentComm] Failed to enqueue message via circuit breaker:', error);
            return {
                messageId: envelope.id,
                status: 'FAILED',
                error: 'Agent dispatch circuit open or enqueue failed',
            };
        }

        if (options.synchronous) {
            return await this.waitForResponse(envelope.id, options.timeout || 30000);
        }

        return {
            messageId: envelope.id,
            status: 'QUEUED',
        };
    }

    /**
     * Subscribe to agent inbox with auto-recovery from Redis Streams
     */
    async subscribeToInbox(agentId: string): Promise<void> {
        if (this.activeListeners.has(agentId)) return;
        this.activeListeners.add(agentId);

        // 1. Ensure consumer group exists
        await this.ensureConsumerGroup(agentId);

        // 2. Listen for real-time messages via Pub/Sub (Fast path for local notification)
        await redisSub.subscribe(`agent:${agentId}:inbox`);

        // 3. Start the reliable stream consumer (Durable path)
        this.startStreamListener(agentId);

        console.log(`[AgentComm] Agent ${agentId} subscribed to reliable inbox (Consumer Group + Pub/Sub)`);
    }

    /**
     * Background listener for the agent's stream
     */
    private async startStreamListener(agentId: string) {
        const streamKey = `agent:${agentId}:stream`;
        const groupName = 'agent_workers';
        const consumerName = `node_${process.pid}_${randomUUID().slice(0, 8)}`;

        const poll = async () => {
            if (!this.activeListeners.has(agentId)) return;

            try {
                // Read from consumer group (blocking for 2s)
                // '>' means only new messages that haven't been delivered to any other consumer
                const results = await redis.xreadgroup(
                    'GROUP', groupName, consumerName,
                    'COUNT', '10',
                    'BLOCK', 2000,
                    'STREAMS', streamKey, '>'
                );

                if (results) {
                    for (const [key, messages] of (results as any)) {
                        for (const [id, [_, data]] of (messages as any)) {
                            const envelope: MessageEnvelope = JSON.parse(data);
                            await this.processEnvelope(agentId, envelope, id);
                        }
                    }
                }

                // Periodic check for pending (unacknowledged) messages from crashed consumers
                // In a production app, this would be a separate 'reclaiming' loop, 
                // but we can trigger it occasionally here.
                if (Math.random() < 0.1) {
                    await this.reclaimPendingMessages(agentId, groupName, consumerName);
                }
            } catch (error) {
                console.error(`[AgentComm] Error reading stream for ${agentId}:`, error);
                await new Promise(r => setTimeout(r, 5000));
            }

            setImmediate(() => poll());
        };

        poll();
    }

    private async reclaimPendingMessages(agentId: string, group: string, consumer: string) {
        const streamKey = `agent:${agentId}:stream`;
        try {
            // Get messages that have been pending for > 30s
            const pending = await redis.xpending(streamKey, group, 'IDLE', 30000, '-', '+', 10);
            if (pending && pending.length > 0) {
                console.log(`[AgentComm] Attempting to reclaim ${pending.length} pending messages for ${agentId}`);
                const ids = pending.map((p: any) => p[0]);

                // Claim them for this consumer
                const claimed = await redis.xclaim(streamKey, group, consumer, 30000, ...ids);
                if (claimed) {
                    for (const [id, [_, data]] of (claimed as any)) {
                        const envelope: MessageEnvelope = JSON.parse(data);
                        await this.processEnvelope(agentId, envelope, id);
                    }
                }
            }
        } catch (e) {
            console.error('[AgentComm] Error reclaiming messages:', e);
        }
    }

    private async processEnvelope(agentId: string, envelope: MessageEnvelope, streamId?: string) {
        try {
            console.log(`[AgentComm] Agent ${agentId} processing message ${envelope.id} (StreamId: ${streamId})`);

            // Verify signature (Security Upgrade)
            if (!this.verifySignature(envelope)) {
                console.error(`[AgentComm] INVALID SIGNATURE on message ${envelope.id}. Dropping.`);
                if (streamId) await this.acknowledgeMessage(agentId, streamId);
                return;
            }

            // Skip if TTL expired
            const now = new Date().getTime();
            const sentAt = new Date(envelope.timestamp).getTime();
            if (now - sentAt > envelope.ttl) {
                console.warn(`[AgentComm] Skipping expired message ${envelope.id} (TTL: ${envelope.ttl}ms)`);
                // Acknowledge anyway so it's removed from the pending list
                if (streamId) await this.acknowledgeMessage(agentId, streamId);
                return;
            }

            // Track load for routing
            await redis.zincrby('agent_loads', 1, agentId);

            const result = await agentExecutionService.executeAgent({
                agentId,
                userId: 'system',
                inputData: {
                    fromAgent: envelope.from,
                    message: envelope.message,
                },
                executionContext: {
                    messageId: envelope.id,
                    fromAgentId: envelope.from,
                    priority: envelope.priority,
                    executionId: (envelope.message.data as any)?.executionId,
                },
            });

            // Decrement load
            await redis.zincrby('agent_loads', -1, agentId);

            // Acknowledge success
            if (streamId) {
                await this.acknowledgeMessage(agentId, streamId);
            }

            // Emit Inngest event for asynchronous orchestration (Model 2)
            await inngest.send({
                name: 'agent/message.processed',
                data: {
                    messageId: envelope.id,
                    agentId,
                    response: result,
                    status: 'COMPLETED',
                    timestamp: new Date()
                }
            });

            if (envelope.requireAck) {
                await this.sendResponse(envelope.id, result);
            }
        } catch (error) {
            console.error(`[AgentComm] Error processing message ${envelope.id}:`, error);
            await this.sendError(envelope.id, error instanceof Error ? error.message : 'Unknown error');
            // NOTE: We do NOT XACK here if we want to retry. 
            // For now, enterprise workers often skip after N retries, but we'll leave it in pending for visibility.
        }
    }

    private async acknowledgeMessage(agentId: string, streamId: string) {
        const streamKey = `agent:${agentId}:stream`;
        const groupName = 'agent_workers';
        await redis.xack(streamKey, groupName, streamId);
        console.log(`[AgentComm] Message ${streamId} acknowledged for ${agentId}`);
    }

    private async sendResponse(messageId: string, response: any): Promise<void> {
        await redisPub.publish('agent:responses', JSON.stringify({
            messageId,
            response,
            timestamp: new Date(),
        }));
    }

    private async sendError(messageId: string, error: string): Promise<void> {
        await redisPub.publish('agent:responses', JSON.stringify({
            messageId,
            error,
            status: 'FAILED',
            timestamp: new Date(),
        }));
    }

    private async waitForResponse(messageId: string, timeout: number): Promise<AgentResponse> {
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                const wasPending = this.pendingResponses.delete(messageId);
                if (wasPending) {
                    resolve({
                        messageId,
                        status: 'FAILED',
                        error: 'Response timeout (30s) - message may still be processing in the background',
                    });
                }
            }, timeout);

            this.pendingResponses.set(messageId, (data) => {
                clearTimeout(timeoutId);
                if (data.error) {
                    resolve({
                        messageId,
                        status: 'FAILED',
                        error: data.error,
                    });
                } else {
                    resolve({
                        messageId,
                        status: 'DELIVERED',
                        response: data.response,
                    });
                }
            });
        });
    }

    private async checkCommunicationPolicy(fromAgent: any, toAgent: any): Promise<boolean> {
        if (!fromAgent) return true; // System messages allowed
        if (fromAgent.workspaceId && toAgent.workspaceId) {
            return fromAgent.workspaceId === toAgent.workspaceId;
        }
        return true;
    }

    private signMessage(envelope: MessageEnvelope): string {
        const secret = process.env.AGENT_COMM_SECRET || 'top-secret-agent-key';
        const data = `${envelope.id}:${envelope.from}:${envelope.to}:${JSON.stringify(envelope.message)}`;
        const crypto = require('crypto');
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }

    private verifySignature(envelope: MessageEnvelope): boolean {
        if (!envelope.signature) return false;
        const expected = this.signMessage({ ...envelope, signature: undefined });
        return envelope.signature === expected;
    }
}

export const agentCommunicationService = new AgentCommunicationService();
