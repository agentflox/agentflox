import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { agentExecutionService } from '../agents/orchestration/agentExecutionService';

@Injectable()
export class GovernanceService {
    private logger = new Logger(GovernanceService.name);

    async getCapTable(projectId: string) {
        // If empty, seed default
        const count = await prisma.capTableEntry.count({ where: { projectId } });
        if (count === 0) {
            await prisma.capTableEntry.createMany({
                data: [
                    { projectId, holderName: 'Founders', type: 'FOUNDER', shares: 8000000, class: 'COMMON' },
                    { projectId, holderName: 'Option Pool', type: 'POOL', shares: 1000000, class: 'COMMON' },
                    { projectId, holderName: 'Seed Investors', type: 'INVESTOR', shares: 1000000, class: 'PREFERRED' }
                ]
            });
        }

        const entries = await prisma.capTableEntry.findMany({ where: { projectId } });
        const totalShares = entries.reduce((sum, e) => sum + e.shares, 0);

        return entries.map(e => ({
            ...e,
            percentage: ((e.shares / totalShares) * 100).toFixed(2)
        }));
    }

    async generateSAFE(projectId: string, userId: string, type: 'VALUATION_CAP' | 'DISCOUNT', cap?: number, discount?: number) {
        // In a real app, use a PDF generation library like pdfkit or react-pdf
        // Here we simulate document generation by creating an Attachment record (assuming text content)

        const template = `
SIMPLE AGREEMENT FOR FUTURE EQUITY (SAFE)

This SAFE is one of a series of such instruments...
Type: ${type}
Valuation Cap: ${cap ? `$${cap.toLocaleString()}` : 'N/A'}
Discount Rate: ${discount ? `${discount}%` : 'N/A'}

Date: ${new Date().toLocaleDateString()}
Company (Project ID): ${projectId}

[Signature Placeholder]
`;

        const filename = `SAFE_${type}_${Date.now()}.txt`;

        // This is a simplification. Usually we upload to S3 and store the URL.
        // We will just return the content for the frontend to download.
        return {
            filename,
            content: template,
            message: 'Document generated successfully.'
        };
    }

    async draftInvestorUpdate(projectId: string, userId: string) {
        // 1. Gather Context
        const recentTasks = await prisma.task.findMany({
            where: {
                projectId,
                updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            },
            take: 10
        });

        // 2. Use Agent to Draft
        const taskSummary = recentTasks.map(t => `- ${t.title}`).join('\n');

        const prompt = `
You are an Investor Relations Agent.
Draft a monthly investor update for this project.
Recent Achievements:
${taskSummary}

Format:
- Highlights
- Key Metrics (Invent plausible numbers based on achievements)
- Asks
        `;

        const result = await agentExecutionService.executeAgent({
            agentId: 'ir-agent', // This would need to be a real agent ID, but we can rely on default routing or create one ad-hoc
            userId,
            inputData: { message: prompt },
            executionContext: { isSimulation: false } // It's a real draft
        });

        const draft = await prisma.investorUpdate.create({
            data: {
                projectId,
                month: new Date().toISOString().slice(0, 7), // YYYY-MM
                content: result.response || "No update generated.",
                status: 'DRAFT'
            }
        });

        return draft;
    }

    async sendUpdate(updateId: string) {
        return prisma.investorUpdate.update({
            where: { id: updateId },
            data: {
                status: 'SENT',
                sentAt: new Date()
            }
        });
    }
}

export const governanceService = new GovernanceService();
