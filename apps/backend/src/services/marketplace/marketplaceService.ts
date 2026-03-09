import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export interface MarketplaceServiceItem {
    id: string;
    title: string;
    description: string;
    provider: string; // 'AI Agent' or 'Human Agency'
    price: number;
    currency: string;
    turnaroundTime: string;
    category: 'LEGAL' | 'DESIGN' | 'ENGINEERING' | 'MARKETING' | 'RESEARCH';
    icon: string;
}

const MOCK_SERVICES: MarketplaceServiceItem[] = [
    {
        id: 'svc-logo-design',
        title: 'Premium Logo Design',
        description: 'Get a professional, stunning logo for your venture in 24 hours. Delivered by our top-tier AI Design Corps.',
        provider: 'AI Design Corps',
        price: 49,
        currency: 'USD',
        turnaroundTime: '24h',
        category: 'DESIGN',
        icon: 'PenTool'
    },
    {
        id: 'svc-legal-inc',
        title: 'Delaware C-Corp Incorporation',
        description: 'Full automated incorporation handling, including bylaws and initial board resolutions.',
        provider: 'Automated Legal',
        price: 299,
        currency: 'USD',
        turnaroundTime: '48h',
        category: 'LEGAL',
        icon: 'Scale'
    },
    {
        id: 'svc-smart-contract-audit',
        title: 'Smart Contract Audit',
        description: 'Comprehensive security audit for your Solidity contracts. detailed report included.',
        provider: 'SecureChain AI',
        price: 199,
        currency: 'USD',
        turnaroundTime: '4h',
        category: 'ENGINEERING',
        icon: 'ShieldCheck'
    },
    {
        id: 'svc-market-research',
        title: 'Deep Market Research Report',
        description: 'Analysis of competitors, total addressable market (TAM), and growth trends.',
        provider: 'InsightBot Pro',
        price: 99,
        currency: 'USD',
        turnaroundTime: '1h',
        category: 'RESEARCH',
        icon: 'Search'
    },
    {
        id: 'svc-pitch-deck-review',
        title: 'VC Pitch Deck Review',
        description: 'Feedback from a simulated panel of Tier-1 VCs to refine your pitch.',
        provider: 'VentureSim',
        price: 79,
        currency: 'USD',
        turnaroundTime: '2h',
        category: 'MARKETING',
        icon: 'Presentation'
    }
];

@Injectable()
export class MarketplaceService {
    private logger = new Logger(MarketplaceService.name);

    async getServices() {
        // Fallback to caching or DB
        // For now, let's sync our "MOCK" services to DB if empty, ensuring we have data
        const count = await prisma.marketplaceService.count();
        if (count === 0) {
            await prisma.marketplaceService.createMany({
                data: MOCK_SERVICES.map(s => ({
                    title: s.title,
                    description: s.description,
                    provider: s.provider,
                    price: s.price,
                    currency: s.currency,
                    category: s.category,
                    icon: s.icon,
                    isActive: true
                }))
            });
        }

        return prisma.marketplaceService.findMany({
            where: { isActive: true }
        });
    }

    async placeOrder(userId: string, projectId: string, serviceId: string) {
        const service = await prisma.marketplaceService.findUnique({ where: { id: serviceId } });
        if (!service) throw new Error('Service not found');

        // Check if project exists
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new Error('Project not found');

        this.logger.log(`User ${userId} placed order for ${service.title} in project ${projectId}`);

        // Create Order Record
        const order = await prisma.marketplaceOrder.create({
            data: {
                serviceId: service.id,
                projectId,
                buyerId: userId,
                amount: service.price,
                status: 'PENDING'
            }
        });

        // Simulate Payment Processing (In prod, this calls Stripe)
        await this.processPayment(order.id);

        // Create Task
        const task = await prisma.task.create({
            data: {
                title: `[Order] ${service.title}`,
                description: `Marketplace Order: ${order.id}\nProvider: ${service.provider}\nStatus: PAID`,
                priority: 'HIGH',
                projectId: projectId,
                createdBy: userId,
            }
        });

        return {
            orderId: order.id,
            taskId: task.id,
            status: 'CONFIRMED',
            message: `Order confirmed. Task created.`
        };
    }

    private async processPayment(orderId: string) {
        // Simulate external API call
        await new Promise(r => setTimeout(r, 500));
        await prisma.marketplaceOrder.update({
            where: { id: orderId },
            data: { status: 'PAID' }
        });
    }
}

export const marketplaceService = new MarketplaceService();
