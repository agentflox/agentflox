import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe/server';
import { DateTime } from 'luxon';

export class ReconciliationManager {
    /**
     * Reconcile payments for a given period.
     * Compares the total amount of successful payments in the local database
     * against the total amount of successful PaymentIntents in Stripe.
     */
    static async reconcilePeriod(
        startDate: Date,
        endDate: Date
    ): Promise<{
        localTotal: number;
        stripeTotal: number;
        discrepancy: number;
        matches: boolean;
        details: {
            localCount: number;
            stripeCount: number;
        };
    }> {
        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();

        // 1. Calculate Local Total
        const localPayments = await prisma.payment.findMany({
            where: {
                status: 'SUCCEEDED',
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                paymentGateway: 'STRIPE', // Only check Stripe payments
            },
            select: {
                amount: true,
            },
        });

        const localTotal = localPayments.reduce((sum, p) => sum + p.amount, 0);

        // 2. Calculate Stripe Total
        // convert dates to unix timestamp for Stripe
        const startUnix = Math.floor(startDate.getTime() / 1000);
        const endUnix = Math.floor(endDate.getTime() / 1000);

        let stripeTotalCents = 0;
        let stripeCount = 0;
        let hasMore = true;
        let lastId: string | undefined = undefined;

        while (hasMore) {
            const intents = await stripe.paymentIntents.list({
                created: {
                    gte: startUnix,
                    lte: endUnix,
                },
                limit: 100,
                starting_after: lastId,
                // We might want to filter by status 'succeeded' but list returns all. 
                // We filter manually or use search if available (search is specialized).
                // List is safer.
            });

            for (const intent of intents.data) {
                if (intent.status === 'succeeded') {
                    stripeTotalCents += intent.amount_received; // received amount is what we actually got
                    stripeCount++;
                }
            }

            if (intents.has_more) {
                lastId = intents.data[intents.data.length - 1].id;
            } else {
                hasMore = false;
            }
        }

        const stripeTotal = stripeTotalCents / 100; // Convert cents to major units (assuming local is major)

        // 3. Compare
        const discrepancy = Math.abs(localTotal - stripeTotal);
        const matches = discrepancy < 0.01; // Allow small float drift

        return {
            localTotal,
            stripeTotal,
            discrepancy,
            matches,
            details: {
                localCount: localPayments.length,
                stripeCount,
            },
        };
    }

    static async runDailyReconciliation() {
        // Run for yesterday
        const now = DateTime.now();
        const yesterdayStart = now.minus({ days: 1 }).startOf('day').toJSDate();
        const yesterdayEnd = now.minus({ days: 1 }).endOf('day').toJSDate();

        console.log(`Starting reconciliation for ${yesterdayStart.toISOString()} - ${yesterdayEnd.toISOString()}`);

        try {
            const result = await this.reconcilePeriod(yesterdayStart, yesterdayEnd);

            console.log('Reconciliation Result:', result);

            if (!result.matches) {
                console.error('🚨 BILLING DISCREPANCY DETECTED 🚨');
                console.error(`Local: ${result.localTotal}, Stripe: ${result.stripeTotal}, Diff: ${result.discrepancy}`);
                // TODO: Send alert (email, slack, etc.)
            } else {
                console.log('✅ Billing reconciliation passed.');
            }

            // Log to DB if needed
            await prisma.webhookLog.create({
                data: {
                    topic: 'reconciliation.daily',
                    userId: 'system',
                    payload: result as any,
                }
            });

        } catch (error) {
            console.error('Reconciliation failed:', error);
        }
    }
}
