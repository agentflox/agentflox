import { Module } from '@nestjs/common';
import { BillingController } from '../controllers/billing.controller';
import { PlanService } from '../services/billing/plan.service';
import { PaymentService } from '../services/billing/payment.service';
import { CreditService } from '../services/billing/credit.service';
import { SubscriptionService } from '../services/billing/subscription.service';

import { PayPalPaymentService } from '../services/billing/paypal-payment.service';
import { PayPalWebhookService } from '../services/billing/paypal-webhook.service';
import { StripePaymentService } from '../services/billing/stripe-payment.service';
import { StripeWebhookService } from '../services/billing/stripe-webhook.service';
import { BillingStatusService } from '../services/billing/billing-status.service';

@Module({
    controllers: [BillingController],
    providers: [
        PlanService,
        PaymentService,
        CreditService,
        SubscriptionService,

        PayPalPaymentService,
        PayPalWebhookService,
        StripePaymentService,
        StripeWebhookService,
        BillingStatusService
    ],
    exports: [
        PlanService,
        PaymentService,
        CreditService,
        SubscriptionService,

        PayPalPaymentService,
        PayPalWebhookService,
        StripePaymentService,
        StripeWebhookService,
        BillingStatusService
    ]
})
export class BillingModule {
}

