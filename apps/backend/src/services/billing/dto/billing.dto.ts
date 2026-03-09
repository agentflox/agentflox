import { z } from 'zod';

// ==================== PayPal DTOs ====================

export const CreatePayPalOrderDto = z.object({
    userId: z.string(),
    packageId: z.string(),
    pkg: z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        description: z.string().optional(),
    }).optional(),
    returnUrl: z.string().optional(),
    cancelUrl: z.string().optional(),
});

export const CapturePayPalPaymentDto = z.object({
    orderId: z.string(),
    userId: z.string(),
});

export const ActivatePayPalSubscriptionDto = z.object({
    userId: z.string(),
    subscriptionDetails: z.any(),
});

export const CancelPayPalSubscriptionDto = z.object({
    userId: z.string(),
    subscriptionId: z.string(),
    reason: z.string().optional(),
});

// ==================== Stripe DTOs ====================

export const CreateStripeCheckoutDto = z.object({
    userId: z.string(),
    packageId: z.string(),
    priceId: z.string(),
    quantity: z.number().optional().default(1),
    successUrl: z.string().optional(),
    cancelUrl: z.string().optional(),
});

export const CreateStripeSubscriptionDto = z.object({
    userId: z.string(),
    planId: z.string(),
    priceId: z.string(),
    quantity: z.number().optional().default(1),
    trialPeriodDays: z.number().optional(),
    successUrl: z.string().optional(),
    cancelUrl: z.string().optional(),
});

export const CancelSubscriptionDto = z.object({
    userId: z.string(),
    subscriptionId: z.string(),
    reason: z.string().optional(),
});

// ==================== Billing Status DTOs ====================

export const CheckBillingStatusDto = z.object({
    method: z.enum(['subscription', 'checkout']),
    subId: z.string().optional(),
    orderId: z.string().optional(),
    status: z.string(),
});

export const UpdateBillingStatusDto = z.object({
    method: z.enum(['subscription', 'checkout']),
    subId: z.string().optional(),
    orderId: z.string().optional(),
});

// ==================== Type Exports ====================

export type CreatePayPalOrderDto = z.infer<typeof CreatePayPalOrderDto>;
export type CapturePayPalPaymentDto = z.infer<typeof CapturePayPalPaymentDto>;
export type ActivatePayPalSubscriptionDto = z.infer<typeof ActivatePayPalSubscriptionDto>;
export type CancelPayPalSubscriptionDto = z.infer<typeof CancelPayPalSubscriptionDto>;

export type CreateStripeCheckoutDto = z.infer<typeof CreateStripeCheckoutDto>;
export type CreateStripeSubscriptionDto = z.infer<typeof CreateStripeSubscriptionDto>;
export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionDto>;

export type CheckBillingStatusDto = z.infer<typeof CheckBillingStatusDto>;
export type UpdateBillingStatusDto = z.infer<typeof UpdateBillingStatusDto>;
