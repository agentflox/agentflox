import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { agentExecutionService, AgentExecutionService } from '../orchestration/agentExecutionService';
import { ConversationType, MessageRole } from '@agentflox/database';

@Injectable()
export class AgentSimulationService {
    private logger = new Logger(AgentSimulationService.name);

    constructor() { }

    /**
     * Start a new War Room Simulation
     */
    async startSimulation(projectId: string, userId: string, topic: string, agentIds: string[], mode: 'ROUND_ROBIN' | 'DYNAMIC' = 'ROUND_ROBIN') {
        // 1. Validate agents belong to workspace/project
        // Skipped for MVP speed, assuming UI handles valid selection.

        // 2. Create Conversation
        const conversation = await prisma.aiConversation.create({
            data: {
                userId,
                projectId,
                conversationType: 'WAR_ROOM',
                metadata: {
                    topic,
                    mode: mode,
                    status: 'ACTIVE',
                    agentIds,
                    round: 0,
                    turnIndex: 0
                }
            }
        });

        // 3. Add system message setting the stage
        await prisma.aiMessage.create({
            data: {
                conversationId: conversation.id,
                role: 'SYSTEM',
                content: `War Room Simulation Started.\nTopic: ${topic}\nMode: ${mode}\nParticipants: ${agentIds.length} Agents.`
            }
        });

        return conversation;
    }

    /**
     * Advance the simulation by one step (one agent speaks)
     */
    async stepSimulation(simulationId: string, userId: string) {
        const conversation = await prisma.aiConversation.findUnique({
            where: { id: simulationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        });

        if (!conversation) throw new Error('Simulation not found');
        const metadata = conversation.metadata as Record<string, any>;

        if (metadata.status !== 'ACTIVE') throw new Error('Simulation is not active');

        const agentIds = metadata.agentIds as string[];
        const turnIndex = metadata.turnIndex as number || 0;

        let agentId = "";

        if (metadata.mode === 'DYNAMIC') {
            // Fetch all agents to pass to router
            const agents = await prisma.aiAgent.findMany({
                where: { id: { in: agentIds } }
            });

            agentId = await this.determineNextSpeaker(conversation, agents, userId);

            if (agentId === 'STOP') {
                await prisma.aiConversation.update({
                    where: { id: simulationId },
                    data: { metadata: { ...metadata, status: 'COMPLETED' } }
                });

                return prisma.aiMessage.create({
                    data: {
                        conversationId: simulationId,
                        role: 'SYSTEM',
                        content: 'Consensus reached. Simulation concluded.',
                    }
                });
            }
        } else {
            // Round robin selection
            agentId = agentIds[turnIndex % agentIds.length];
        }

        // Fetch Agent Details (if not already fetched)
        const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
        if (!agent) throw new Error(`Agent ${agentId} not found`);

        this.logger.log(`Simulation ${simulationId}: Agent ${agent.name} (${agentId}) turn to speak.`);

        // Construct Prompt
        // Filter messages to get context
        const history = conversation.messages.map(m => {
            // map role to readable
            const speaker = m.metadata && (m.metadata as any).agentName ? (m.metadata as any).agentName : m.role;
            return `${speaker}: ${m.content}`;
        }).join('\n');

        const prompt = `
You are participating in a War Room Simulation.
Topic: ${metadata.topic}
Your Role: ${agent.name}
Description: ${agent.description}
Capabilities: ${agent.capabilities}
System Instruction: ${agent.systemPrompt}

Goal: Provide critical insight, debate with others, and help reach a strategic conclusion. 
Do not just agree; offer a unique perspective based on your department/role.
Keep your response concise (under 3 sentences).

Recent Conversation History:
${history}

It is your turn to speak. React to the previous points and advance the discussion.
`;

        // Execute Agent
        // We hijack the 'message' param of executeAgent to pass our prompt.
        try {
            const result = await agentExecutionService.executeAgent({
                agentId: agent.id,
                userId: userId,
                inputData: { message: prompt },
                executionContext: { conversationId: simulationId, isSimulation: true }
            });

            const responseText = result.response || "I have no comment at this time.";

            // Save Message
            const message = await prisma.aiMessage.create({
                data: {
                    conversationId: simulationId,
                    role: 'ASSISTANT',
                    content: responseText,
                    metadata: { agentId: agent.id, agentName: agent.name }
                }
            });

            // Update Turn
            await prisma.aiConversation.update({
                where: { id: simulationId },
                data: {
                    metadata: {
                        ...metadata,
                        turnIndex: turnIndex + 1
                    }
                }
            });

            return message;

        } catch (error) {
            this.logger.error(`Simulation step failed for agent ${agentId}`, error);
            throw error;
        }
    }

    private async determineNextSpeaker(conversation: any, agents: any[], userId: string): Promise<string> {
        const moderator = agents[0]; // Simple moderator selection

        const history = conversation.messages.map((m: any) => {
            const speaker = m.metadata && (m.metadata as any).agentName ? (m.metadata as any).agentName : m.role;
            return `${speaker}: ${m.content}`;
        }).slice(-10).join('\n');

        const agentList = agents.map(a => `- ${a.name} (ID: ${a.id}): ${a.description}`).join('\n');

        const prompt = `
You are the Moderator of a War Room Simulation.
Goal: Decide who should speak next to advance the conversation effectively or if the simulation should stop.
Participants:
${agentList}

Recent History:
${history}

Instructions:
1. Analyze the conversation.
2. Select the next speaker who can answer a pending question or provide a needed perspective.
3. If the conversation has reached a natural conclusion or consensus, return "STOP".
4. You MUST return ONLY the UUID of the agent, or "STOP". Do not add any other text.
`;

        try {
            // We use a routing context
            const result = await agentExecutionService.executeAgent({
                agentId: moderator.id,
                userId: userId,
                inputData: { message: prompt },
                executionContext: { isSimulation: true, isRouting: true }
            });

            let next = result.response?.trim();
            // Clean up any extra chars
            if (next) {
                // remove quotes if present
                next = next.replace(/['"]/g, '');
                if (next.includes('STOP')) return 'STOP';

                // Find agent with this ID
                const found = agents.find(a => a.id === next || (next && next.includes(a.id)));
                if (found) return found.id;
            }

            // Fallback to random if routing fails
            const random = agents[Math.floor(Math.random() * agents.length)];
            return random.id;
        } catch (e) {
            this.logger.error('Routing failed', e);
            // Fallback
            return agents[0].id;
        }
    }

    /**
     * Get simulation state and history
     */
    async getSimulation(simulationId: string) {
        return prisma.aiConversation.findUnique({
            where: { id: simulationId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                project: true
            }
        });
    }
    async summarizeSimulation(simulationId: string, userId: string) {
        const conversation = await prisma.aiConversation.findUnique({
            where: { id: simulationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        });

        if (!conversation) throw new Error('Simulation not found');
        const metadata = conversation.metadata as Record<string, any>;
        const agentIds = metadata.agentIds as string[];

        // Select a summarizer (Try to find Product Manager, else first agent)
        let summarizerId = agentIds[0];

        // Try to find a PM
        const agents = await prisma.aiAgent.findMany({
            where: { id: { in: agentIds } }
        });

        const pm = agents.find(a => (a.name && a.name.includes('Product')) || (a.description && a.description.includes('Product')));
        if (pm) summarizerId = pm.id;

        // Construct context
        const history = conversation.messages.map(m => {
            const speaker = m.metadata && (m.metadata as any).agentName ? (m.metadata as any).agentName : m.role;
            return `${speaker}: ${m.content}`;
        }).join('\n');

        const prompt = `
You are the moderator of this War Room Simulation.
Topic: ${metadata.topic}

Conversation History:
${history}

Task: Provide a concise executive summary of the debate so far. Highlight key arguments, ensuring you capture different perspectives, and state any emerging consensus or conflict.
Format: Bullet points followed by a "Conclusion" paragraph.
`;

        try {
            const result = await agentExecutionService.executeAgent({
                agentId: summarizerId,
                userId: userId,
                inputData: { message: prompt },
                executionContext: { conversationId: simulationId, isSimulation: true, isSummary: true }
            });

            return {
                summary: result.response,
                summarizerId
            };

        } catch (error) {
            this.logger.error(`Simulation summary failed`, error);
            throw error;
        }
    }
}

export const agentSimulationService = new AgentSimulationService();
