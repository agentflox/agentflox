import { prisma } from '@/lib/prisma';
import { PaymentStatus, SubscriptionStatus } from '@agentflox/database';
import { SubscriptionManager } from '@/services/billing/managers/subscription.manager';
import { CreditManager } from '@/services/billing/managers/credit.manager';
import { PAYMENT_METHOD, PAYMENT_GATEWAY } from '@/services/billing/types';
import { stripe } from '@/lib/stripe/server';
import { DateTime } from 'luxon';

const MAX_RETRY_ATTEMPTS = 3;
const WEBHOOK_PROCESSING_TIMEOUT = 30000; // 30 seconds

export class StripeWebhookManager {
  private constructor() { }

  /**
   * Verify Stripe webhook signature
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): any | null {
    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return null;
    }
  }

  /**
   * Log webhook event
   */
  static async log(event: any): Promise<void> {
    try {
      const userId = this.extractUserId(event);
      await prisma.webhookLog.create({
        data: {
          topic: event.type,
          userId: userId || 'unknown',
          payload: event as any
        }
      });
    } catch (error) {
      console.error('Failed to log webhook:', error);
      // Don't throw - logging failure shouldn't block webhook processing
    }
  }

  /**
   * Queue webhook for processing
   */
  static async queueWebhook(event: any): Promise<void> {
    try {
      const userId = this.extractUserId(event);
      await prisma.webhookQueue.create({
        data: {
          topic: event.type,
          userId: userId || 'unknown',
          payload: event as any,
          status: 'pending',
          attempts: 0
        }
      });
    } catch (error) {
      console.error('Failed to queue webhook:', error);
      throw error;
    }
  }

  /**
   * Process webhook event with proper error handling and status updates
   */
  static async processWebhook(event: any): Promise<void> {
    let webhookQueueEntry: Awaited<ReturnType<typeof prisma.webhookQueue.findFirst>> = null;
    let processingError: Error | null = null;

    try {
      // Check for duplicate events first
      const isDuplicate = await this.isDuplicate(event);
      if (isDuplicate) {
        console.log(`Duplicate Stripe event detected, skipping: ${event.type} ${event.id}`);
        return;
      }

      // Find the webhook queue entry
      webhookQueueEntry = await prisma.webhookQueue.findFirst({
        where: {
          topic: event.type,
          payload: {
            path: ['id'],
            equals: event.id
          } as any
        }
      });

      // Process the webhook with timeout protection
      await Promise.race([
        this.handleWebhookEvent(event),
        this.createTimeout(WEBHOOK_PROCESSING_TIMEOUT)
      ]);

      // Mark as processed on success
      if (webhookQueueEntry) {
        await prisma.webhookQueue.update({
          where: { id: webhookQueueEntry.id },
          data: {
            status: 'processed',
            processedAt: new Date(),
            error: null
          }
        });
      }
    } catch (error: any) {
      processingError = error;
      console.error(`Error processing Stripe webhook ${event.type}:`, error);

      // Update webhook queue with error information
      if (webhookQueueEntry) {
        const newAttempts = webhookQueueEntry.attempts + 1;
        const shouldRetry = newAttempts < MAX_RETRY_ATTEMPTS;

        await prisma.webhookQueue.update({
          where: { id: webhookQueueEntry.id },
          data: {
            attempts: newAttempts,
            error: error.message || 'Unknown error',
            status: shouldRetry ? 'pending' : 'failed',
            ...(shouldRetry ? {} : { processedAt: new Date() })
          }
        });

        if (!shouldRetry) {
          console.error(
            `Stripe webhook ${event.type} failed after ${MAX_RETRY_ATTEMPTS} attempts:`,
            error
          );
          // TODO: Send alert to monitoring system (e.g., Sentry, DataDog)
        }
      }

      // Re-throw to signal failure to the caller
      throw error;
    }
  }

  /**
   * Handle webhook event routing
   */
  private static async handleWebhookEvent(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        setTimeout(async () => {
          try {
            await this.handleCheckoutCompleted(event);
          } catch (err) {
            console.error('Error in delayed checkout handler:', err);
          }
        }, 5000); // delay 5 seconds
        break;

      case 'checkout.session.async_payment_succeeded':
        await this.handleCheckoutAsyncPaymentSucceeded(event);
        break;

      case 'checkout.session.async_payment_failed':
        await this.handleCheckoutAsyncPaymentFailed(event);
        break;

      // Payment intent events
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event);
        break;

      // Subscription events
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;

      case 'customer.subscription.paused':
        await this.handleSubscriptionPaused(event);
        break;

      case 'customer.subscription.resumed':
        await this.handleSubscriptionResumed(event);
        break;

      // Invoice events (for recurring payments)
      case 'invoice.paid':
        await this.handleInvoicePaid(event);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event);
        break;

      case 'invoice.payment_action_required':
        await this.handleInvoicePaymentActionRequired(event);
        break;

      // Charge events
      case 'charge.succeeded':
        await this.handleChargeSucceeded(event);
        break;

      case 'charge.failed':
        await this.handleChargeFailed(event);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event);
        break;

      case 'charge.dispute.created':
        await this.handleDisputeCreated(event);
        break;

      default:
        console.log(`Unhandled Stripe webhook event type: ${event.type}`);
    }
  }

  /**
   * Create a timeout promise
   */
  private static createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Webhook processing timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Build a stable deduplication key for a Stripe event
   */
  private static getDedupKey(event: any): { topic: string; objectId: string | null } {
    const topic = event.type as string;
    const data = (event.data?.object ?? {}) as any;
    let objectId: string | null = null;

    switch (topic) {
      case 'charge.succeeded':
      case 'charge.failed':
      case 'charge.refunded':
      case 'charge.dispute.created':
        objectId = data.id ?? null;
        break;

      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        objectId = data.id ?? null;
        break;

      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.async_payment_failed':
        objectId = data.id ?? null;
        break;

      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.payment_action_required':
        objectId = data.id ?? null;
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        objectId = data.id ?? null;
        break;

      default:
        objectId = (data && data.id) ? data.id : (event.id ?? null);
    }
    return { topic, objectId };
  }

  /**
   * Check if an equivalent event has already been processed
   */
  private static async isDuplicate(event: any): Promise<boolean> {
    try {
      const { topic, objectId } = this.getDedupKey(event);
      if (!topic || !objectId) return false;
      const existing = await prisma.webhookQueue.findFirst({
        where: {
          topic,
          status: 'processed',
          payload: {
            path: ['data', 'object', 'id'],
            equals: objectId
          } as any
        }
      });

      return Boolean(existing);
    } catch (err) {
      console.warn('Stripe webhook duplicate check failed, proceeding:', err);
      return false;
    }
  }

  /**
   * Extract userId from event
   */
  private static extractUserId(event: any): string | null {
    const data = event.data?.object as any;
    return (
      data?.metadata?.userId ||
      data?.client_reference_id ||
      data?.customer?.metadata?.userId ||
      null
    );
  }

  /**
   * Handle checkout session completed
   */
  static async handleCheckoutCompleted(event: any): Promise<void> {
    const session = event.data.object as any;
    const userId = session.metadata?.userId || session.client_reference_id;
    const chargeId = (session.payment_intent as string) || session.id;
    if (!userId || !chargeId) {
      throw new Error(
        `Missing required data for checkout completion: userId=${userId}, chargeId=${chargeId}`
      );
    }
    if (session.mode === 'payment' && session.metadata?.billingType === 'ONE_TIME') {
      const packageId = session.metadata?.packageId;
      if (!packageId) {
        throw new Error('Missing packageId in ONE_TIME checkout session metadata');
      }
      const userName = session.metadata?.userName || '';
      const email = session.customer_details?.email || undefined;
      await CreditManager.purchase(userId, {
        orderId: session.id,
        status: session.payment_status.toUpperCase(),
        packageId,
        payment: {
          paymentId: chargeId,
          paymentMethod: PAYMENT_METHOD.E_WALLET,
          paymentGateway: PAYMENT_GATEWAY.STRIPE,
          paymentAmount: session.amount_total ? (session.amount_total / 100).toString() : null,
          paymentCurrency: session.currency || null,
          paymentTime: session.created
            ? new Date(session.created * 1000).toISOString()
            : new Date().toISOString(),
          paymentStatus: session.payment_status.toUpperCase(),
        },
        metadata: {
          discounts: session.discounts || [],
          paymentIntentId: session.payment_intent,
          stripeCheckoutSessionId: session.id,
          showModal: false,
          webhookEventId: event.id,
          webhookEventType: event.type,
          payer: {
            id: session.customer,
            details: session.customer_details,
            email: session.customer_details?.email || session.customer_email || null,
          }
        },
      });
      // simulate redirect like API (3s delay)
      await new Promise((r) => setTimeout(r, 3000));
      const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing/status?method=checkout&orderId=${session.id}&status=success`;
      console.log('Webhook redirect (ONE_TIME):', redirectUrl);
    } else if (session.mode === 'subscription') {
      const subscriptionId = session.subscription as string | undefined;
      const planId = session.metadata?.planId as string | undefined;
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      if (!planId) {
        throw new Error('Missing planId in subscription checkout metadata');
      }

      if (!subscriptionId) {
        throw new Error('Missing subscriptionId in subscription checkout session');
      }

      // @ts-expect-error: Property 'current_period_start' may not exist on Response<Subscription>
      const currentPeriodStartTimestamp = subscription.current_period_start;
      // @ts-expect-error: Property 'current_period_end' may not exist on Response<Subscription>
      const currentPeriodEndTimestamp = subscription.current_period_end;

      // 1. Define the Date object for the start time for safe arithmetic
      const currentPeriodStartDateObject = currentPeriodStartTimestamp
        ? new Date(currentPeriodStartTimestamp * 1000)
        : new Date();

      // 2. Define the ISO string for the SubscriptionManager
      const currentPeriodStart = currentPeriodStartDateObject.toISOString();

      // 3. Calculate currentPeriodEnd safely
      const currentPeriodEnd = currentPeriodEndTimestamp
        ? new Date(currentPeriodEndTimestamp * 1000).toISOString()
        // Use the Date object (.getTime()) for arithmetic, then convert to ISO string
        : new Date(currentPeriodStartDateObject.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await SubscriptionManager.activate(userId, {
        subId: subscriptionId,
        planId,
        status: 'ACTIVE',
        payment: {
          paymentId: chargeId,
          paymentMethod: PAYMENT_METHOD.E_WALLET,
          paymentGateway: PAYMENT_GATEWAY.STRIPE,
          paymentAmount: session.amount_total ? session.amount_total / 100 : 0,
          paymentCurrency: session.currency?.toUpperCase() || 'USD',
          paymentTime: currentPeriodStart,
          nextPaymentTime: currentPeriodEnd,
          paymentStatus: session.payment_status?.toUpperCase() || 'SUCCEEDED',
        },
        currentPeriodStart,
        currentPeriodEnd,
        createdAt: subscription.created
          ? new Date(subscription.created * 1000).toISOString()
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          stripeCheckoutSessionId: session.id,
          paymentIntentId: chargeId,
          webhookEventId: event.id,
          webhookEventType: event.type,
          discounts: session.discounts,
          payer: {
            id: session.customer,
            details: session.customer_details,
            email: session.customer_details?.email || session.customer_email || null,
            shipping: session.customer_shipping
          },
          showModal: false,
        }
      });
      // simulate redirect like API (3s delay)
      await new Promise((r) => setTimeout(r, 3000));
      const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing/status?method=subscription&subId=${subscriptionId}&status=success`;
      console.log('Webhook redirect (SUBSCRIPTION):', redirectUrl);
    }
  }

  /**
   * Handle checkout async payment succeeded
   */
  static async handleCheckoutAsyncPaymentSucceeded(event: any): Promise<void> {
    await this.handleCheckoutCompleted(event);
  }

  /**
   * Handle checkout async payment failed
   */
  static async handleCheckoutAsyncPaymentFailed(event: any): Promise<void> {
    const session = event.data.object as any;
    const userId = session.metadata?.userId || session.client_reference_id;
    const chargeId = session.payment_intent as string || session.id;

    if (!userId || !chargeId) {
      throw new Error(
        `Missing required data for checkout failure: userId=${userId}, chargeId=${chargeId}`
      );
    }

    await SubscriptionManager.updatePaymentStatus(
      userId,
      String(chargeId),
      PaymentStatus.FAILED
    );
  }

  /**
   * Handle payment intent succeeded
   */
  static async handlePaymentIntentSucceeded(event: any): Promise<void> {
    const intent = event.data.object as any;
    const userId = intent.metadata?.userId;
    const chargeId = intent.id;

    if (!userId || !chargeId) {
      console.warn('Missing userId or chargeId in payment intent succeeded event');
      return;
    }

    await SubscriptionManager.updatePaymentStatus(
      userId,
      String(chargeId),
      PaymentStatus.SUCCEEDED
    );
  }

  /**
   * Handle payment intent failed
   */
  static async handlePaymentIntentFailed(event: any): Promise<void> {
    const intent = event.data.object as any;
    const userId = intent.metadata?.userId;
    const chargeId = intent.id;

    if (!userId || !chargeId) {
      console.warn('Missing userId or chargeId in payment intent failed event');
      return;
    }

    await SubscriptionManager.updatePaymentStatus(
      userId,
      String(chargeId),
      PaymentStatus.FAILED
    );
  }

  /**
   * Handle payment intent canceled
   */
  static async handlePaymentIntentCanceled(event: any): Promise<void> {
    const intent = event.data.object as any;
    const userId = intent.metadata?.userId;
    const chargeId = intent.id;

    if (!userId || !chargeId) {
      console.warn('Missing userId or chargeId in payment intent canceled event');
      return;
    }

    await SubscriptionManager.updatePaymentStatus(
      userId,
      String(chargeId),
      PaymentStatus.CANCELED
    );
  }

  /**
   * Handle subscription created
   */
  static async handleSubscriptionCreated(event: any): Promise<void> {
    const subscription = event.data.object as any;
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.warn('Missing userId in subscription created event');
      return;
    }

    console.log('Subscription created:', subscription.id);
  }

  /**
   * Handle subscription updated
   */
  static async handleSubscriptionUpdated(event: any): Promise<void> {
    const subscription = event.data.object as any;
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.warn('Missing userId in subscription updated event');
      return;
    }

    // Handle status changes
    switch (subscription.status) {
      case 'active':
        // Ensure subscription is active
        // Nothing to do here beyond status update via renew flow
        break;
      case 'paused':
        // Pause handled by provider; reflect internally if needed
        break;
      case 'canceled':
      case 'unpaid':
        // Missing subscriptionId context here; rely on invoice handlers for status
        break;
      default:
        console.log(`Subscription status unchanged: ${subscription.status}`);
    }
  }

  /**
   * Handle subscription deleted
   */
  static async handleSubscriptionDeleted(event: any): Promise<void> {
    const subscription = event.data.object as any;
    const userId = subscription?.metadata?.userId;
    const subscriptionId = subscription?.id;

    if (!userId || !subscriptionId) {
      throw new Error('Missing parameters in subscription deleted event');
    }

    await SubscriptionManager.cancel(userId, { subscriptionId, canceledAt: DateTime.now() });
  }

  /**
   * Handle subscription paused
   */
  static async handleSubscriptionPaused(event: any): Promise<void> {
    const subscription = event.data.object as any;
    const userId = subscription.metadata?.userId;
    const subscriptionId = subscription?.id;

    if (!userId || !subscriptionId) {
      throw new Error('Missing userId in subscription paused event');
    }

    await SubscriptionManager.suspend(userId, { subscriptionId });
  }

  /**
   * Handle subscription resumed
   */
  static async handleSubscriptionResumed(event: any): Promise<void> {
    const subscription = event.data.object as any;
    const userId = subscription.metadata?.userId;
    const subscriptionId = subscription?.id;
    if (!userId || !subscriptionId) {
      throw new Error('Missing userId in subscription resumed event');
    }
    await SubscriptionManager.reactivate(userId, { subscriptionId });
  }

  /**
   * Handle invoice paid (recurring payment)
   */

  static async handleInvoicePaid(event: any): Promise<void> {
    const invoice = event.data.object as any;
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;
    const subscription = invoice.subscription
      ? await stripe.subscriptions.retrieve(subscriptionId)
      : null;

    const userId = subscription?.metadata?.userId || null;
    const planId = subscription?.metadata?.planId || null;
    const saleId = invoice.id;
    const paymentStatus = invoice.status?.toUpperCase() || 'PAID';

    if (!userId) {
      throw new Error(
        `Missing userId in Stripe subscription metadata for customer ${invoice.customer}`
      );
    }

    if (!saleId || !planId) {
      throw new Error(
        `Missing required payment data in event ${event.id}: saleId=${saleId}, planId=${planId}`
      );
    }

    const current = await SubscriptionManager.getCurrentSubscription(userId);
    if (!current) {
      throw new Error(`No active subscription found for user ${userId}, saleId=${saleId}`);
    }

    const lastPayment = current.payments?.[0];
    if (!lastPayment) {
      throw new Error(`No payment found for subscription ${subscriptionId}`);
    }

    // Prevent duplicate renewals
    if (lastPayment?.metadata) {
      const metadata = lastPayment.metadata as Record<string, any> | null;
      const existingSaleId = metadata?.saleId;

      if (existingSaleId === saleId) {
        console.log('Duplicate Stripe invoice payment detected, skipping', {
          saleId,
          userId,
          eventId: event.id,
        });
        return;
      }

      if (!existingSaleId) {
        console.log('Appending saleId to existing payment metadata', {
          paymentId: lastPayment.id,
          saleId,
        });
        await SubscriptionManager.updatePaymentMetadata(lastPayment.id, {
          ...metadata,
          saleId,
        });
        console.log('Payment metadata updated, skipping renewal');
        return;
      }
    }

    // Process subscription renewal
    console.log('Processing Stripe subscription renewal', {
      userId,
      subscriptionId,
      saleId,
      planId,
    });

    await SubscriptionManager.renew(userId, {
      planId,
      payment: {
        paymentId: invoice.charge,
        paymentMethod: PAYMENT_METHOD.E_WALLET,
        paymentGateway: PAYMENT_GATEWAY.STRIPE,
        paymentAmount: (invoice.amount_paid || 0) / 100,
        paymentCurrency: invoice.currency?.toUpperCase() || 'USD',
        paymentTime: new Date(invoice.created * 1000).toISOString(),
        paymentStatus,
      },
      currentCycleStart: new Date(invoice.created * 1000).toISOString(),
      metadata: {
        saleId,
        status: paymentStatus,
        discount: invoice.total_discount_amounts ?? null,
        discounts: invoice.discounts ?? [],
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        invoiceNumber: invoice.number,
        subscriptionId: invoice.subscription,
        chargeId: invoice.charge,
        webhookEventId: event.id,
        webhookEventType: event.type,
        resourceType: invoice.object,
        payer: {
          id: invoice.customer || null,
          name: invoice.customer_name || null,
          email: invoice.customer_email || null,
          address: invoice.customer_address || null,
          phone: invoice.customer_phone || null,
          shipping: invoice.customer_shipping || null, // may include name, phone, address
        },
        processedAt: new Date().toISOString(),
      },
    });

    console.log('Stripe subscription renewed successfully', {
      userId,
      subscriptionId,
      saleId,
    });
  }

  /**
   * Handle invoice payment failed
   */
  static async handleInvoicePaymentFailed(event: any): Promise<void> {
    const invoice = event.data.object as any;
    const userId = invoice.metadata?.userId || invoice.customer_email;
    const chargeId = invoice.charge as string || invoice.id;

    if (!userId || !chargeId) {
      throw new Error(
        `Missing required data for invoice payment failure: userId=${userId}, chargeId=${chargeId}`
      );
    }

    await SubscriptionManager.updatePaymentStatus(
      userId,
      String(chargeId),
      PaymentStatus.FAILED
    );
  }

  /**
   * Handle invoice payment action required
   */
  static async handleInvoicePaymentActionRequired(event: any): Promise<void> {
    const invoice = event.data.object as any;
    const userId = invoice.metadata?.userId;

    if (!userId) {
      console.warn('Missing userId in invoice payment action required event');
      return;
    }

    // TODO: Notify user that action is required (e.g., via email or in-app notification)
    console.log('Payment action required for user:', userId);
  }

  /**
   * Handle charge succeeded
   */
  static async handleChargeSucceeded(event: any): Promise<void> {
    const charge = event.data.object as any;
    const userId = charge.metadata?.userId;
    const chargeId = charge.id;

    if (!userId || !chargeId) {
      console.warn('Missing userId or chargeId in charge succeeded event');
      return;
    }

    await SubscriptionManager.updatePaymentStatus(
      userId,
      String(chargeId),
      PaymentStatus.SUCCEEDED
    );
  }

  /**
   * Handle charge failed
   */
  static async handleChargeFailed(event: any): Promise<void> {
    const charge = event.data.object as any;
    const userId = charge.metadata?.userId;
    const chargeId = charge.id;

    if (!userId || !chargeId) {
      console.warn('Missing userId or chargeId in charge failed event');
      return;
    }

    await SubscriptionManager.updatePaymentStatus(
      userId,
      String(chargeId),
      PaymentStatus.FAILED
    );
  }

  /**
   * Handle charge refunded
   */
  static async handleChargeRefunded(event: any): Promise<void> {
    const charge = event.data.object as any;
    const userId = charge.metadata?.userId;
    const chargeId = charge.id;

    if (!userId || !chargeId) {
      throw new Error(
        `Missing required data for charge refund: userId=${userId}, chargeId=${chargeId}`
      );
    }

    await SubscriptionManager.updatePaymentStatus(
      userId,
      String(chargeId),
      PaymentStatus.REFUNDED
    );
  }

  /**
   * Handle dispute created (chargeback)
   */
  static async handleDisputeCreated(event: any): Promise<void> {
    const dispute = event.data.object as any;
    const charge = dispute.charge as string;

    if (!charge) {
      throw new Error('Missing charge ID in dispute created event');
    }

    // Find payment and freeze subscription
    const payment = await prisma.payment.findFirst({
      where: { chargeId: charge }
    });

    if (payment?.userId) {
      const current = await SubscriptionManager.getCurrentSubscription(payment.userId);
      if (current?.subId) {
        await SubscriptionManager.suspend(payment.userId, { subscriptionId: current.subId });
      }
      console.log(`Subscription frozen due to dispute for user: ${payment.userId}`);
    } else {
      console.warn(`No payment found for charge ${charge} in dispute`);
    }
  }

  /**
   * Process queued webhooks in batch
   */
  static async processQueue(limit: number = 10): Promise<void> {
    const pendingWebhooks = await prisma.webhookQueue.findMany({
      where: {
        status: 'pending',
        attempts: { lt: MAX_RETRY_ATTEMPTS }
      },
      take: limit,
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Processing ${pendingWebhooks.length} pending Stripe webhooks`);

    const results = await Promise.allSettled(
      pendingWebhooks.map(async (webhook) => {
        try {
          await this.processWebhook(webhook.payload as any);
        } catch (error: any) {
          // Error handling is done inside processWebhook
          console.error(`Failed to process webhook ${webhook.id}:`, error.message);
        }
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`Webhook queue processing complete: ${succeeded} succeeded, ${failed} failed`);
  }

  /**
   * Retry failed webhooks
   */
  static async retryFailed(): Promise<void> {
    const result = await prisma.webhookQueue.updateMany({
      where: {
        status: 'failed',
        attempts: { lt: 5 }
      },
      data: {
        status: 'pending',
        error: null
      }
    });

    console.log(`Retrying ${result.count} failed Stripe webhooks`);
  }

  /**
   * Clean up old processed webhooks (for maintenance)
   */
  static async cleanupOldWebhooks(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.webhookQueue.deleteMany({
      where: {
        status: 'processed',
        processedAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`Cleaned up ${result.count} old Stripe webhook records`);
    return result.count;
  }
}