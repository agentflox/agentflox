# Billing API Migration Plan

## Overview
This document outlines the migration of billing functionality from the frontend to the backend.

## Migration Status

### ✅ Completed
1. **Backend Structure Created**
   - Created `BillingModule` at `apps/backend/src/modules/billing.module.ts`
   - Created `BillingController` at `apps/backend/src/controllers/billing.controller.ts`
   - Registered BillingModule in `AppModule`

2. **Types Migrated**
   - Created `apps/backend/src/types/billing.types.ts` with all payment types and interfaces

3. **Utils Migrated**
   - Created `apps/backend/src/utils/billing/planManager.ts`
   - Created index file at `apps/backend/src/utils/billing/index.ts`

### 🚧 In Progress
The following files need to be migrated from frontend to backend:

#### Utils (from `apps/frontend/src/features/billing/utils/`)
- [ ] `subscriptionManager.ts` → `apps/backend/src/utils/billing/subscriptionManager.ts`
- [ ] `paymentManager.ts` → `apps/backend/src/utils/billing/paymentManager.ts`
- [ ] `creditManager.ts` → `apps/backend/src/utils/billing/creditManager.ts`
- [ ] `reconciliationManager.ts` → `apps/backend/src/utils/billing/reconciliationManager.ts`

#### Services (from `apps/frontend/src/features/billing/services/`)
- [ ] `stripe.service.ts` → `apps/backend/src/services/billing/stripe.service.ts`
- [ ] `paypal.service.ts` → `apps/backend/src/services/billing/paypal.service.ts`

#### Webhooks (from `apps/frontend/src/features/billing/webhooks/`)
- [ ] `stripe/index.ts` → `apps/backend/src/webhooks/billing/stripe.ts`
- [ ] `paypal/index.ts` → `apps/backend/src/webhooks/billing/paypal.ts`

#### Helpers (from `apps/frontend/src/features/billing/helpers/`)
- [ ] `emailService.ts` → `apps/backend/src/services/billing/emailService.ts`
- [ ] `emailTemplates.ts` → `apps/backend/src/services/billing/emailTemplates.ts`
- [ ] `createStripe.ts` - Keep in frontend (client-side only)

### 📝 API Routes to Implement

All routes will be prefixed with `/api/billing` and handled by `BillingController`:

#### Stripe Routes
- `POST /api/billing/stripe/checkout` - Create Stripe checkout session
- `POST /api/billing/stripe/subscribe` - Create Stripe subscription
- `GET /api/billing/stripe/subscribe/callback` - Handle subscription callback
- `GET /api/billing/stripe/checkout/callback` - Handle checkout callback
- `POST /api/billing/stripe/webhook` - Handle Stripe webhooks
- `POST /api/billing/stripe/cancel` - Cancel Stripe subscription

#### PayPal Routes
- `POST /api/billing/paypal/checkout` - Create PayPal order
- `POST /api/billing/paypal/capture` - Capture PayPal payment
- `POST /api/billing/paypal/subscribe` - Create PayPal subscription
- `POST /api/billing/paypal/webhook` - Handle PayPal webhooks
- `POST /api/billing/paypal/cancel` - Cancel PayPal subscription

#### Status Routes
- `GET /api/billing/status` - Get billing status
- `POST /api/billing/status` - Update billing status

### 🔄 Frontend Updates Required

#### Files to Update (Change API calls from frontend routes to backend)
1. `apps/frontend/src/features/billing/services/paypal.service.ts`
   - Update `/api/billing/paypal/subscribe` → `${BACKEND_URL}/api/billing/paypal/subscribe`
   - Update `/api/billing/paypal/checkout` → `${BACKEND_URL}/api/billing/paypal/checkout`
   - Update `/api/billing/paypal/capture` → `${BACKEND_URL}/api/billing/paypal/capture`

2. `apps/frontend/src/features/billing/components/stripe/StripeButton.tsx`
   - Update `/api/billing/stripe/subscribe` → `${BACKEND_URL}/api/billing/stripe/subscribe`
   - Update `/api/billing/stripe/checkout` → `${BACKEND_URL}/api/billing/stripe/checkout`

3. `apps/frontend/src/app/(protected)/dashboard/billing/status/page.tsx`
   - Update `/api/billing/status` → `${BACKEND_URL}/api/billing/status`

4. **tRPC Routers** (Update imports to use backend services)
   - `apps/frontend/src/trpc/routers/user.ts`
   - `apps/frontend/src/trpc/routers/marketplace.ts`
   - `apps/frontend/src/trpc/routers/billing.ts`

5. **Other Dependencies**
   - `apps/frontend/src/lib/auth.ts`
   - `apps/frontend/src/features/usage/utils/limitGuard.ts`

#### Files to Keep in Frontend (UI Components)
- All components in `apps/frontend/src/features/billing/components/`
  - `checkout/CheckoutPaymentCard.tsx`
  - `paypal/PaypalButton.tsx`
  - `stripe/StripeButton.tsx`
  - `subscription/SubscriptionPaymentCard.tsx`
- `helpers/createStripe.ts` (client-side Stripe initialization)

#### Files to Delete from Frontend (After migration)
- `apps/frontend/src/app/api/billing/**` (all API routes)
- `apps/frontend/src/features/billing/utils/**` (moved to backend)
- `apps/frontend/src/features/billing/services/**` (moved to backend)
- `apps/frontend/src/features/billing/webhooks/**` (moved to backend)
- `apps/frontend/src/features/billing/helpers/emailService.ts` (moved to backend)
- `apps/frontend/src/features/billing/helpers/emailTemplates.ts` (moved to backend)

### 🔧 Environment Variables

Ensure backend has access to:
```env
# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_MODE= # sandbox or live

# Backend URL for frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
```

### 📋 Implementation Steps

1. **Copy Remaining Utils** (Priority: High)
   - Copy and adapt subscriptionManager.ts
   - Copy and adapt paymentManager.ts
   - Copy and adapt creditManager.ts
   - Copy and adapt reconciliationManager.ts

2. **Copy Services** (Priority: High)
   - Copy and adapt stripe.service.ts
   - Copy and adapt paypal.service.ts
   - Copy and adapt emailService.ts
   - Copy and adapt emailTemplates.ts

3. **Copy Webhooks** (Priority: High)
   - Copy and adapt Stripe webhook handler
   - Copy and adapt PayPal webhook handler

4. **Implement Controller Methods** (Priority: High)
   - Implement all Stripe endpoints
   - Implement all PayPal endpoints
   - Implement status endpoints

5. **Update Frontend References** (Priority: Medium)
   - Update API calls to point to backend
   - Update imports in tRPC routers
   - Update environment variables

6. **Testing** (Priority: High)
   - Test Stripe checkout flow
   - Test Stripe subscription flow
   - Test PayPal checkout flow
   - Test PayPal subscription flow
   - Test webhook handling
   - Test status endpoints

7. **Cleanup** (Priority: Low)
   - Remove old API routes from frontend
   - Remove migrated utils/services from frontend
   - Update documentation

### ⚠️ Important Notes

1. **UsageManager Dependency**: The `subscriptionManager.ts` depends on `UsageManager` from `apps/frontend/src/features/usage/utils/usageManager.ts`. This may also need to be migrated or made accessible to the backend.

2. **Prisma Client**: Backend already has `@/lib/prisma` configured, so no changes needed there.

3. **Authentication**: Ensure backend endpoints are properly authenticated using the existing auth middleware.

4. **CORS**: Configure CORS to allow frontend to make requests to backend billing endpoints.

5. **Webhooks**: Webhook endpoints must be publicly accessible and properly secured with signature verification.

### 🎯 Next Steps

1. Complete copying of remaining utility files
2. Implement controller methods with actual business logic
3. Update frontend to use backend API
4. Test end-to-end payment flows
5. Deploy and configure webhooks

## Questions/Decisions Needed

1. Should UsageManager also be migrated to backend?
2. What is the backend URL for different environments (dev, staging, prod)?
3. Are there any rate limiting requirements for billing endpoints?
4. Should we implement request logging/auditing for billing operations?
