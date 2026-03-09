import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionManager } from '@/services/billing/managers/subscription.manager';
import { SubscribeInput, RenewInput } from '@/services/billing/types';
import { PaymentStatus } from '@agentflox/database';

@Injectable()
export class SubscriptionService {
    private readonly logger = new Logger(SubscriptionService.name);

    async getCurrentSubscription(userId: string) {
        try {
            return await SubscriptionManager.getCurrentSubscription(userId);
        } catch (error) {
            this.logger.error(`Error getting current subscription for user ${userId}:`, error);
            throw new HttpException('Failed to retrieve current subscription', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getSubscriptionById(subscriptionId: string) {
        try {
            return await SubscriptionManager.getSubscriptionById(subscriptionId);
        } catch (error) {
            this.logger.error(`Error getting subscription ${subscriptionId}:`, error);
            throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
        }
    }

    async getSubscriptionDetails(userId: string) {
        try {
            return await SubscriptionManager.getSubscriptionDetails(userId);
        } catch (error) {
            this.logger.error(`Error getting subscription details for user ${userId}:`, error);
            throw new HttpException('Failed to retrieve subscription details', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async subscribe(data: SubscribeInput) {
        try {
            return await SubscriptionManager.subscribe(data);
        } catch (error) {
            this.logger.error('Error processing subscription:', error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Subscription failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createDefaultSubscription(userId: string) {
        try {
            return await SubscriptionManager.createDefaultSubscription(userId);
        } catch (error) {
            this.logger.error(`Error creating default subscription for user ${userId}:`, error);
            throw new HttpException('Failed to create default subscription', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async renew(userId: string, params: RenewInput) {
        try {
            return await SubscriptionManager.renew(userId, params);
        } catch (error) {
            this.logger.error(`Error renewing subscription for user ${userId}:`, error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Renewal failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async activate(userId: string, params: any) {
        try {
            return await SubscriptionManager.activate(userId, params);
        } catch (error) {
            this.logger.error(`Error activating subscription for user ${userId}:`, error);
            throw new HttpException('Activation failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async suspend(userId: string, params: { subscriptionId: string }) {
        try {
            return await SubscriptionManager.suspend(userId, params);
        } catch (error) {
            this.logger.error(`Error suspending subscription for user ${userId}:`, error);
            throw new HttpException('Suspension failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async reactivate(userId: string, params: { subscriptionId: string }) {
        try {
            return await SubscriptionManager.reactivate(userId, params);
        } catch (error) {
            this.logger.error(`Error reactivating subscription for user ${userId}:`, error);
            throw new HttpException('Reactivation failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async expire(userId: string, params: { subscriptionId: string }) {
        try {
            return await SubscriptionManager.expire(userId, params);
        } catch (error) {
            this.logger.error(`Error expiring subscription for user ${userId}:`, error);
            throw new HttpException('Expiration failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async reset(userId: string) {
        try {
            return await SubscriptionManager.reset(userId);
        } catch (error) {
            this.logger.error(`Error resetting subscription for user ${userId}:`, error);
            throw new HttpException('Reset failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async cancel(userId: string, params: { subscriptionId: string, reason?: string, canceledAt: any }) {
        try {
            return await SubscriptionManager.cancel(userId, params);
        } catch (error) {
            this.logger.error(`Error cancelling subscription for user ${userId}:`, error);
            throw new HttpException('Cancellation failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updatePaymentStatus(userId: string, chargeId: string, status: PaymentStatus) {
        try {
            return await SubscriptionManager.updatePaymentStatus(userId, chargeId, status);
        } catch (error) {
            this.logger.error(`Error updating payment status for user ${userId}:`, error);
            throw new HttpException('Failed to update payment status', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async checkSubscriptionStatus(planName: string, userId: string, canceled?: boolean) {
        try {
            return await SubscriptionManager.checkSubscriptionStatus(planName, userId, canceled);
        } catch (error) {
            this.logger.error(`Error checking subscription status for user ${userId}:`, error);
            throw new HttpException('Failed to check subscription status', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async handleCycleTransition(userId: string) {
        try {
            return await SubscriptionManager.handleCycleTransition(userId);
        } catch (error) {
            this.logger.error(`Error handling cycle transition for user ${userId}:`, error);
            throw new HttpException('Cycle transition failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async checkSubscriptionExists(subscriptionId: string) {
        try {
            return await SubscriptionManager.checkSubscriptionExists(subscriptionId);
        } catch (error) {
            this.logger.error(`Error checking subscription existence ${subscriptionId}:`, error);
            throw new HttpException('Failed to check subscription', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateSubscriptionMetadata(subscriptionId: string, metadata: Record<string, any>) {
        try {
            return await SubscriptionManager.updateSubscriptionMetadata(subscriptionId, metadata);
        } catch (error) {
            this.logger.error(`Error updating subscription metadata ${subscriptionId}:`, error);
            throw new HttpException('Failed to update subscription metadata', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updatePaymentMetadata(paymentId: string, metadata: Record<string, any>) {
        try {
            return await SubscriptionManager.updatePaymentMetadata(paymentId, metadata);
        } catch (error) {
            this.logger.error(`Error updating payment metadata ${paymentId}:`, error);
            throw new HttpException('Failed to update payment metadata', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
