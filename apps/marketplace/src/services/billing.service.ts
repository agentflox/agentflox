import { sendBackendRequest } from '@/utils/backend-request';

/**
 * Billing API client for backend billing operations
 * All billing operations should use these API calls instead of direct imports
 */
export const billingService = {
    // Stripe endpoints
    stripe: {
        /**
         * Create Stripe checkout session for one-time payment
         */
        createCheckout: (data: {
            userId: string;
            packageId: string;
            successUrl?: string;
            cancelUrl?: string;
        }, session?: any) =>
            sendBackendRequest('/api/billing/stripe/checkout', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        /**
         * Create Stripe subscription
         */
        createSubscription: (data: {
            userId: string;
            planId: string;
            successUrl?: string;
            cancelUrl?: string;
            trialPeriodDays?: number;
        }, session?: any) =>
            sendBackendRequest('/api/billing/stripe/subscribe', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        /**
         * Cancel Stripe subscription
         */
        cancelSubscription: (data: {
            subscriptionId: string;
            reason?: string;
        }, session?: any) =>
            sendBackendRequest('/api/billing/stripe/cancel', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),
    },

    // PayPal endpoints
    paypal: {
        /**
         * Create PayPal order for one-time payment
         */
        createOrder: (data: {
            userId: string;
            packageId: string;
            event: any;
        }, session?: any) =>
            sendBackendRequest('/api/billing/paypal/checkout', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        /**
         * Capture PayPal payment
         */
        capturePayment: (data: {
            orderId: string;
            userId: string;
        }, session?: any) =>
            sendBackendRequest('/api/billing/paypal/capture', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        /**
         * Create PayPal subscription
         */
        createSubscription: (data: {
            userId: string;
            subscriptionDetails: any;
        }, session?: any) =>
            sendBackendRequest('/api/billing/paypal/subscribe', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        /**
         * Cancel PayPal subscription
         */
        cancelSubscription: (data: {
            subscriptionId: string;
        }, session?: any) =>
            sendBackendRequest('/api/billing/paypal/cancel', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),
    },

    // Subscription management
    subscriptions: {
        /**
         * Get current subscription for user
         */
        getCurrent: (userId: string, session?: any) =>
            sendBackendRequest(`/api/billing/subscriptions/${userId}/current`, {
                method: 'GET',
            }, session),

        /**
         * Get subscription details
         */
        getDetails: (userId: string, session?: any) =>
            sendBackendRequest(`/api/billing/subscriptions/${userId}/details`, {
                method: 'GET',
            }, session),

        /**
         * Get subscription by ID
         */
        getById: (subscriptionId: string, session?: any) =>
            sendBackendRequest(`/api/billing/subscriptions/${subscriptionId}`, {
                method: 'GET',
            }, session),

        /**
         * Check subscription status
         */
        checkStatus: (data: {
            planName: string;
            userId: string;
            canceled?: boolean;
        }, session?: any) =>
            sendBackendRequest('/api/billing/subscriptions/check-status', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        /**
         * Create default (free) subscription for user
         */
        createDefault: (userId: string, session?: any) =>
            sendBackendRequest('/api/billing/subscriptions/default', {
                method: 'POST',
                body: JSON.stringify({ userId }),
            }, session),

        /**
         * Check and handle subscription cycle transition
         */
        checkCycle: (userId: string, session?: any) =>
            sendBackendRequest(`/api/billing/subscriptions/${userId}/check-cycle`, {
                method: 'POST',
            }, session),
    },

    // Plan management
    plans: {
        /**
         * Get all plans
         */
        getAll: (session?: any) =>
            sendBackendRequest('/api/billing/plans', {
                method: 'GET',
            }, session),

        /**
         * Get plan by ID
         */
        getById: (planId: string, session?: any) =>
            sendBackendRequest(`/api/billing/plans/${planId}`, {
                method: 'GET',
            }, session),

        /**
         * Get plan by name
         */
        getByName: (name: string, session?: any) =>
            sendBackendRequest(`/api/billing/plans/name/${name}`, {
                method: 'GET',
            }, session),
    },

    // Credit packages
    credits: {
        /**
         * Get all standard packages
         */
        getAllPackages: (session?: any) =>
            sendBackendRequest('/api/billing/credits/packages', {
                method: 'GET',
            }, session),

        /**
         * Get purchase details for user
         */
        getPurchaseDetails: (userId: string, session?: any) =>
            sendBackendRequest(`/api/billing/credits/purchases/${userId}`, {
                method: 'GET',
            }, session),

        /**
         * Get active packages for user
         */
        getActivePackages: (userId: string, session?: any) =>
            sendBackendRequest(`/api/billing/credits/active/${userId}`, {
                method: 'GET',
            }, session),

        /**
         * Get credit history
         */
        getHistory: (userId: string, session?: any) =>
            sendBackendRequest(`/api/billing/credits/history/${userId}`, {
                method: 'GET',
            }, session),
    },

    // Payment management
    payments: {
        /**
         * Get payment by ID
         */
        getById: (paymentId: string, session?: any) =>
            sendBackendRequest(`/api/billing/payments/${paymentId}`, {
                method: 'GET',
            }, session),

        /**
         * Get user payments
         */
        getUserPayments: (userId: string, session?: any) =>
            sendBackendRequest(`/api/billing/payments/user/${userId}`, {
                method: 'GET',
            }, session),

        /**
         * Get payment history with pagination
         */
        getHistory: (userId: string, params?: {
            page?: number;
            pageSize?: number;
        }, session?: any) => {
            const query = new URLSearchParams();
            if (params?.page) query.set('page', params.page.toString());
            if (params?.pageSize) query.set('pageSize', params.pageSize.toString());

            return sendBackendRequest(
                `/api/billing/payments/history/${userId}?${query.toString()}`,
                { method: 'GET' },
                session
            );
        },

        /**
         * Refund payment
         */
        refund: (data: {
            paymentId: string;
            reason?: string;
        }, session?: any) =>
            sendBackendRequest('/api/billing/payments/refund', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),
    },

    // Billing status
    status: {
        /**
         * Get billing status
         */
        get: (params: {
            method?: string;
            subId?: string;
            orderId?: string;
            status?: string;
        }, session?: any) => {
            const query = new URLSearchParams();
            if (params.method) query.set('method', params.method);
            if (params.subId) query.set('subId', params.subId);
            if (params.orderId) query.set('orderId', params.orderId);
            if (params.status) query.set('status', params.status);

            return sendBackendRequest(
                `/api/billing/status?${query.toString()}`,
                { method: 'GET' },
                session
            );
        },

        /**
         * Update billing status metadata
         */
        update: (data: {
            type: 'subscription' | 'order';
            id: string;
            metadata: Record<string, any>;
        }, session?: any) =>
            sendBackendRequest('/api/billing/status', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),
    },
};
