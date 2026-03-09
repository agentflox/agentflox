import { prisma } from '@/lib/prisma';
import { PlanType } from '@agentflox/database/src/generated/prisma';

export class PlanManager {
    private constructor() { }

    static async createPlan(data: any): Promise<any> {
        try {
            const plan = await prisma.plan.upsert({
                where: { name: data.name },
                update: {
                    description: data.description,
                    price: data.price,
                    trialDays: data.trialDays,
                    billingPeriod: data.billingPeriod,
                    isActive: data.isActive ?? false,
                },
                create: {
                    name: data.name,
                    displayName: data.displayName ?? data.name,
                    slug: data.slug ?? data.name.toLowerCase().replace(/\s+/g, '-'),
                    planType: data.planType,
                    billingPeriod: data.billingPeriod,
                    description: data.description,
                    price: data.price,
                    trialDays: data.trialDays,
                    isActive: data.isActive ?? false,
                    currency: data.currency || 'USD',
                },
                include: { feature: true, subscriptions: true }
            });

            if (data.feature) {
                await prisma.feature.upsert({
                    where: { planId: plan.id },
                    update: {
                        maxCredits: data.feature.maxCredits,
                        maxProjects: (data.feature as any).maxProjects ?? (data.feature as any).maxProject ?? 0,
                        maxTeams: data.feature.maxTeams,
                        maxRequests: data.feature.maxRequests,
                        maxProposals: (data.feature as any).maxProposals ?? 0,
                    },
                    create: {
                        name: `${plan.name}_Feature`,
                        description: Array.isArray((data.feature as any).description) ? (data.feature as any).description : [],
                        maxCredits: data.feature.maxCredits,
                        maxProjects: (data.feature as any).maxProjects ?? (data.feature as any).maxProject ?? 0,
                        maxTeams: data.feature.maxTeams,
                        maxRequests: data.feature.maxRequests,
                        maxProposals: (data.feature as any).maxProposals ?? 0,
                        planId: plan.id,
                    }
                });
            }

            return await prisma.plan.findUniqueOrThrow({
                where: { id: plan.id },
                include: {
                    feature: true,
                    subscriptions: true,
                    promotions: { include: { promotion: true } },
                    discounts: { include: { discount: true } },
                }
            });
        } catch (error) {
            console.error("Plan creation error:", error);
            throw new Error('Failed to create/update plan');
        }
    }

    static async getPlan(planId: string) {
        try {
            const plan = await prisma.plan.findUnique({
                where: { id: planId },
                include: {
                    feature: true,
                    promotions: {
                        include: {
                            promotion: true,
                        },
                    },
                    discounts: {
                        include: {
                            discount: true,
                        },
                    },
                    subscriptions: {
                        include: {
                            user: true,
                            payments: true
                        }
                    }
                }
            });
            if (!plan) {
                throw new Error('Plan not found');
            }
            return plan;
        } catch (error) {
            console.error("Plan fetch error:", error);
            throw new Error('Failed to fetch plan');
        }
    }

    static async updatePlan(
        planId: string,
        data: any
    ): Promise<any> {
        try {
            const existingPlan = await prisma.plan.findUnique({
                where: { id: planId }
            });
            if (!existingPlan) {
                throw new Error('Plan not found');
            }

            if (existingPlan.name === PlanType.FREE &&
                data.name &&
                data.name !== PlanType.FREE) {
                throw new Error('Cannot modify the name of the FREE plan');
            }

            const updateData: any = {
                ...(data.name && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.price !== undefined && { price: data.price }),
                ...(data.billingPeriod && { billingPeriod: data.billingPeriod }),
                ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),

            };

            if (data.feature) {
                updateData.feature = {
                    upsert: {
                        where: { planId: existingPlan.id },
                        update: {
                            maxCredits: data.feature.maxCredits,
                            maxProjects: (data.feature as any).maxProjects ?? (data.feature as any).maxProject ?? 0,
                            maxTeams: data.feature.maxTeams,
                            maxRequests: data.feature.maxRequests,
                            maxProposals: (data.feature as any).maxProposals ?? 0,
                        },
                        create: {
                            maxCredits: data.feature.maxCredits,
                            maxProjects: (data.feature as any).maxProjects ?? (data.feature as any).maxProject ?? 0,
                            maxTeams: data.feature.maxTeams,
                            maxRequests: data.feature.maxRequests,
                            maxProposals: (data.feature as any).maxProposals ?? 0,
                        }
                    }
                };
            }

            return await prisma.plan.update({
                where: { id: existingPlan.id },
                data: updateData,
                include: {
                    feature: true,
                    subscriptions: {
                        include: {
                            user: true,
                            payments: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Plan update error:", error);
            throw new Error(error instanceof Error ? error.message : 'Failed to update plan');
        }
    }

    static async getPlanByName(name: string) {
        try {
            return await prisma.plan.findUnique({
                where: { name },
                include: {
                    feature: true,
                    subscriptions: {
                        include: {
                            user: true,
                            usage: true
                        }
                    },
                    promotions: {
                        include: {
                            promotion: true,
                        },
                    },
                    discounts: {
                        include: {
                            discount: true,
                        },
                    },
                },
            });
        } catch (error) {
            console.error("Plan fetch by name error:", error);
            throw new Error("Failed to fetch plan by name");
        }
    }

    static async deletePlan(planId: string) {
        try {
            const plan = await this.getPlan(planId);
            if (!plan) {
                throw new Error('Plan not found');
            }

            if (plan.name === PlanType.FREE) {
                throw new Error('Cannot delete the FREE plan as it is a default plan');
            }

            if (plan.subscriptions.length > 0) {
                throw new Error('Cannot delete plan with active subscriptions');
            }

            await prisma.feature.deleteMany({
                where: { planId }
            });

            await prisma.plan.delete({
                where: { id: planId }
            });

            return true;
        } catch (error) {
            console.error("Plan deletion error:", error);
            throw new Error(error instanceof Error ? error.message : 'Failed to delete plan');
        }
    }

    static async getAllPlans() {
        try {
            return await prisma.plan.findMany({
                include: {
                    feature: true,
                    promotions: {
                        include: {
                            promotion: true,
                        },
                    },
                    discounts: {
                        include: {
                            discount: true,
                        },
                    },
                    subscriptions: {
                        include: {
                            user: true,
                            usage: true
                        }
                    }
                },
                orderBy: { price: 'asc' }
            });
        } catch (error) {
            console.error("Plans fetch error:", error);
            throw new Error('Failed to fetch plans');
        }
    }
}
