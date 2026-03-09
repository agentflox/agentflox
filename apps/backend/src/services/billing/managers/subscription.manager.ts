import { Prisma, SubscriptionStatus, PaymentStatus, BillingType, PaymentMethod, NotificationType } from '@agentflox/database';
import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';
import { PlanManager } from './plan.manager';
import { UsageManager } from './usage.manager';
import { PAYMENT_METHOD, PAYMENT_GATEWAY, SubscribeInput, RenewInput } from '../types';

export class SubscriptionManager {
  private static readonly TRANSACTION_TIMEOUT = 50000;
  private static readonly MAX_WAIT = 5000;

  private static getPaymentStatus(status: string): PaymentStatus {
    switch (status) {
      case 'COMPLETED':
      case 'ACTIVE':
      case 'PAID':
        return PaymentStatus.SUCCEEDED;
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'FAILED':
      case 'DENIED':
        return PaymentStatus.FAILED;
      case 'CANCELLED':
        return PaymentStatus.CANCELED;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      case 'EXPIRED':
        return PaymentStatus.EXPIRED;
      default:
        throw new Error(`Unknown gateway status: ${status}`);
    }
  }

  private static getSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'COMPLETED':
      case 'ACTIVE':
      case 'PAID':
        return SubscriptionStatus.ACTIVE;
      case 'PENDING':
      case 'FAILED':
      case 'DENIED':
      case 'CANCELLED':
      case 'REFUNDED':
      case 'EXPIRED':
        return SubscriptionStatus.CANCELED;
      default:
        throw new Error(`Unknown gateway status: ${status}`);
    }
  }

  static async getCurrentSubscription(userId: string) {
    if (!userId) throw new Error('User not found');
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD]
          }
        },
        include: {
          plan: {
            include: {
              feature: true,
            }
          },
          payments: true
        }
      });
      if (subscription && !subscription.plan) {
        console.warn(`Subscription found for user ${userId} but no associated plan exists`);
      }
      return subscription;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get current subscription: ${message}`);
    }
  }

  static async getSubscriptionById(subscriptionId: string) {
    if (!subscriptionId) throw new Error('Subscription ID is required');

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          plan: {
            include: {
              feature: true,
            }
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10 // Get recent payments for history
          }
        }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (!subscription.plan) {
        console.warn(`Subscription ${subscriptionId} has no associated plan`);
      }

      return subscription;
    } catch (error) {
      console.error('Error getting subscription:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get subscription: ${message}`);
    }
  }

  static async getSubscriptionDetails(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) return null;
    const cycle = await this.checkAndManageCycle(userId);
    const latestPayment = subscription.payments[subscription.payments.length - 1];
    return {
      status: subscription.status,
      plan: {
        name: subscription.plan.name,
        price: subscription.plan.price,
        billingType: subscription.plan.planType,
        interval: subscription.plan.billingPeriod,
        feature: subscription.plan.feature
      },
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      canceledAt: subscription.canceledAt,
      cancelReason: subscription.cancelReason,
      daysUntilExpiration: cycle.daysUntilExpiration,
      isCycleTransition: cycle.isExpired,
      nextCycleStart: cycle.nextCycleStart,
      nextCycleEnd: cycle.nextCycleEnd,
      latestPayment: latestPayment
        ? {
          status: latestPayment.status,
          amount: latestPayment.amount,
          billingType: latestPayment.billingType,
          currency: latestPayment.currency,
          billingPeriodStart: latestPayment.billingPeriodStart,
          billingPeriodEnd: latestPayment.billingPeriodEnd
        }
        : undefined
    };
  }

  static async subscribe(data: SubscribeInput) {
    if (!data.userId || !data.planId || !data.subId || !data.payment) {
      throw new Error('Missing required subscription data');
    }
    const plan = await PlanManager.getPlan(data.planId);
    if (!plan) throw new Error('Invalid subscription plan');
    const paymentTime = DateTime.fromISO(String(data.payment.paymentTime ?? DateTime.now().toISO()));
    const nextPaymentTime = DateTime.fromISO(String(data.payment.nextPaymentTime ?? paymentTime.plus({ months: 1 }).toISO()));
    const currentPeriodStart = data.currentCycleStart ?? paymentTime;
    const currentPeriodEnd = data.currentCycleEnd ?? nextPaymentTime;
    const paymentStatus = this.getPaymentStatus(data.status);
    const subscriptionStatus = this.getSubscriptionStatus(data.status);
    if (paymentStatus !== PaymentStatus.SUCCEEDED) {
      throw new Error('Payment was not successful. Please try again or contact support.');
    }
    const created = await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: {
          userId: data.userId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] },
        },
        data: { status: SubscriptionStatus.EXPIRED, currentPeriodEnd: currentPeriodStart.toJSDate() },
      });
      const subscription = await tx.subscription.create({
        data: {
          userId: data.userId,
          planId: plan.id,
          subId: data.subId,
          status: subscriptionStatus,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          currentPeriodStart: currentPeriodStart.toJSDate(),
          currentPeriodEnd: currentPeriodEnd.toJSDate(),
        },
        include: { plan: { include: { feature: true } }, payments: true },
      });
      const feature = plan.feature;
      const usage = await tx.usage.create({
        data: {
          userId: data.userId,
          subscriptionId: subscription.id,
          maxProjects: feature?.maxProjects ?? 0,
          remainingProjects: feature?.maxProjects ?? 0,
          maxTeams: feature?.maxTeams ?? 0,
          remainingTeams: feature?.maxTeams ?? 0,
          maxProposals: feature?.maxProposals ?? 0,
          remainingProposals: feature?.maxProposals ?? 0,
          maxRequests: feature?.maxRequests ?? 0,
          remainingRequests: feature?.maxRequests ?? 0,
          maxCredits: feature?.maxCredits ?? 0,
          remainingCredits: feature?.maxCredits ?? 0,
        },
      });
      await tx.payment.create({
        data: {
          userId: data.userId,
          subscriptionId: subscription.id,
          billingType: BillingType.SUBSCRIPTION,
          paymentMethod: data.payment.paymentMethod,
          paymentGateway: data.payment.paymentGateway,
          amount: Number(data.payment.paymentAmount) ?? 0,
          currency: data.payment.paymentCurrency ?? 'USD',
          status: paymentStatus,
          billingPeriodStart: paymentTime.toJSDate(),
          billingPeriodEnd: nextPaymentTime.toJSDate(),
          intentId: data.intentId,
          chargeId: data.chargeId ?? data.payment.paymentId,
          refundId: data.refundId,
          failureReason: data.errorMessage,
          metadata: data.metadata ?? {},
        },
      });
      if (subscriptionStatus === SubscriptionStatus.ACTIVE) {
        await tx.notification.create({
          data: {
            userId: data.userId,
            type: NotificationType.SUBSCRIPTION,
            title: `Subscription Activated: ${subscription.plan.displayName || subscription.plan.name}`,
            content: `Your subscription is active. Period: ${paymentTime.toFormat('yyyy-LL-dd')} to ${nextPaymentTime.toFormat('yyyy-LL-dd')}.`
          }
        });
      }
      return subscription;
    }, { timeout: this.TRANSACTION_TIMEOUT, maxWait: this.MAX_WAIT, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return created;
  }

  static async createDefaultSubscription(userId: string) {
    if (!userId) throw new Error('User not found');
    const existing = await this.getCurrentSubscription(userId);
    if (existing) return existing;
    const freePlan = await prisma.plan.findFirst({ where: { name: 'FREE', isActive: true }, include: { feature: true } });
    if (!freePlan) throw new Error('Free plan not found in the system');
    const now = new Date();
    const currentPeriodStart = DateTime.now().startOf('day');
    const currentPeriodEnd = currentPeriodStart.plus({ months: 1 });
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: currentPeriodStart.toJSDate(),
        currentPeriodEnd: currentPeriodEnd.toJSDate()
      },
      include: { plan: true, payments: true }
    });
    const usage = await prisma.usage.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        maxProjects: freePlan.feature?.maxProjects || 0,
        remainingProjects: freePlan.feature?.maxProjects || 0,
        maxTeams: freePlan.feature?.maxTeams || 0,
        remainingTeams: freePlan.feature?.maxTeams || 0,
        maxProposals: freePlan.feature?.maxProposals || 0,
        remainingProposals: freePlan.feature?.maxProposals || 0,
        maxRequests: freePlan.feature?.maxRequests || 0,
        remainingRequests: freePlan.feature?.maxRequests || 0,
        maxCredits: freePlan.feature?.maxCredits || 0,
        remainingCredits: freePlan.feature?.maxCredits || 0,
        maxTokens: freePlan.feature?.maxTokens || 0,
        remainingTokens: freePlan.feature?.maxTokens || 0,
        updatedAt: now,
      }
    });
    return subscription;
  }

  static async renew(userId: string, params: RenewInput) {
    const { planId, payment, metadata } = params;
    const current = await this.getCurrentSubscription(userId);
    if (!current) throw new Error('No active subscription found');
    if (current.plan.name === 'FREE') throw new Error('Cannot renew a free plan');
    if (current.plan.paypalPlanId && current.plan.paypalPlanId !== planId) {
      throw new Error('Plan ID mismatch - cannot renew with different plan');
    }
    const currentPeriodStart = DateTime.fromISO(params.currentCycleStart);
    const currentPeriodEnd = currentPeriodStart.plus({ months: 1 });
    return prisma.$transaction(
      async (tx) => {
        const updatedSubscription = await tx.subscription.update({
          where: { id: current.id },
          data: {
            currentPeriodStart: currentPeriodStart.toJSDate(),
            currentPeriodEnd: currentPeriodEnd.toJSDate(),
            status: SubscriptionStatus.ACTIVE,
            updatedAt: new Date()
          }
        });
        const newPayment = await tx.payment.create({
          data: {
            userId,
            subscriptionId: current.id,
            amount: parseFloat(String(payment.paymentAmount)),
            currency: payment.paymentCurrency,
            billingType: BillingType.SUBSCRIPTION,
            paymentMethod: payment.paymentMethod,
            paymentGateway: payment.paymentGateway,
            status: payment.paymentStatus,
            billingPeriodStart: currentPeriodStart.toJSDate(),
            billingPeriodEnd: currentPeriodEnd.toJSDate(),
            metadata: metadata as any
          }
        });
        await UsageManager.resetUsageCounts(current, userId);
        await tx.notification.create({
          data: {
            userId,
            type: NotificationType.SUBSCRIPTION,
            title: `Subscription Renewed: ${current.plan.displayName || current.plan.name}`,
            content: `Your subscription has been renewed. New billing period: ${currentPeriodStart.toFormat('MMM dd, yyyy')} to ${currentPeriodEnd.toFormat('MMM dd, yyyy')}.`
          }
        });
        return { subscription: updatedSubscription, payment: newPayment };
      },
      {
        maxWait: this.MAX_WAIT,
        timeout: this.TRANSACTION_TIMEOUT,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );
  }

  static async activate(
    userId: string,
    params: {
      status: string;
      planId: string;
      subId: string;
      planName?: string;
      payment: SubscribeInput['payment'];
      createdAt?: string;
      updatedAt?: string;
      metadata?: Record<string, any>;
      currentPeriodStart?: string | DateTime;
      currentPeriodEnd?: string | DateTime;
    }
  ) {
    if (!userId) throw new Error('User not found');
    if (!params.planId) {
      throw new Error('Target plan could not be resolved for activation');
    }
    if (!params.payment) {
      throw new Error('Payment details are required for activation');
    }
    return prisma.$transaction(async (tx) => {
      const duplicate = await tx.subscription.findFirst({ where: { subId: params.subId } });
      if (duplicate) return duplicate;
      const current = await this.getCurrentSubscription(userId);
      const created = await SubscriptionManager.subscribe({
        userId,
        subId: params.subId,
        planId: params.planId,
        status: params.status,
        payment: params.payment,
        metadata: params.metadata,
        currentCycleStart: DateTime.fromISO(String(params.currentPeriodStart)),
        currentCycleEnd: DateTime.fromISO(String(params.currentPeriodEnd)),
        createdAt: params.createdAt,
        updatedAt: params.updatedAt,
      });
      return created;
    }, { timeout: this.TRANSACTION_TIMEOUT, maxWait: this.MAX_WAIT, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async suspend(userId: string, params: { subscriptionId: string }) {
    const subscription = await prisma.subscription.findFirst({
      where: { subId: params.subscriptionId, userId },
      include: { payments: true, plan: true },
    });
    if (!subscription) {
      throw new Error(`Subscription not found for ID ${params.subscriptionId}`);
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAUSED },
      include: { payments: true, plan: true },
    });
    return updated;
  }


  static async reactivate(userId: string, params: { subscriptionId: string }) {
    const subscription = await prisma.subscription.findFirst({
      where: { subId: params.subscriptionId, userId },
      include: { payments: true, plan: true },
    });
    if (!subscription) {
      throw new Error(`Subscription not found for ID ${params.subscriptionId}`);
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.ACTIVE },
      include: { payments: true, plan: true },
    });
    return updated;
  }


  static async expire(userId: string, params: { subscriptionId: string }) {
    const subscription = await prisma.subscription.findFirst({
      where: { subId: params.subscriptionId, userId },
      include: { payments: true, plan: true },
    });
    if (!subscription) {
      throw new Error(`Subscription not found for ID ${params.subscriptionId}`);
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.EXPIRED },
      include: { payments: true, plan: true },
    });
    return updated;
  }


  static async reset(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    await prisma.$transaction(
      async (tx) => {
        await tx.subscription.updateMany({ where: { userId: user.id, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] } }, data: { status: SubscriptionStatus.CANCELED, currentPeriodEnd: new Date() } });
        await tx.payment.updateMany({ where: { subscription: { userId: user.id, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] } }, status: PaymentStatus.PENDING }, data: { status: PaymentStatus.CANCELED } });
      },
      { maxWait: this.MAX_WAIT, isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: this.TRANSACTION_TIMEOUT }
    );
    return this.createDefaultSubscription(userId);
  }

  static async cancel(userId: string, params: { subscriptionId: string, reason?: string, canceledAt: DateTime }) {
    const subscription = await prisma.subscription.findFirst({
      where: { subId: params.subscriptionId, userId },
      include: { payments: true, plan: true },
    });
    if (!subscription) {
      throw new Error(`Subscription not found for ID ${params.subscriptionId}`);
    }
    const now = DateTime.now().toUTC();
    const canceledAt = subscription.canceledAt ? DateTime.fromJSDate(subscription.canceledAt).toUTC() : now;
    const currentPeriodEnd = DateTime.fromJSDate(subscription.currentPeriodEnd).toUTC();
    const isEarlyCancel = now < currentPeriodEnd;
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { subscriptionId: subscription.id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.CANCELED
        },
      });
      if (isEarlyCancel) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ON_HOLD,
            cancelAtPeriodEnd: true,
          },
        });
      } else {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            currentPeriodEnd: new Date(),
          },
        });
      }
    });

    if (!isEarlyCancel) {
      await this.reset(userId);
    }
    return {
      message: isEarlyCancel
        ? 'Subscription will be canceled at the end of the current billing period'
        : 'Subscription canceled immediately',
      effectiveDate: currentPeriodEnd.toISO(),
    };
  }

  static async updatePaymentStatus(userId: string, chargeId: string, status: PaymentStatus): Promise<void> {
    const current = await this.getCurrentSubscription(userId);
    if (!current) throw new Error('No active subscription found');
    const latest = await prisma.payment.findFirst({ where: { subscriptionId: current.id }, orderBy: { createdAt: 'desc' } });
    if (!latest) throw new Error('No pending payment found for this subscription');
    await prisma.$transaction(
      async (tx) => {
        await tx.payment.update({ where: { id: latest.id }, data: { status, chargeId, processedAt: new Date() } });
        if (status === PaymentStatus.SUCCEEDED) {
          await tx.subscription.update({ where: { id: current.id }, data: { status: SubscriptionStatus.ACTIVE } });
          await UsageManager.resetUsageCounts(current as any, userId);
        } else if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELED) {
          await tx.subscription.update({ where: { id: current.id }, data: { status: SubscriptionStatus.EXPIRED } });
        }
      },
      { maxWait: this.MAX_WAIT, isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: this.TRANSACTION_TIMEOUT }
    );
  }

  static async checkSubscriptionStatus(planName: string, userId: string, canceled?: boolean): Promise<'SUBSCRIBE' | 'RENEW' | 'UPDATE' | 'CANCEL'> {
    const current = await this.getCurrentSubscription(userId);
    if (canceled) return 'CANCEL';
    if (!current) return 'SUBSCRIBE';
    const currentPlanName = current.plan?.name;
    const isExpired = current.status === SubscriptionStatus.EXPIRED;
    if (isExpired || currentPlanName === planName) return 'RENEW';
    if (currentPlanName && currentPlanName !== planName) return 'UPDATE';
    return 'SUBSCRIBE';
  }

  static async checkAndManageCycle(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) throw new Error('No active subscription found');
    const now = DateTime.utc();
    const currentPeriodEnd = DateTime.fromJSDate(subscription.currentPeriodEnd).toUTC();
    const daysUntilExpiration = Math.floor(currentPeriodEnd.diff(now, 'days').days);
    const isExpired = now.toMillis() > currentPeriodEnd.toMillis();
    let nextCycleStart: Date | undefined;
    let nextCycleEnd: Date | undefined;
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      nextCycleStart = currentPeriodEnd.toJSDate();
      nextCycleEnd = currentPeriodEnd.plus({ months: 1 }).toJSDate();
    }
    return {
      isExpired,
      daysUntilExpiration,
      isCycleTransition: now.startOf('day').toMillis() === currentPeriodEnd.startOf('day').toMillis(),
      currentCycleStart: subscription.currentPeriodStart,
      currentCycleEnd: subscription.currentPeriodEnd,
      nextCycleStart,
      nextCycleEnd
    };
  }

  static async handleCycleTransition(userId: string): Promise<void> {
    const cycle = await this.checkAndManageCycle(userId);
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) throw new Error('No active subscription found');
    const now = DateTime.now().toUTC();
    if (cycle.isExpired) {
      await UsageManager.resetUsageCounts(subscription as any, userId);
      // FREE plan: just reset period
      if (subscription.plan.name === 'FREE') {
        const currentPeriodStart = now.startOf('day');
        const currentPeriodEnd = currentPeriodStart.plus({ months: 1 });
        await this.updateCycleDates(
          userId,
          currentPeriodStart.toJSDate(),
          currentPeriodEnd.toJSDate()
        );
        return;
      }
      // 🔹 If it was ON_HOLD (user canceled mid-cycle), now fully cancel
      if (subscription.status === SubscriptionStatus.ON_HOLD) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.CANCELED },
        });
        await this.reset(userId);
        return;
      }
    }
  }

  static async updateCycleDates(userId: string, newCurrentPeriodStart?: Date, newCurrentPeriodEnd?: Date): Promise<void> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) throw new Error('No active subscription found');
    const updateData: any = {};
    if (newCurrentPeriodStart) {
      updateData.currentPeriodStart = newCurrentPeriodStart;
      if (!newCurrentPeriodEnd) {
        updateData.currentPeriodEnd = DateTime.fromJSDate(newCurrentPeriodStart).plus({ months: 1 }).toJSDate();
      }
    }
    if (newCurrentPeriodEnd) {
      updateData.currentPeriodEnd = newCurrentPeriodEnd;
      if (!newCurrentPeriodStart) {
        const proposed = DateTime.fromJSDate(newCurrentPeriodEnd).minus({ months: 1 });
        const currentStart = DateTime.fromJSDate(subscription.currentPeriodStart);
        updateData.currentPeriodStart = (proposed > currentStart ? proposed : currentStart).toJSDate();
      }
    }
    await prisma.$transaction(
      async (tx) => {
        await tx.subscription.update({ where: { id: subscription.id }, data: { ...updateData } });
        const currentPayment = await tx.payment.findFirst({ where: { subscriptionId: subscription.id, status: PaymentStatus.PENDING }, orderBy: { createdAt: 'desc' } });
        if (currentPayment) {
          await tx.payment.update({
            where: { id: currentPayment.id },
            data: {
              billingPeriodStart: updateData.currentPeriodStart || currentPayment.billingPeriodStart,
              billingPeriodEnd: updateData.currentPeriodEnd || currentPayment.billingPeriodEnd
            }
          });
        }
      },
      { maxWait: this.MAX_WAIT, isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: this.TRANSACTION_TIMEOUT }
    );
    const now = DateTime.utc();
    const newCycleStart = DateTime.fromJSDate(updateData.currentPeriodStart || subscription.currentPeriodStart).toUTC();
    if (now.startOf('day').toMillis() === newCycleStart.startOf('day').toMillis()) {
      await UsageManager.resetUsageCounts(subscription as any, userId);
    }
  }

  /**
   * Check if subscription exists with the same subscription ID
   */
  static async checkSubscriptionExists(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { subId: subscriptionId }
      });
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription existence:', error);
      return false;
    }
  }

  /**
   * Update subscription metadata to prevent duplicate status modals
   */
  static async updateSubscriptionMetadata(subscriptionId: string, metadata: Record<string, any>): Promise<void> {
    try {
      await prisma.subscription.updateMany({
        where: { subId: subscriptionId },
        data: { metadata }
      });
    } catch (error) {
      console.error('Error updating subscription metadata:', error);
      throw error;
    }
  }

  /**
   * Update payment metadata to prevent duplicate status modals
   */
  static async updatePaymentMetadata(
    paymentId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      if (!paymentId) throw new Error('Payment ID is required');

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          metadata: metadata as any
        }
      });
    } catch (error) {
      console.error('Error updating payment metadata:', error);
      throw error;
    }
  }
}
