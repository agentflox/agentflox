import { Injectable, Logger } from '@nestjs/common';
import { agentExecutionService } from '../agents/orchestration/agentExecutionService';

type CapTableEntry = {
    id: string;
    projectId: string;
    holderName: string;
    type: string;
    shares: number;
    class: string;
    percentage?: string;
};

type InvestorUpdate = {
    id: string;
    projectId: string;
    month: string;
    content: string;
    status: 'DRAFT' | 'SENT';
    sentAt?: Date;
};

@Injectable()
export class GovernanceService {
    private logger = new Logger(GovernanceService.name);
    private capTables = new Map<string, CapTableEntry[]>();
    private investorUpdates = new Map<string, InvestorUpdate>();

    async getCapTable(projectId: string) {
        if (!this.capTables.has(projectId)) {
            this.capTables.set(projectId, [
                { id: '1', projectId, holderName: 'Founders', type: 'FOUNDER', shares: 8000000, class: 'COMMON' },
                { id: '2', projectId, holderName: 'Option Pool', type: 'POOL', shares: 1000000, class: 'COMMON' },
                { id: '3', projectId, holderName: 'Seed Investors', type: 'INVESTOR', shares: 1000000, class: 'PREFERRED' },
            ]);
        }

        const entries = this.capTables.get(projectId) ?? [];
        const totalShares = entries.reduce((sum: number, e: CapTableEntry) => sum + e.shares, 0);

        return entries.map((e: CapTableEntry) => ({
            ...e,
            percentage: ((e.shares / totalShares) * 100).toFixed(2),
        }));
    }

    async generateSAFE(projectId: string, _userId: string, type: 'VALUATION_CAP' | 'DISCOUNT', cap?: number, discount?: number) {
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

        return {
            filename,
            content: template,
            message: 'Document generated successfully.',
        };
    }

    async draftInvestorUpdate(projectId: string, userId: string) {
        const result = await agentExecutionService.executeAgent({
            agentId: 'ir-agent',
            userId,
            inputData: { message: 'Draft a monthly investor update based on recent project activity.' },
            executionContext: { isSimulation: false },
        });

        const draft: InvestorUpdate = {
            id: `update-${Date.now()}`,
            projectId,
            month: new Date().toISOString().slice(0, 7),
            content: result.response || 'No update generated.',
            status: 'DRAFT',
        };

        this.investorUpdates.set(draft.id, draft);
        return draft;
    }

    async sendUpdate(updateId: string) {
        const existing = this.investorUpdates.get(updateId);
        if (!existing) {
            throw new Error('Investor update not found');
        }

        const updated: InvestorUpdate = {
            ...existing,
            status: 'SENT',
            sentAt: new Date(),
        };
        this.investorUpdates.set(updateId, updated);
        return updated;
    }
}

export const governanceService = new GovernanceService();
