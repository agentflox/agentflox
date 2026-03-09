import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionManager } from '@/services/billing/managers/subscription.manager';
import { CreditManager } from '@/services/billing/managers/credit.manager';

interface CheckStatusParams {
    method: 'subscription' | 'checkout';
    subId?: string;
    orderId?: string;
    status: string;
}

interface UpdateStatusParams {
    method: 'subscription' | 'checkout';
    subId?: string;
    orderId?: string;
}

/**
 * Billing Status Service
 * Handles billing status checks and updates for subscriptions and orders
 */
@Injectable()
export class BillingStatusService {
    private readonly logger = new Logger(BillingStatusService.name);

    /**
     * Check billing status for subscription or checkout
     */
    async checkStatus(params: CheckStatusParams) {
        try {
            const { method, subId, orderId, status } = params;

            if (!method || (!subId && !orderId) || !status) {
                throw new BadRequestException('Missing required parameters: method, subId/orderId, and status');
            }

            let exists = false;
            let shouldShowModal = false;

            if (method === 'subscription' && subId) {
                // Check if subscription exists
                exists = await SubscriptionManager.checkSubscriptionExists(subId);

                if (exists && status === 'success') {
                    // Update metadata to prevent showing modal again
                    await SubscriptionManager.updateSubscriptionMetadata(subId, {
                        showModal: false,
                        lastStatusCheck: new Date().toISOString(),
                    });
                    shouldShowModal = true;
                }
            } else if (method === 'checkout' && orderId) {
                // Check if order exists
                exists = await CreditManager.checkOrderExists(orderId);

                if (exists && status === 'success') {
                    // Update metadata to prevent showing modal again
                    await CreditManager.updateOrderMetadata(orderId, {
                        showModal: false,
                        lastStatusCheck: new Date().toISOString(),
                    });
                    shouldShowModal = true;
                }
            }

            this.logger.log(`Billing status checked: ${method} - ${subId || orderId} - exists: ${exists}`);

            return {
                exists,
                shouldShowModal,
                status,
                method,
                id: subId || orderId,
            };
        } catch (error) {
            this.logger.error('Error checking billing status:', error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update billing status metadata
     */
    async updateStatus(params: UpdateStatusParams) {
        try {
            const { method, subId, orderId } = params;

            if (!method || (!subId && !orderId)) {
                throw new BadRequestException('Missing required parameters: method and subId/orderId');
            }

            // Update metadata to mark modal as shown
            if (method === 'subscription' && subId) {
                await SubscriptionManager.updateSubscriptionMetadata(subId, {
                    showModal: false,
                    modalShownAt: new Date().toISOString(),
                });
            } else if (method === 'checkout' && orderId) {
                await CreditManager.updateOrderMetadata(orderId, {
                    showModal: false,
                    modalShownAt: new Date().toISOString(),
                });
            }

            this.logger.log(`Billing status updated: ${method} - ${subId || orderId}`);

            return { success: true };
        } catch (error) {
            this.logger.error('Error updating billing status:', error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
