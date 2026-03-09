import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { StripeWebhookManager } from '@/services/billing/webhooks/stripe';
import type Stripe from 'stripe';
import { env } from '@/config/env';

/**
 * Stripe Webhook Service
 * Handles Stripe webhook verification and processing
 */
@Injectable()
export class StripeWebhookService {
    private readonly logger = new Logger(StripeWebhookService.name);

    /**
     * Process Stripe webhook events
     */
    async processWebhook(body: string, signature: string) {
        let event: Stripe.Event;

        try {
            if (!signature) {
                this.logger.error('Missing Stripe signature header');
                throw new BadRequestException('Missing signature');
            }

            event = await StripeWebhookManager.verifyWebhookSignature(
                body,
                signature,
                env.STRIPE_WEBHOOK_SECRET as string
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            this.logger.error(`Stripe Webhook Signature Verification Failed: ${message}`);
            throw new BadRequestException(`Webhook Error: ${message}`);
        }

        this.logger.log(`Stripe Webhook Received: ${event.type} (${event.id})`);

        const allowedEvents: string[] = [
            'checkout.session.completed',
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'invoice.paid',
            'invoice.payment_failed',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
        ];

        if (!allowedEvents.includes(event.type)) {
            this.logger.log(`Unhandled event type: ${event.type}`);
            return { message: 'Unhandled event type' };
        }

        try {
            await StripeWebhookManager.queueWebhook(event);
            await StripeWebhookManager.processWebhook(event);
            this.logger.log(`Webhook processed successfully for ${event.type}`);
            return { message: 'Success' };
        } catch (error) {
            this.logger.error('Stripe Webhook Processing Failed:', error);
            const message = error instanceof Error ? error.message : 'Webhook processing failed';
            throw new HttpException(
                message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
