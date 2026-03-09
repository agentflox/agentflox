import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Logger,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@/middleware/httpAuth';
import { PlanService } from '../services/billing/plan.service';
import { SubscriptionService } from '../services/billing/subscription.service';
import { CreditService } from '../services/billing/credit.service';
import { PayPalPaymentService } from '../services/billing/paypal-payment.service';
import { PayPalWebhookService } from '../services/billing/paypal-webhook.service';
import { StripePaymentService } from '../services/billing/stripe-payment.service';
import { StripeWebhookService } from '../services/billing/stripe-webhook.service';
import { BillingStatusService } from '../services/billing/billing-status.service';
import {
    CreatePayPalOrderDto,
    CapturePayPalPaymentDto,
    ActivatePayPalSubscriptionDto,
    CancelPayPalSubscriptionDto,
    CreateStripeCheckoutDto,
    CreateStripeSubscriptionDto,
    CancelSubscriptionDto,
    CheckBillingStatusDto,
    UpdateBillingStatusDto,
} from '../services/billing/dto/billing.dto';
import { env } from '@/config/env';

interface AuthenticatedRequest extends Request {
    userId: string;
    user?: any;
}

/**
 * Billing Controller
 * Handles all billing-related operations including plans, subscriptions, payments, and webhooks
 */
@Controller('api/billing')
export class BillingController {
    private readonly logger = new Logger(BillingController.name);

    constructor(
        private readonly planService: PlanService,
        private readonly subscriptionService: SubscriptionService,
        private readonly creditService: CreditService,

        private readonly paypalPaymentService: PayPalPaymentService,
        private readonly paypalWebhookService: PayPalWebhookService,
        private readonly stripePaymentService: StripePaymentService,
        private readonly stripeWebhookService: StripeWebhookService,
        private readonly billingStatusService: BillingStatusService
    ) { }

    // ==================== Plan Endpoints ====================

    @Get('/plans')
    async getPlans(@Res() res: Response) {
        try {
            const plans = await this.planService.getAllPlans();
            return res.status(200).json(plans);
        } catch (error) {
            this.logger.error(`Get plans error: ${error.message}`, error.stack);
            throw new HttpException('Failed to fetch plans', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/plans/:id')
    async getPlanById(@Param('id') id: string, @Res() res: Response) {
        try {
            const plan = await this.planService.getPlan(id);
            if (!plan) throw new NotFoundException('Plan not found');
            return res.status(200).json(plan);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Failed to fetch plan', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/plans/name/:name')
    async getPlanByName(@Param('name') name: string, @Res() res: Response) {
        try {
            const plan = await this.planService.getPlanByName(name);
            if (!plan) throw new NotFoundException('Plan not found');
            return res.status(200).json(plan);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Failed to fetch plan', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ==================== Subscription Endpoints ====================

    @Get('/subscriptions/:userId/current')
    @UseGuards(JwtAuthGuard)
    async getCurrentSubscription(@Param('userId') userId: string, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            if (req.userId !== userId) throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
            const subscription = await this.subscriptionService.getCurrentSubscription(userId);
            return res.status(200).json(subscription || null);
        } catch (error) {
            this.logger.error(`Get current subscription error: ${error.message}`, error.stack);
            throw new HttpException('Failed to fetch subscription', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/subscriptions/:userId/details')
    @UseGuards(JwtAuthGuard)
    async getSubscriptionDetails(@Param('userId') userId: string, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            if (req.userId !== userId) throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
            const details = await this.subscriptionService.getSubscriptionDetails(userId);
            return res.status(200).json(details || null);
        } catch (error) {
            this.logger.error(`Get subscription details error: ${error.message}`, error.stack);
            throw new HttpException('Failed to fetch subscription details', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/subscriptions/default')
    async createDefaultSubscription(@Body() body: { userId: string }, @Res() res: Response) {
        try {
            const { userId } = body;
            if (!userId) throw new BadRequestException('UserId is required');
            // Fallback in case DI for SubscriptionService fails for any reason
            const subscriptionService =
                this.subscriptionService ?? new SubscriptionService();

            if (!this.subscriptionService) {
                this.logger.warn(
                    'SubscriptionService was not injected by Nest; using direct instance fallback in createDefaultSubscription',
                );
            }

            const subscription = await subscriptionService.createDefaultSubscription(userId);
            return res.status(201).json(subscription);
        } catch (error) {
            this.logger.error(`Create default subscription error: ${error.message}`, error.stack);
            throw new HttpException('Failed to create default subscription', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ==================== Credit Endpoints ====================

    @Get('/credits/packages')
    async getCreditPackages(@Res() res: Response) {
        try {
            const packages = await this.creditService.getAllStandardPackages();
            return res.status(200).json(packages);
        } catch (error) {
            throw new HttpException('Failed to fetch credit packages', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/credits/purchases/:userId')
    @UseGuards(JwtAuthGuard)
    async getPurchaseDetails(@Param('userId') userId: string, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            if (req.userId !== userId) throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
            const details = await this.creditService.getPurchaseDetails(userId);
            return res.status(200).json(details);
        } catch (error) {
            throw new HttpException('Failed to fetch purchase details', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ==================== PayPal Endpoints ====================

    @Post('/paypal/checkout')
    @UseGuards(JwtAuthGuard)
    async paypalCheckout(@Body() body: unknown, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            const data = CreatePayPalOrderDto.parse(body);
            if (req.userId !== data.userId) throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);

            // Lookup package by ID to ensure price consistency
            const pkg = await this.creditService.getPackageById(data.packageId);
            if (!pkg && !data.pkg) {
                throw new NotFoundException('Package not found');
            }

            const result = await this.paypalPaymentService.createOrder({
                userId: data.userId,
                packageId: data.packageId,
                pkg: pkg ? {
                    id: pkg.id,
                    name: pkg.name,
                    price: pkg.price,
                    description: pkg.description || undefined
                } : data.pkg!,
                returnUrl: data.returnUrl,
                cancelUrl: data.cancelUrl
            });
            return res.status(201).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('PayPal checkout error:', error);
            throw new HttpException('Failed to create PayPal checkout', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/paypal/capture')
    @UseGuards(JwtAuthGuard)
    async paypalCapture(@Body() body: unknown, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            const data = CapturePayPalPaymentDto.parse(body);
            if (req.userId !== data.userId) throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);

            const result = await this.paypalPaymentService.capturePayment({
                orderId: data.orderId,
                userId: data.userId
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('PayPal capture error:', error);
            throw new HttpException('Failed to capture PayPal payment', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/paypal/subscribe')
    @UseGuards(JwtAuthGuard)
    async paypalSubscribe(@Body() body: unknown, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            const data = ActivatePayPalSubscriptionDto.parse(body);
            if (req.userId !== data.userId) throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);

            const result = await this.paypalPaymentService.activateSubscription({
                userId: data.userId,
                subscriptionDetails: data.subscriptionDetails
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('PayPal subscribe error:', error);
            throw new HttpException('Failed to subscribe via PayPal', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/paypal/cancel')
    @UseGuards(JwtAuthGuard)
    async paypalCancel(@Body() body: unknown, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            const data = CancelPayPalSubscriptionDto.parse(body);

            const result = await this.paypalPaymentService.cancelSubscription({
                userId: req.userId,
                subscriptionId: data.subscriptionId,
                reason: data.reason
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('PayPal cancel error:', error);
            throw new HttpException('Failed to cancel PayPal subscription', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/paypal/webhook')
    async paypalWebhook(@Req() req: Request, @Res() res: Response) {
        try {
            const headers: Record<string, string> = {};
            req.rawHeaders.forEach((value, index) => {
                if (index % 2 === 0) {
                    headers[value.toLowerCase()] = req.rawHeaders[index + 1];
                }
            });

            const result = await this.paypalWebhookService.processWebhook(req.body, headers);
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('PayPal webhook error:', error);
            throw new HttpException('Failed to process PayPal webhook', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ==================== Stripe Endpoints ====================

    @Post('/stripe/checkout')
    @UseGuards(JwtAuthGuard)
    async stripeCheckout(@Body() body: unknown, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            const data = CreateStripeCheckoutDto.parse(body);
            if (req.userId !== data.userId) throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);

            const result = await this.stripePaymentService.createCheckoutSession({
                userId: data.userId,
                priceId: data.priceId,
                quantity: data.quantity,
                packageId: data.packageId,
                successUrl: data.successUrl,
                cancelUrl: data.cancelUrl
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Stripe checkout error:', error);
            throw new HttpException('Failed to create Stripe checkout', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/stripe/subscribe')
    @UseGuards(JwtAuthGuard)
    async stripeSubscribe(@Body() body: unknown, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            const data = CreateStripeSubscriptionDto.parse(body);
            if (req.userId !== data.userId) throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);

            const result = await this.stripePaymentService.createSubscriptionSession({
                userId: data.userId,
                priceId: data.priceId,
                planId: data.planId,
                quantity: data.quantity,
                trialPeriodDays: data.trialPeriodDays,
                successUrl: data.successUrl,
                cancelUrl: data.cancelUrl
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Stripe subscribe error:', error);
            throw new HttpException('Failed to create Stripe subscription', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/stripe/cancel')
    @UseGuards(JwtAuthGuard)
    async stripeCancel(@Body() body: unknown, @Req() req: AuthenticatedRequest, @Res() res: Response) {
        try {
            const data = CancelSubscriptionDto.parse(body);

            const result = await this.stripePaymentService.cancelSubscription({
                userId: req.userId,
                subscriptionId: data.subscriptionId,
                reason: data.reason
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Stripe cancel error:', error);
            throw new HttpException('Failed to cancel Stripe subscription', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/stripe/webhook')
    async stripeWebhook(@Req() req: Request, @Res() res: Response) {
        try {
            const body = (req as any).rawBody || JSON.stringify(req.body);
            const signature = req.headers['stripe-signature'] as string;

            const result = await this.stripeWebhookService.processWebhook(body, signature);
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Stripe webhook error:', error);
            throw new HttpException('Failed to process Stripe webhook', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Stripe Checkout Callback
    @Get('/stripe/checkout/callback')
    async stripeCheckoutCallback(@Query('session_id') sessionId: string, @Res() res: Response) {
        try {
            const result = await this.stripePaymentService.processCheckoutCallback({ sessionId });

            if (result.success) {
                return res.redirect(
                    `${env.APP_BASE_URL}/dashboard/billing/status?method=checkout&orderId=${result.orderId}&status=success`
                );
            }

            return res.redirect(`${env.APP_BASE_URL}/dashboard/billing/upgrade?error=payment_failed`);
        } catch (error) {
            this.logger.error('Stripe checkout callback error:', error);
            return res.redirect(`${env.APP_BASE_URL}/dashboard/billing/upgrade?error=callback_error`);
        }
    }

    // Stripe Subscription Callback
    @Get('/stripe/subscribe/callback')
    async stripeSubscribeCallback(@Query('session_id') sessionId: string, @Res() res: Response) {
        try {
            const result = await this.stripePaymentService.processSubscriptionCallback({ sessionId });

            if (result.success) {
                return res.redirect(
                    `${env.APP_BASE_URL}/dashboard/billing/status?method=subscription&subId=${result.subscriptionId}&status=success`
                );
            }

            return res.redirect(`${env.APP_BASE_URL}/dashboard/billing/upgrade?error=payment_failed`);
        } catch (error) {
            this.logger.error('Stripe subscription callback error:', error);
            return res.redirect(`${env.APP_BASE_URL}/dashboard/billing/upgrade?error=callback_error`);
        }
    }

    // ==================== Status Endpoints ====================

    @Get('/status')
    async checkBillingStatus(
        @Query('method') method: 'subscription' | 'checkout',
        @Query('subId') subId: string,
        @Query('orderId') orderId: string,
        @Query('status') status: string,
        @Res() res: Response
    ) {
        try {
            const result = await this.billingStatusService.checkStatus({
                method,
                subId,
                orderId,
                status
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Check billing status error:', error);
            throw new HttpException('Failed to check billing status', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/status')
    async updateBillingStatus(@Body() body: { method: 'subscription' | 'checkout'; subId?: string; orderId?: string }, @Res() res: Response) {
        try {
            const result = await this.billingStatusService.updateStatus({
                method: body.method,
                subId: body.subId,
                orderId: body.orderId
            });
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Update billing status error:', error);
            throw new HttpException('Failed to update billing status', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}