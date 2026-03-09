import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { stripe } from '@/lib/stripe/server';
import type Stripe from 'stripe';
import { CreditManager } from '@/services/billing/managers/credit.manager';
import { SubscriptionManager } from '@/services/billing/managers/subscription.manager';
import { PAYMENT_METHOD, PAYMENT_GATEWAY } from '@/services/billing/types';
import { DateTime } from 'luxon';
import { env } from '@/config/env';

interface CreateCheckoutSessionParams {
    userId: string;
    priceId: string;
    quantity?: number;
    packageId: string;
    successUrl?: string;
    cancelUrl?: string;
}

interface CreateSubscriptionSessionParams {
    userId: string;
    priceId: string;
    planId: string;
    quantity?: number;
    trialPeriodDays?: number;
    successUrl?: string;
    cancelUrl?: string;
}

interface ProcessCheckoutCallbackParams {
    sessionId: string;
}

interface ProcessSubscriptionCallbackParams {
    sessionId: string;
}

interface CancelSubscriptionParams {
    userId: string;
    subscriptionId: string;
    reason?: string;
}

/**
 * Stripe Payment Service
 * Handles all Stripe payment operations including checkout, subscriptions, and callbacks
 */
@Injectable()
export class StripePaymentService {
    private readonly logger = new Logger(StripePaymentService.name);

    /**
     * Create a Stripe checkout session for one-time payment
     */
    async createCheckoutSession(params: CreateCheckoutSessionParams) {
        try {
            const { userId, priceId, quantity = 1, packageId, successUrl, cancelUrl } = params;

            const defaultSuccessUrl = `${env.APP_BASE_URL}/api/billing/stripe/checkout/callback?session_id={CHECKOUT_SESSION_ID}&status=success`;
            const defaultCancelUrl = `${env.APP_BASE_URL}/dashboard/billing/upgrade`;

            const options: Stripe.Checkout.SessionCreateParams = {
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity,
                    },
                ],
                mode: 'payment',
                success_url: successUrl || defaultSuccessUrl,
                cancel_url: cancelUrl || defaultCancelUrl,
                client_reference_id: userId,
                metadata: {
                    billingType: 'ONE_TIME',
                    packageId,
                    userId,
                },
            };

            const checkoutSession = await stripe.checkout.sessions.create(options);
            this.logger.log(`Stripe checkout session created: ${checkoutSession.id} for user ${userId}`);

            return { result: checkoutSession, ok: true };
        } catch (error) {
            this.logger.error('Stripe checkout session creation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new HttpException(
                `Failed to create checkout session: ${errorMessage}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Create a Stripe subscription checkout session
     */
    async createSubscriptionSession(params: CreateSubscriptionSessionParams) {
        try {
            const { userId, priceId, planId, quantity = 1, trialPeriodDays, successUrl, cancelUrl } = params;

            const defaultSuccessUrl = `${env.APP_BASE_URL}/api/billing/stripe/subscribe/callback?session_id={CHECKOUT_SESSION_ID}&status=success`;
            const defaultCancelUrl = `${env.APP_BASE_URL}/dashboard/billing/upgrade`;

            const trialEnd =
                typeof trialPeriodDays === 'number' && trialPeriodDays > 0
                    ? Math.floor((Date.now() + trialPeriodDays * 24 * 60 * 60 * 1000) / 1000)
                    : undefined;

            const options: Stripe.Checkout.SessionCreateParams = {
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity,
                    },
                ],
                subscription_data: {
                    ...(trialEnd ? { trial_end: trialEnd } : {}),
                    metadata: {
                        userId,
                        planId,
                    },
                },
                mode: 'subscription',
                success_url: successUrl || defaultSuccessUrl,
                cancel_url: cancelUrl || defaultCancelUrl,
                client_reference_id: userId,
                metadata: {
                    billingType: 'SUBSCRIPTION',
                    planId,
                    userId,
                },
            };

            const checkoutSession = await stripe.checkout.sessions.create(options);
            this.logger.log(`Stripe subscription session created: ${checkoutSession.id} for user ${userId}`);

            return { result: checkoutSession, ok: true };
        } catch (error) {
            this.logger.error('Stripe subscription session creation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new HttpException(
                `Failed to create subscription session: ${errorMessage}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Process checkout callback after successful payment
     */
    async processCheckoutCallback(params: ProcessCheckoutCallbackParams) {
        try {
            const { sessionId } = params;

            if (!sessionId) {
                throw new BadRequestException('Missing session_id');
            }

            const session = await stripe.checkout.sessions.retrieve(sessionId);

            if (!session) {
                throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
            }

            const userId = session.metadata?.userId;
            const packageId = session.metadata?.packageId;

            if (!userId || !packageId) {
                throw new BadRequestException('Missing metadata (userId or packageId)');
            }

            if (session.payment_status === 'paid' && session.status === 'complete') {
                // Idempotency: avoid processing if order already exists
                const exists = await CreditManager.checkOrderExists(session.id);
                if (exists) {
                    this.logger.log(`Order ${session.id} already processed`);
                    return {
                        success: true,
                        alreadyProcessed: true,
                        orderId: session.id,
                    };
                }

                await CreditManager.purchase(userId, {
                    orderId: session.id,
                    status: session.payment_status.toUpperCase(),
                    packageId,
                    payment: {
                        paymentId: session.payment_intent as string,
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
                        showModal: false,
                        discounts: session.discounts || [],
                        paymentIntentId: session.payment_intent,
                        stripeCheckoutSessionId: session.id,
                        payer: {
                            id: session.customer,
                            details: session.customer_details,
                            email: session.customer_details?.email || session.customer_email || null,
                        },
                    },
                });

                this.logger.log(`Stripe checkout processed: ${session.id} for user ${userId}`);
                return {
                    success: true,
                    orderId: session.id,
                };
            }

            throw new HttpException('Payment not completed', HttpStatus.BAD_REQUEST);
        } catch (error) {
            this.logger.error('Stripe checkout callback error:', error);
            if (error instanceof HttpException) throw error;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new HttpException(
                `Checkout callback failed: ${errorMessage}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Process subscription callback after successful payment
     */
    async processSubscriptionCallback(params: ProcessSubscriptionCallbackParams) {
        try {
            const { sessionId } = params;

            if (!sessionId) {
                throw new BadRequestException('Missing session_id');
            }

            const session = await stripe.checkout.sessions.retrieve(sessionId);

            if (!session) {
                throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
            }

            const userId = session.metadata?.userId;
            const planId = session.metadata?.planId;

            if (!userId || !planId) {
                throw new BadRequestException('Missing metadata (userId or planId)');
            }

            if (session.payment_status === 'paid' && session.status === 'complete') {
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

                if (subscription) {
                    const currentPeriodStartTimestamp = subscription.current_period_start;
                    const currentPeriodEndTimestamp = subscription.current_period_end;

                    const currentPeriodStartDateObject = currentPeriodStartTimestamp
                        ? new Date(currentPeriodStartTimestamp * 1000)
                        : new Date();

                    const currentPeriodStart = currentPeriodStartDateObject.toISOString();

                    const currentPeriodEnd = currentPeriodEndTimestamp
                        ? new Date(currentPeriodEndTimestamp * 1000).toISOString()
                        : new Date(currentPeriodStartDateObject.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

                    await SubscriptionManager.activate(userId, {
                        subId: subscription.id,
                        planId,
                        status: subscription.status?.toUpperCase() || 'ACTIVE',
                        payment: {
                            paymentId: session.payment_intent as string,
                            paymentMethod: PAYMENT_METHOD.CREDIT_CARD,
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
                            paymentIntentId: session.payment_intent,
                            discounts: session.discounts || [],
                            payer: {
                                id: session.customer,
                                details: session.customer_details,
                                email: session.customer_details?.email || session.customer_email || null,
                            },
                            showModal: false,
                        },
                    });

                    this.logger.log(`Stripe subscription activated: ${subscription.id} for user ${userId}`);
                    return {
                        success: true,
                        subscriptionId: subscription.id,
                    };
                }
            }

            throw new HttpException('Payment not completed', HttpStatus.BAD_REQUEST);
        } catch (error) {
            this.logger.error('Stripe subscription callback error:', error);
            if (error instanceof HttpException) throw error;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new HttpException(
                `Subscription callback failed: ${errorMessage}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Cancel a Stripe subscription
     */
    async cancelSubscription(params: CancelSubscriptionParams) {
        try {
            const { userId, subscriptionId, reason } = params;

            if (!userId) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }

            if (!subscriptionId) {
                throw new BadRequestException('Missing subscription ID');
            }

            // Cancel the subscription in Stripe
            const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);

            // Update local subscription status
            await SubscriptionManager.cancel(userId, {
                subscriptionId,
                reason,
                canceledAt: DateTime.now(),
            });

            this.logger.log(`Stripe subscription cancelled: ${subscriptionId} for user ${userId}`);
            return {
                success: true,
                data: {
                    subscriptionId: canceledSubscription.id,
                    status: canceledSubscription.status,
                    canceledAt: canceledSubscription.canceled_at,
                },
            };
        } catch (error) {
            this.logger.error('Stripe cancellation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
