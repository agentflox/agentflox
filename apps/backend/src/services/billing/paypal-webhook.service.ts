import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PaypalWebhookManager } from '@/services/billing/webhooks/paypal';
import { env } from '@/config/env';

/**
 * PayPal Webhook Service
 * Handles PayPal webhook verification and processing
 */
@Injectable()
export class PayPalWebhookService {
    private readonly logger = new Logger(PayPalWebhookService.name);

    /**
     * Process PayPal webhook events
     */
    async processWebhook(body: any, headers: Record<string, string>) {
        try {
            let event;
            try {
                event = typeof body === 'string' ? JSON.parse(body) : body;
            } catch {
                this.logger.error('Invalid JSON in webhook body');
                throw new BadRequestException('Invalid JSON');
            }

            const webhookId = env.PAYPAL_WEBHOOK_ID;
            if (!webhookId) {
                this.logger.error('PAYPAL_WEBHOOK_ID is not configured');
                throw new HttpException('Server misconfiguration', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            // Verify webhook signature
            const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
            const isValid = await PaypalWebhookManager.verifyWebhookSignature(
                webhookId,
                headers,
                rawBody
            );

            if (!isValid) {
                this.logger.error('Invalid PayPal webhook signature');
                throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
            }

            this.logger.log(`PayPal Webhook Received: ${event.event_type}`);

            const permittedEvents: string[] = [
                'BILLING.SUBSCRIPTION.CREATED',
                'BILLING.SUBSCRIPTION.ACTIVATED',
                'BILLING.SUBSCRIPTION.UPDATED',
                'BILLING.SUBSCRIPTION.SUSPENDED',
                'BILLING.SUBSCRIPTION.CANCELLED',
                'BILLING.SUBSCRIPTION.EXPIRED',
                'PAYMENT.SALE.COMPLETED',
                'PAYMENT.SALE.DENIED',
                'PAYMENT.SALE.REFUNDED',
            ];

            if (!permittedEvents.includes(event.event_type)) {
                this.logger.log(`Unhandled PayPal event: ${event.event_type}`);
                return { message: 'Event ignored' };
            }

            try {
                await PaypalWebhookManager.queueWebhook(event);
                await PaypalWebhookManager.processWebhook(event);
                this.logger.log(`PayPal Webhook processed: ${event.event_type}`);
            } catch (err) {
                this.logger.error(`Error processing PayPal event: ${event.event_type}`, err);
                throw new HttpException('Webhook processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            return { success: true };
        } catch (error) {
            this.logger.error('Unexpected PayPal webhook error:', error);
            const err = error as any;
            throw new HttpException(
                err?.message || 'Internal server error',
                err?.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
