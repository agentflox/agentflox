import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { client } from '@/lib/paypal/server';
import { OrdersController, CheckoutPaymentIntent, OrderApplicationContextUserAction, OrderApplicationContextShippingPreference } from '@paypal/paypal-server-sdk';
import { CreditManager } from '@/services/billing/managers/credit.manager';
import { SubscriptionManager } from '@/services/billing/managers/subscription.manager';
import { PAYMENT_GATEWAY, PAYMENT_METHOD } from '@/services/billing/types';
import { DateTime } from 'luxon';
import { env } from '@/config/env';

interface CreateOrderParams {
    userId: string;
    packageId: string;
    pkg: {
        id: string;
        name: string;
        price: number;
        description?: string;
    };
    returnUrl?: string;
    cancelUrl?: string;
}

interface CapturePaymentParams {
    orderId: string;
    userId: string;
}

interface ActivateSubscriptionParams {
    userId: string;
    subscriptionDetails: Record<string, any>;
}

interface CancelSubscriptionParams {
    userId: string;
    subscriptionId: string;
    reason?: string;
}

/**
 * PayPal Payment Service
 * Handles all PayPal payment operations including orders, subscriptions, and cancellations
 */
@Injectable()
export class PayPalPaymentService {
    private readonly logger = new Logger(PayPalPaymentService.name);

    /**
     * Create a PayPal order for one-time credit purchase
     */
    async createOrder(params: CreateOrderParams) {
        try {
            const { userId, pkg, returnUrl, cancelUrl } = params;

            const ordersController = new OrdersController(client);

            const defaultReturnUrl = `${env.APP_BASE_URL}/dashboard/billing/upgrade?client=success`;
            const defaultCancelUrl = `${env.APP_BASE_URL}/dashboard/billing/upgrade?client=cancel`;

            const { result } = await ordersController.createOrder({
                prefer: 'return=minimal',
                body: {
                    intent: CheckoutPaymentIntent.Capture,
                    purchaseUnits: [
                        {
                            amount: {
                                currencyCode: 'USD',
                                value: pkg.price.toFixed(2),
                            },
                            customId: userId,
                            description: pkg.description || pkg.name,
                            referenceId: pkg.id,
                        },
                    ],
                    applicationContext: {
                        returnUrl: returnUrl || defaultReturnUrl,
                        cancelUrl: cancelUrl || defaultCancelUrl,
                        brandName: env.APP_BRAND_NAME,
                        userAction: OrderApplicationContextUserAction.PayNow,
                        shippingPreference: OrderApplicationContextShippingPreference.NoShipping,
                    },
                },
            });

            this.logger.log(`PayPal order created: ${result.id} for user ${userId}`);
            return result;
        } catch (error) {
            this.logger.error('PayPal order creation error:', error);
            if (error instanceof HttpException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new HttpException(
                `Failed to create PayPal order: ${errorMessage}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Capture a PayPal payment after user approval
     */
    async capturePayment(params: CapturePaymentParams) {
        try {
            const { orderId, userId } = params;

            if (!orderId) {
                throw new BadRequestException('Missing orderId');
            }

            const ordersController = new OrdersController(client);

            const { result } = await ordersController.captureOrder({
                id: orderId,
                prefer: 'return=representation',
            });

            const purchaseUnit = result.purchaseUnits?.[0];
            const capture = purchaseUnit?.payments?.captures?.[0];
            const packageId = purchaseUnit?.referenceId ?? '';

            if (!capture || !packageId) {
                throw new Error('Missing capture data from PayPal response.');
            }

            // Idempotency: avoid processing if order already exists
            const exists = await CreditManager.checkOrderExists(result.id ?? '');
            if (exists) {
                this.logger.log(`Order ${result.id} already processed`);
                return {
                    ok: true,
                    message: 'Order already processed',
                    id: result.id,
                };
            }

            // Process the credit purchase
            await CreditManager.purchase(userId, {
                orderId: result.id ?? '',
                status: result.status ?? 'COMPLETED',
                packageId,
                payment: {
                    paymentId: capture.id ?? '',
                    paymentMethod: PAYMENT_METHOD.E_WALLET,
                    paymentGateway: PAYMENT_GATEWAY.PAYPAL,
                    paymentAmount: capture.amount?.value ?? null,
                    paymentCurrency: capture.amount?.currencyCode ?? null,
                    paymentTime: capture.createTime ?? null,
                    paymentStatus: capture.status ?? null,
                },
                metadata: {
                    showModal: false,
                    payer: result.payer ?? null,
                    paymentSource: result.paymentSource ?? null,
                    links: result.links ?? [],
                },
            });

            this.logger.log(`PayPal payment captured: ${result.id} for user ${userId}`);
            return result;
        } catch (error) {
            this.logger.error('PayPal capture error:', error);
            if (error instanceof HttpException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new HttpException(
                `Capture failed: ${errorMessage}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Activate a PayPal subscription
     */
    async activateSubscription(params: ActivateSubscriptionParams) {
        try {
            const { userId, subscriptionDetails } = params;

            if (!subscriptionDetails) {
                throw new BadRequestException('Failed to get subscription details');
            }

            const subId = subscriptionDetails.id as string;
            const planId = subscriptionDetails.plan_id;
            const billingInfo = subscriptionDetails.billing_info ?? {};
            const lastPayment = billingInfo.last_payment ?? {};
            const nextBillingTime = billingInfo.next_billing_time ?? null;

            if (!userId || !subId || !planId) {
                throw new BadRequestException('Missing required subscription information');
            }

            await SubscriptionManager.activate(userId, {
                subId,
                planId,
                status: (subscriptionDetails.status as string) || 'ACTIVE',
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
                currentPeriodStart: subscriptionDetails.start_time,
                currentPeriodEnd: nextBillingTime,
                createdAt: subscriptionDetails.create_time as string | undefined,
                updatedAt: subscriptionDetails.update_time as string | undefined,
                metadata: {
                    eventType: 'subscription_activated',
                    subscriber: subscriptionDetails.subscriber ?? null,
                    quantity: subscriptionDetails.quantity ?? null,
                    shippingAmount: subscriptionDetails.shipping_amount ?? null,
                    billingInfo,
                    links: subscriptionDetails.links ?? [],
                    showModal: false,
                },
            });

            this.logger.log(`PayPal subscription activated: ${subId} for user ${userId}`);
            return {
                success: true,
                data: { subId, planId },
            };
        } catch (error) {
            this.logger.error('Subscription activation error:', error);
            if (error instanceof HttpException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Cancel a PayPal subscription
     */
    async cancelSubscription(params: CancelSubscriptionParams) {
        try {
            const { userId, subscriptionId, reason } = params;

            if (!userId) {
                throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
            }

            if (!subscriptionId) {
                throw new BadRequestException('Missing subscriptionId');
            }

            const paypalApiUrl = `https://api.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`;
            const accessToken = await this.getAccessToken();

            const response = await fetch(paypalApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    reason: reason || 'User requested cancellation',
                }),
            });

            const resultText = await response.text();
            let resultJson: any;
            try {
                resultJson = JSON.parse(resultText);
            } catch {
                resultJson = { raw: resultText };
            }

            if (!response.ok) {
                this.logger.error('PayPal cancel failed:', resultJson);
                const errorMsg =
                    resultJson?.error_description ||
                    resultJson?.message ||
                    'PayPal cancellation failed';
                throw new HttpException(errorMsg, response.status);
            }

            // Update local subscription status
            try {
                await SubscriptionManager.cancel(userId, {
                    subscriptionId,
                    reason,
                    canceledAt: DateTime.now(),
                });
            } catch (subErr) {
                this.logger.error('Failed to update local subscription:', subErr);
            }

            this.logger.log(`PayPal subscription cancelled: ${subscriptionId} for user ${userId}`);
            return resultJson;
        } catch (error) {
            this.logger.error('Unexpected error in PayPal cancellation:', error);
            if (error instanceof HttpException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get PayPal access token for API calls
     * @private
     */
    private async getAccessToken(): Promise<string> {
        const tokenUrl = 'https://api.paypal.com/v1/oauth2/token';

        const res = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: 'grant_type=client_credentials',
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to retrieve PayPal access token: ${err}`);
        }

        const data = await res.json();
        return data.access_token;
    }
}
