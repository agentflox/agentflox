import { prisma } from '@/lib/prisma';
import { PaymentStatus, SubscriptionStatus } from '@agentflox/database';
import { SubscriptionManager } from '@/services/billing/managers/subscription.manager';
import { CreditManager } from '@/services/billing/managers/credit.manager';
import { DateTime } from 'luxon';
import { PAYMENT_METHOD, PAYMENT_GATEWAY } from '@/services/billing/types';

interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  event_type: string;
  summary: string;
  resource: any;
  links?: Array<{ href: string; rel: string; method: string }>;
}

const MAX_RETRY_ATTEMPTS = 3;
const WEBHOOK_PROCESSING_TIMEOUT = 30000; // 30 seconds

export class PaypalWebhookManager {
  private constructor() { }

  /**
   * Verify PayPal webhook signature
   */
  static async verifyWebhookSignature(
    webhookId: string,
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    try {
      const transmissionId = headers['paypal-transmission-id'];
      const transmissionTime = headers['paypal-transmission-time'];
      const certUrl = headers['paypal-cert-url'];
      const transmissionSig = headers['paypal-transmission-sig'];
      const authAlgo = headers['paypal-auth-algo'];

      if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
        console.error('Missing required webhook headers');
        return false;
      }

      // For production, verify with PayPal API
      // const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${accessToken}`
      //   },
      //   body: JSON.stringify({
      //     transmission_id: transmissionId,
      //     transmission_time: transmissionTime,
      //     cert_url: certUrl,
      //     auth_algo: authAlgo,
      //     transmission_sig: transmissionSig,
      //     webhook_id: webhookId,
      //     webhook_event: JSON.parse(body)
      //   })
      // });
      // const verification = await response.json();
      // return verification.verification_status === 'SUCCESS';

      return true; // Skip verification in dev
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Log webhook event
   */
  static async log(event: PayPalWebhookEvent): Promise<void> {
    try {
      const userId = this.extractUserId(event);
      await prisma.webhookLog.create({
        data: {
          topic: event.event_type,
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
  static async queueWebhook(event: PayPalWebhookEvent): Promise<void> {
    try {
      const userId = this.extractUserId(event);
      await prisma.webhookQueue.create({
        data: {
          topic: event.event_type,
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
  static async processWebhook(event: PayPalWebhookEvent): Promise<void> {
    let webhookQueueEntry: Awaited<ReturnType<typeof prisma.webhookQueue.findFirst>> = null;
    let processingError: Error | null = null;

    try {
      // Check for duplicate events first
      const isDuplicate = await this.isDuplicate(event);
      if (isDuplicate) {
        console.log(`Duplicate PayPal event detected, skipping: ${event.event_type} ${event.id}`);
        return;
      }

      // Find the webhook queue entry
      webhookQueueEntry = await prisma.webhookQueue.findFirst({
        where: {
          topic: event.event_type,
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
      console.error(`Error processing PayPal webhook ${event.event_type}:`, error);

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
            `PayPal webhook ${event.event_type} failed after ${MAX_RETRY_ATTEMPTS} attempts:`,
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
  private static async handleWebhookEvent(event: PayPalWebhookEvent): Promise<void> {
    switch (event.event_type) {
      // Subscription lifecycle events
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        setTimeout(async () => {
          try {
            await this.handleSubscriptionActivated(event);
          } catch (err) {
            console.error('Error in delayed checkout handler:', err);
          }
        }, 5000); // delay 5 seconds
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await this.handleSubscriptionUpdated(event);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await this.handleSubscriptionCancelled(event);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await this.handleSubscriptionSuspended(event);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await this.handleSubscriptionExpired(event);
        break;

      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
        await this.handleSubscriptionReactivated(event);
        break;

      // Order events (one-time payments)
      case 'CHECKOUT.ORDER.APPROVED':
        setTimeout(async () => {
          try {
            await this.handlePaymentCaptured(event);
          } catch (err) {
            console.error('Error in delayed checkout handler:', err);
          }
        }, 5000);
        break;

      case 'CHECKOUT.ORDER.COMPLETED':
      case 'CHECKOUT.ORDER.DECLINED':
      case 'CHECKOUT.ORDER.SAVED':
      case 'CHECKOUT.ORDER.VOIDED':
        // Log but don't process
        console.log(`PayPal order event: ${event.event_type}`, event.resource?.id);
        break;

      // Payment events (recurring)
      case 'PAYMENT.SALE.COMPLETED':
        await this.handlePaymentCompleted(event);
        break;

      case 'PAYMENT.SALE.REFUNDED':
        //await this.handlePaymentRefunded(event);
        break;

      case 'PAYMENT.SALE.REVERSED':
        //await this.handlePaymentReversed(event);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        // Usually handled by CHECKOUT.ORDER.APPROVED
        console.log('Payment capture completed:', event.resource?.id);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        //await this.handlePaymentDenied(event);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        //await this.handlePaymentRefunded(event);
        break;

      default:
        console.log(`Unhandled PayPal webhook event type: ${event.event_type}`);
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
   * Build a stable deduplication key for a PayPal event
   */
  private static getDedupKey(event: PayPalWebhookEvent): { topic: string; objectId: string | null } {
    const topic = event.event_type;
    const resource: any = event.resource ?? {};

    let objectId: string | null = null;
    switch (topic) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
        objectId = resource.id ?? null;
        break;

      case 'PAYMENT.SALE.COMPLETED':
      case 'PAYMENT.SALE.REFUNDED':
      case 'PAYMENT.SALE.REVERSED':
        objectId = resource.id ?? resource.sale_id ?? null;
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'CHECKOUT.ORDER.APPROVED':
      case 'CHECKOUT.ORDER.COMPLETED':
        objectId = resource.id ?? null;
        break;

      default:
        objectId = resource.id ?? event.id ?? null;
    }

    return { topic, objectId };
  }

  /**
   * Check if an equivalent PayPal event has already been processed
   */
  private static async isDuplicate(event: PayPalWebhookEvent): Promise<boolean> {
    try {
      const { topic, objectId } = this.getDedupKey(event);
      if (!topic || !objectId) return false;
      const existing = await prisma.webhookQueue.findFirst({
        where: {
          topic,
          status: 'processed',
          payload: {
            path: ['resource', 'id'],
            equals: objectId
          } as any
        }
      });
      return Boolean(existing);
    } catch (err) {
      console.warn('PayPal webhook duplicate check failed, proceeding:', err);
      return false;
    }
  }

  /**
   * Extract userId from event
   */
  private static extractUserId(event: PayPalWebhookEvent): string | null {
    try {
      const raw = event.resource?.custom_id || event.resource?.custom;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const { userId } = parsed;
      return userId ?? null;
    } catch {
      return null;
    }
  }

  /**
 * Extract userId from event
 */
  private static extractPlanId(event: PayPalWebhookEvent): string | null {
    try {
      const raw = event.resource?.custom_id || event.resource?.custom;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const { planId } = parsed;
      return planId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Handle subscription activated
   */
  static async handleSubscriptionActivated(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const planId = this.extractPlanId(event);
    const resource = event.resource;
    const subId = resource?.id;
    if (!userId || !subId || !planId) {
      throw new Error(
        `Missing required data for subscription activation: userId=${userId}, subId=${subId}, planId=${planId}`
      );
    }
    const billingInfo = resource.billing_info ?? {};
    const lastPayment = billingInfo.last_payment ?? {};
    const nextBillingTime = billingInfo.next_billing_time ?? null;
    await SubscriptionManager.activate(userId, {
      subId,
      status: resource.status,
      planId,
      payment: {
        paymentId: lastPayment?.id,
        paymentMethod: PAYMENT_METHOD.E_WALLET,
        paymentGateway: PAYMENT_GATEWAY.PAYPAL,
        paymentAmount: lastPayment?.amount?.value ?? null,
        paymentCurrency: lastPayment?.amount?.currency_code ?? null,
        paymentTime: lastPayment?.time ?? null,
        nextPaymentTime: nextBillingTime,
        paymentStatus: lastPayment?.status ?? null,
      },
      currentPeriodStart: resource.start_time,
      currentPeriodEnd: nextBillingTime,
      createdAt: resource.create_time,
      updatedAt: resource.update_time,
      metadata: {
        subscriber: resource.subscriber ?? null,
        quantity: resource.quantity ?? null,
        shippingAmount: resource.shipping_amount ?? null,
        billingInfo,
        links: resource.links ?? [],
        webhookEventId: event.id,
        webhookEventType: event.event_type,
        showModal: false
      },
    });
    // simulate redirect like API (3s delay)
    await new Promise((r) => setTimeout(r, 3000));
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing/status?method=subscription&subId=${subId}&status=success`;
    console.log('Webhook redirect (PayPal SUBSCRIPTION):', redirectUrl);
  }

  /**
   * Handle subscription updated
   */
  static async handleSubscriptionUpdated(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    if (!userId) {
      throw new Error('Missing userId in subscription update event');
    }
    console.log('Subscription updated:', event.resource?.id);
    // TODO: Implement subscription update logic if needed
  }

  /**
   * Handle subscription cancelled
   */
  static async handleSubscriptionCancelled(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const subscriptionId = event.resource?.id;
    if (!userId || !subscriptionId) {
      throw new Error('Missing parameters in subscription suspension event');
    }
    await SubscriptionManager.cancel(userId, { subscriptionId, canceledAt: DateTime.now() });
  }

  /**
   * Handle subscription suspended
   */
  static async handleSubscriptionSuspended(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const subscriptionId = event.resource?.id;
    if (!userId || !subscriptionId) {
      throw new Error('Missing parameters in subscription suspension event');
    }
    await SubscriptionManager.suspend(userId, { subscriptionId });
  }

  /**
   * Handle subscription expired
   */
  static async handleSubscriptionExpired(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const subscriptionId = event.resource?.id;
    if (!userId || !subscriptionId) {
      throw new Error('Missing parameters in subscription suspension event');
    }
    await SubscriptionManager.expire(userId, { subscriptionId });
  }

  /**
   * Handle subscription reactivated
   */
  static async handleSubscriptionReactivated(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const subscriptionId = event.resource?.id;
    if (!userId || !subscriptionId) {
      throw new Error('Missing parameters in subscription suspension event');
    }
    await SubscriptionManager.reactivate(userId, { subscriptionId });
  }

  /**
   * Handle payment completed (recurring payment)
   */
  static async handlePaymentCompleted(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const saleId = event.resource?.id;
    const planId = event.resource?.billing_agreement_id;
    const paymentStatus = event.resource?.state?.toUpperCase() || 'COMPLETED';
    if (!userId) {
      throw new Error(`Missing userId in payment completed event: ${event.id}`);
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
    const subscriptionId = current.id;
    const lastPayment = current.payments?.[0];
    if (!lastPayment) {
      throw new Error(`No payment found for subscription ${subscriptionId}`);
    }
    if (lastPayment?.metadata) {
      const metadata = lastPayment.metadata as Record<string, any> | null;
      const existingSaleId = metadata?.saleId;
      if (existingSaleId === saleId) {
        console.log('Duplicate payment webhook event detected, skipping', {
          saleId,
          userId,
          eventId: event.id
        });
        return;
      }
      if (!existingSaleId) {
        console.log('Appending saleId to existing payment metadata', {
          paymentId: lastPayment.id,
          saleId
        });
        await SubscriptionManager.updatePaymentMetadata(lastPayment.id, {
          ...metadata,
          saleId
        });
        console.log('Payment metadata updated, skipping renewal', {
          paymentId: lastPayment.id,
          saleId
        });
        return;
      }
    }
    console.log('Processing subscription renewal', {
      userId,
      subscriptionId,
      saleId,
      planId
    });
    await SubscriptionManager.renew(userId, {
      planId,
      payment: {
        paymentMethod: PAYMENT_METHOD.E_WALLET,
        paymentGateway: PAYMENT_GATEWAY.PAYPAL,
        paymentAmount: event.resource?.amount?.total || '0',
        paymentCurrency: event.resource?.amount?.currency || 'USD',
        paymentTime: event.resource?.create_time || event.create_time,
        paymentStatus: paymentStatus,
      },
      currentCycleStart: event.resource?.create_time || event.create_time,
      metadata: {
        saleId,
        status: paymentStatus,
        paymentMode: event.resource?.payment_mode || null,
        transactionFee: event.resource?.transaction_fee || null,
        summary: event.summary || null,
        links: event.resource?.links || [],
        webhookEventId: event.id,
        webhookEventType: event.event_type,
        resourceType: event.resource_type,
        protectionEligibility: event.resource?.protection_eligibility || null,
        softDescriptor: event.resource?.soft_descriptor || null,
        processedAt: new Date().toISOString(),
        showModal: false
      }
    });

    console.log('Subscription renewed successfully', {
      userId,
      subscriptionId,
      saleId
    });
  }

  /**
   * Handle payment captured (one-time payment)
   */
  static async handlePaymentCaptured(event: PayPalWebhookEvent): Promise<void> {
    const purchaseUnit = event.resource?.purchase_units?.[0];
    const userId = purchaseUnit?.custom_id;
    const orderId = event.resource?.id;
    if (!userId || !orderId) {
      throw new Error(
        `Missing required data for payment capture: userId=${userId}, orderId=${orderId}`
      );
    }
    const packageId = purchaseUnit?.reference_id;
    if (!packageId) {
      throw new Error('No packageId found in PayPal capture webhook');
    }
    const payer = event.resource?.payer;
    const payment = event.resource?.payments?.captures?.[0] || {};
    const paymentTime = payment?.create_time || event.resource?.create_time;
    const paymentStatus = payment?.status || event.resource?.status;
    await CreditManager.purchase(userId, {
      packageId,
      orderId,
      status: event.resource?.status || 'COMPLETED',
      payment: {
        paymentId: payment?.id || orderId,
        paymentMethod: PAYMENT_METHOD.E_WALLET,
        paymentGateway: PAYMENT_GATEWAY.PAYPAL,
        paymentAmount: payment?.amount?.value ?? null,
        paymentCurrency: payment?.amount?.currency_code ?? null,
        paymentTime,
        paymentStatus,
      },
      metadata: {
        payer,
        paymentSource: event.resource.paymentSource ?? null,
        links: event.resource?.links ?? [],
        webhookEventId: event.id,
        webHookEventType: event.event_type,
        showModal: false
      },
    });
    await new Promise((r) => setTimeout(r, 3000));
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing/status?method=checkout&orderId=${orderId}&status=success`;
    console.log('Webhook redirect (PayPal CHECKOUT):', redirectUrl);
  }

  /**
   * Handle payment denied
   */
  static async handlePaymentDenied(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const chargeId = event.resource?.id;
    if (!userId || !chargeId) {
      throw new Error(
        `Missing required data for payment denial: userId=${userId}, chargeId=${chargeId}`
      );
    }
    await SubscriptionManager.updatePaymentStatus(userId, String(chargeId), PaymentStatus.FAILED);
  }

  /**
   * Handle payment refunded
   */
  static async handlePaymentRefunded(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const chargeId = event.resource?.sale_id || event.resource?.id;
    if (!userId || !chargeId) {
      throw new Error(
        `Missing required data for payment refund: userId=${userId}, chargeId=${chargeId}`
      );
    }
    await SubscriptionManager.updatePaymentStatus(userId, String(chargeId), PaymentStatus.REFUNDED);
  }

  /**
   * Handle payment reversed (chargeback)
   */
  static async handlePaymentReversed(event: PayPalWebhookEvent): Promise<void> {
    const userId = this.extractUserId(event);
    const chargeId = event.resource?.id;

    if (!userId || !chargeId) {
      throw new Error(
        `Missing required data for payment reversal: userId=${userId}, chargeId=${chargeId}`
      );
    }
    await SubscriptionManager.updatePaymentStatus(userId, String(chargeId), PaymentStatus.FAILED);
    const current = await SubscriptionManager.getCurrentSubscription(userId);
    if (current?.subId) {
      await SubscriptionManager.suspend(userId, { subscriptionId: current.subId });
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

    console.log(`Processing ${pendingWebhooks.length} pending PayPal webhooks`);

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

    console.log(`Retrying ${result.count} failed PayPal webhooks`);
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

    console.log(`Cleaned up ${result.count} old PayPal webhook records`);
    return result.count;
  }
}