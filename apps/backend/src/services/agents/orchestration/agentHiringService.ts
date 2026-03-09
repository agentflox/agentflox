import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { AgentDepartment, AgentRoleDefinition, AgentType } from '../types/types';
import { agentRegistryService } from './agentRegistry';
import { randomUUID } from 'crypto';

export const DEPARTMENT_ROLES: Record<AgentDepartment, AgentRoleDefinition> = {
    [AgentDepartment.EXECUTIVE]: {
        department: AgentDepartment.EXECUTIVE,
        displayName: 'Chief Executive Officer',
        defaultType: AgentType.STRATEGIST,
        description: 'Sets company vision, strategy, and resolves cross-department decisions.',
        capabilities: [
            // Strategy
            'vision:define',
            'strategy:set',
            'goals:define',
            'company:prioritize',

            // Leadership
            'decision:finalize',
            'conflict:resolve',
            'alignment:enforce',

            // Oversight
            'performance:review',
            'risk:accept',
            'investment:approve',

            // External
            'stakeholder:communicate',
            'board:update'
        ],
        systemPromptMixin:
            'You are the CEO. Think long-term, balance risk and opportunity, and make final decisions when tradeoffs exist. Optimize for company-wide success.'
    },

    [AgentDepartment.MARKETING]: {
        department: AgentDepartment.MARKETING,
        displayName: 'Head of Marketing',
        defaultType: AgentType.CONTENT_CREATOR,
        description: 'Owns brand, demand generation, messaging, and customer acquisition strategy.',
        capabilities: [
            // Strategy
            'brand:define',
            'positioning:craft',
            'go_to_market:plan',

            // Execution
            'content:write',
            'campaign:launch',
            'social:post',
            'email:sequence',
            'ads:optimize',

            // Analysis
            'market:analyze',
            'audience:segment',
            'conversion:optimize',
            'funnel:measure',

            // Collaboration
            'sales:enable',
            'product:messaging_align'
        ],
        systemPromptMixin:
            'You are the Head of Marketing. Think in terms of brand consistency, demand generation, and measurable growth. Balance creativity with performance metrics.'
    },

    [AgentDepartment.SALES]: {
        department: AgentDepartment.SALES,
        displayName: 'Head of Sales',
        defaultType: AgentType.GENERAL_ASSISTANT,
        description: 'Drives revenue through lead qualification, deal execution, and customer relationships.',
        capabilities: [
            // Revenue
            'pipeline:manage',
            'forecast:revenue',
            'quota:plan',

            // Execution
            'lead:qualify',
            'outreach:personalize',
            'pitch:create',
            'objection:handle',
            'deal:close',

            // Enablement
            'crm:update',
            'sales_playbook:create',
            'pricing:position',

            // Feedback loop
            'market:feedback_collect',
            'product:insights_share'
        ],
        systemPromptMixin:
            'You are the Head of Sales. Be persuasive, customer-focused, and revenue-driven. Optimize for deal velocity, win rate, and long-term relationships.'
    },

    [AgentDepartment.PRODUCT]: {
        department: AgentDepartment.PRODUCT,
        displayName: 'Product Manager',
        defaultType: AgentType.PROJECT_MANAGER,
        description: 'Owns product vision, roadmap, and value delivery to users.',
        capabilities: [
            // Strategy
            'vision:define',
            'roadmap:plan',
            'value:hypothesis',

            // Discovery
            'user:research',
            'problem:validate',
            'requirements:define',

            // Delivery
            'backlog:prioritize',
            'feature:spec',
            'release:coordinate',

            // Measurement
            'kpi:define',
            'feedback:analyze',
            'iteration:plan'
        ],
        systemPromptMixin:
            'You are the Product Manager. Optimize for user value and business impact. Make clear tradeoffs and communicate priorities precisely.'
    },

    [AgentDepartment.ENGINEERING]: {
        department: AgentDepartment.ENGINEERING,
        displayName: 'Engineering / DevOps Lead',
        defaultType: AgentType.CODE_GENERATOR,
        description: 'Builds, deploys, and maintains reliable, scalable systems.',
        capabilities: [
            // Development
            'code:generate',
            'code:review',
            'architecture:design',

            // DevOps
            'ci_cd:configure',
            'deployment:automate',
            'infra:provision',
            'cloud:manage',

            // Quality & Security
            'testing:implement',
            'performance:optimize',
            'security:review',
            'incident:respond',

            // Operations
            'monitoring:setup',
            'scaling:plan',
            'tech_debt:manage'
        ],
        systemPromptMixin:
            'You are the Engineering Lead. Prioritize reliability, scalability, and security. Favor maintainable solutions over shortcuts.'
    },

    [AgentDepartment.LEGAL]: {
        department: AgentDepartment.LEGAL,
        displayName: 'Legal Counsel',
        defaultType: AgentType.RESEARCHER,
        description: 'Manages legal risk, compliance, and contractual obligations.',
        capabilities: [
            // Risk & Compliance
            'risk:assess',
            'compliance:check',
            'regulation:interpret',

            // Contracts
            'contract:draft',
            'contract:review',
            'terms:negotiate',

            // Governance
            'policy:define',
            'liability:analyze',
            'ip:protect',

            // Advisory
            'legal:advise',
            'dispute:prevent'
        ],
        systemPromptMixin:
            'You are the Legal Counsel. Be conservative, precise, and risk-aware. Protect the company while enabling business execution.'
    },

    [AgentDepartment.FINANCE]: {
        department: AgentDepartment.FINANCE,
        displayName: 'Head of Finance',
        defaultType: AgentType.DATA_ANALYST,
        description: 'Controls financial health, budgeting, and strategic planning.',
        capabilities: [
            // Financial Control
            'budget:plan',
            'expense:track',
            'cashflow:manage',

            // Analysis
            'roi:calculate',
            'unit_economics:model',
            'forecast:financial',

            // Strategy
            'pricing:model',
            'investment:evaluate',
            'profitability:analyze',

            // Reporting
            'financial_report:prepare',
            'metrics:review',
            'audit:support'
        ],
        systemPromptMixin:
            'You are the Head of Finance. Think in numbers, tradeoffs, and sustainability. Optimize for long-term financial health.'
    },

    [AgentDepartment.HR]: {
        department: AgentDepartment.HR,
        displayName: 'HR Business Partner',
        defaultType: AgentType.GENERAL_ASSISTANT,
        description: 'Builds healthy teams, culture, and people processes.',
        capabilities: [
            // Talent
            'hiring:plan',
            'interview:support',
            'onboarding:design',

            // People Ops
            'performance:review',
            'feedback:facilitate',
            'conflict:mediate',

            // Culture
            'culture:define',
            'engagement:measure',
            'wellbeing:support',

            // Policy
            'policy:create',
            'policy:explain',
            'compliance:hr_check'
        ],
        systemPromptMixin:
            'You are the HR Business Partner. Balance empathy with fairness. Build scalable people systems and strong culture.'
    }
};

@Injectable()
export class AgentHiringService {
    private logger = new Logger(AgentHiringService.name);

    /**
     * Get available roles for hiring
     */
    getAvailableRoles(): AgentRoleDefinition[] {
        return Object.values(DEPARTMENT_ROLES);
    }

    /**
     * Hire an agent for a specific project
     */
    async hireAgentForProject(projectId: string, department: AgentDepartment, userId: string): Promise<any> {
        const roleDef = DEPARTMENT_ROLES[department];
        if (!roleDef) {
            throw new Error(`Invalid department: ${department}`);
        }

        // 1. Fetch Project Details (to name the agent correctly)
        // Assuming simple fetch for now
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new Error('Project not found');

        const agentName = `${roleDef.displayName} (${project.name})`;

        // 2. Create the Agent in DB
        const agent = await prisma.aiAgent.create({
            data: {
                name: agentName,
                agentType: roleDef.defaultType,
                description: roleDef.description,
                status: 'ACTIVE',
                capabilities: roleDef.capabilities,
                workspaceId: project.workspaceId,
                isActive: true, // Ensuring it's active
                metadata: {
                    projectId: projectId,
                    department: department,
                    hiredBy: userId,
                    systemPromptMixin: roleDef.systemPromptMixin
                }
            }
        });

        // 3. Register in Redis Registry
        await agentRegistryService.registerAgent({
            id: agent.id,
            name: agent.name,
            type: agent.agentType,
            capabilities: agent.capabilities as string[],
            status: agent.status,
            workspaceId: agent.workspaceId,
            metadata: agent.metadata as any
        });

        // 4. (Optional) Post a welcome message to the project
        // This would require utilizing the Chat/Message service.
        // user: "system" or the agent itself.
        // For now, we just return the agent.

        this.logger.log(`Hired agent ${agent.id} (${department}) for project ${projectId}`);

        return agent;
    }

    /**
     * List agents hired for a project
     */
    async getProjectAgents(projectId: string): Promise<any[]> {
        // We can filter by metadata in code logic if direct JSON query isn't easy with this Prisma version,
        // OR use the Registry if performant.
        // For reliability, let's query DB.

        // Note: Prisma JSON filtering syntax might vary.
        // Using a raw-ish approach or fetching all agents for workspace and filtering in memory if strict necessary.
        // But assuming we can just findMany by workspaceId and filter.

        // Actually, we should probably fetch the workspaceId from the project first.
        const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
        if (!project) return [];

        const agents = await prisma.aiAgent.findMany({
            where: {
                workspaceId: project.workspaceId,
                isActive: true
            }
        });

        // Filter in memory for metadata.projectId === projectId
        return agents.filter((a: any) => a.metadata?.projectId === projectId);
    }
}

export const agentHiringService = new AgentHiringService();
