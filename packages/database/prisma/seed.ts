import { PrismaClient, PlanType, BillingPeriod } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Check if plans already exist
    const existingPlans = await prisma.plan.count();
    if (existingPlans > 0) {
        console.log('⚠️  Plans already exist. Skipping seed.');
        return;
    }

    // Create Free Plan
    const freePlan = await prisma.plan.create({
        data: {
            name: 'FREE',
            displayName: 'Free Plan',
            description: 'Perfect for getting started',
            slug: 'free',
            planType: PlanType.FREE,
            billingPeriod: BillingPeriod.MONTHLY,
            price: 0,
            currency: 'USD',
            trialDays: 0,
            isActive: true,
            isFeatured: false,
            sortOrder: 1,
            feature: {
                create: {
                    maxProjects: 3,
                    maxTeams: 1,
                    maxProposals: 5,
                    maxRequests: 100,
                    maxCredits: 1000,
                    maxTokens: 10000,
                    maxWorkspaces: 1,
                    maxMembers: 3,
                    maxStorage: 1024, // 1GB in MB
                    maxApiCalls: 100,
                    hasAdvancedAnalytics: false,
                    hasPrioritySupport: false,
                    hasCustomBranding: false,
                    hasApiAccess: false,
                    hasWebhooks: false,
                    hasSso: false,
                    hasAuditLogs: false,
                    hasCustomRoles: false,
                    hasAdvancedSecurity: false,
                    hasDataExport: false,
                    hasWhiteLabel: false,
                    hasDedicatedSupport: false,
                    hasSla: false,
                    hasCustomIntegrations: false,
                }
            }
        }
    });

    // Create Pro Plan
    const proPlan = await prisma.plan.create({
        data: {
            name: 'PRO',
            displayName: 'Pro Plan',
            description: 'For growing teams and businesses',
            slug: 'pro',
            planType: PlanType.PAID,
            billingPeriod: BillingPeriod.MONTHLY,
            price: 29.99,
            currency: 'USD',
            trialDays: 14,
            isActive: true,
            isFeatured: true,
            sortOrder: 2,
            feature: {
                create: {
                    maxProjects: 50,
                    maxTeams: 10,
                    maxProposals: 100,
                    maxRequests: 10000,
                    maxCredits: 50000,
                    maxTokens: 500000,
                    maxWorkspaces: 5,
                    maxMembers: 25,
                    maxStorage: 51200, // 50GB in MB
                    maxApiCalls: 10000,
                    hasAdvancedAnalytics: true,
                    hasPrioritySupport: true,
                    hasCustomBranding: true,
                    hasApiAccess: true,
                    hasWebhooks: true,
                    hasSso: false,
                    hasAuditLogs: true,
                    hasCustomRoles: true,
                    hasAdvancedSecurity: true,
                    hasDataExport: true,
                    hasWhiteLabel: false,
                    hasDedicatedSupport: false,
                    hasSla: false,
                    hasCustomIntegrations: false,
                }
            }
        }
    });

    // Create Enterprise Plan
    const enterprisePlan = await prisma.plan.create({
        data: {
            name: 'ENTERPRISE',
            displayName: 'Enterprise Plan',
            description: 'For large organizations with advanced needs',
            slug: 'enterprise',
            planType: PlanType.PAID,
            billingPeriod: BillingPeriod.MONTHLY,
            price: 99.99,
            currency: 'USD',
            trialDays: 30,
            isActive: true,
            isFeatured: true,
            sortOrder: 3,
            feature: {
                create: {
                    maxProjects: -1, // Unlimited
                    maxTeams: -1,
                    maxProposals: -1,
                    maxRequests: -1,
                    maxCredits: -1,
                    maxTokens: -1,
                    maxWorkspaces: -1,
                    maxMembers: -1,
                    maxStorage: -1,
                    maxApiCalls: -1,
                    hasAdvancedAnalytics: true,
                    hasPrioritySupport: true,
                    hasCustomBranding: true,
                    hasApiAccess: true,
                    hasWebhooks: true,
                    hasSso: true,
                    hasAuditLogs: true,
                    hasCustomRoles: true,
                    hasAdvancedSecurity: true,
                    hasDataExport: true,
                    hasWhiteLabel: true,
                    hasDedicatedSupport: true,
                    hasSla: true,
                    hasCustomIntegrations: true,
                }
            }
        }
    });

    console.log('✅ Created plans:');
    console.log(`  - ${freePlan.displayName} (${freePlan.name})`);
    console.log(`  - ${proPlan.displayName} (${proPlan.name})`);
    console.log(`  - ${enterprisePlan.displayName} (${enterprisePlan.name})`);
    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
