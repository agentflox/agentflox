# Billing Migration Completion Checklist

Use this checklist to track progress on completing the billing API migration.

## Phase 1: Backend Implementation ⏳

### Controller Implementation
- [ ] Implement `POST /api/billing/stripe/checkout`
  - [ ] Extract session parameters
  - [ ] Create Stripe checkout session
  - [ ] Return session URL
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/stripe/subscribe`
  - [ ] Extract subscription parameters
  - [ ] Create Stripe subscription
  - [ ] Return subscription details
  - [ ] Handle errors

- [ ] Implement `GET /api/billing/stripe/subscribe/callback`
  - [ ] Retrieve session from Stripe
  - [ ] Call SubscriptionManager.activate()
  - [ ] Redirect to success/failure page
  - [ ] Handle errors

- [ ] Implement `GET /api/billing/stripe/checkout/callback`
  - [ ] Retrieve session from Stripe
  - [ ] Call CreditManager.purchase()
  - [ ] Redirect to success/failure page
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/stripe/webhook`
  - [ ] Verify webhook signature
  - [ ] Call StripeWebhookManager.processWebhook()
  - [ ] Return 200 OK
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/stripe/cancel`
  - [ ] Extract subscription ID
  - [ ] Cancel Stripe subscription
  - [ ] Call SubscriptionManager.cancel()
  - [ ] Return success response
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/paypal/checkout`
  - [ ] Extract order parameters
  - [ ] Create PayPal order
  - [ ] Return order ID
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/paypal/capture`
  - [ ] Extract order ID
  - [ ] Capture PayPal payment
  - [ ] Call CreditManager.purchase()
  - [ ] Return capture details
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/paypal/subscribe`
  - [ ] Extract subscription details
  - [ ] Call SubscriptionManager.activate()
  - [ ] Return success response
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/paypal/webhook`
  - [ ] Verify webhook signature
  - [ ] Call PaypalWebhookManager.processWebhook()
  - [ ] Return 200 OK
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/paypal/cancel`
  - [ ] Extract subscription ID
  - [ ] Cancel PayPal subscription
  - [ ] Call SubscriptionManager.cancel()
  - [ ] Return success response
  - [ ] Handle errors

- [ ] Implement `GET /api/billing/status`
  - [ ] Extract query parameters
  - [ ] Get subscription/purchase status
  - [ ] Return status details
  - [ ] Handle errors

- [ ] Implement `POST /api/billing/status`
  - [ ] Extract status update parameters
  - [ ] Update subscription/purchase metadata
  - [ ] Return success response
  - [ ] Handle errors

### Import Path Fixes
- [ ] Fix imports in `paymentManager.ts`
- [ ] Fix imports in `creditManager.ts`
- [ ] Fix imports in `reconciliationManager.ts` (if exists)
- [ ] Fix imports in `webhooks/billing/stripe.ts`
- [ ] Fix imports in `webhooks/billing/paypal.ts`
- [ ] Fix imports in `services/billing/emailService.ts`
- [ ] Fix imports in `services/billing/emailTemplates.ts`
- [ ] Fix imports in `utils/usage/usageManager.ts`

### Middleware & Configuration
- [ ] Add authentication middleware to billing routes
- [ ] Configure CORS to allow frontend requests
- [ ] Add rate limiting to billing endpoints
- [ ] Add request logging for billing operations
- [ ] Configure environment variables

## Phase 2: Frontend Updates ⏳

### Service Updates
- [ ] Update `paypal.service.ts`
  - [ ] Line 46: Update subscribe endpoint
  - [ ] Line 92: Update checkout endpoint
  - [ ] Line 117: Update capture endpoint
  - [ ] Line 145: Update cancel endpoint
  - [ ] Add authentication headers
  - [ ] Add error handling

- [ ] Update `StripeButton.tsx`
  - [ ] Lines 28-29: Update endpoint URLs
  - [ ] Add authentication headers
  - [ ] Add error handling

- [ ] Update `billing/status/page.tsx`
  - [ ] Line 48: Update GET status endpoint
  - [ ] Line 70: Update POST status endpoint
  - [ ] Add authentication headers
  - [ ] Add error handling

### tRPC Router Updates
- [ ] Update `trpc/routers/user.ts`
  - [ ] Replace SubscriptionManager imports with API calls
  - [ ] Test user subscription queries

- [ ] Update `trpc/routers/marketplace.ts`
  - [ ] Replace SubscriptionManager imports with API calls
  - [ ] Test marketplace queries

- [ ] Update `trpc/routers/billing.ts`
  - [ ] Replace all billing manager imports with API calls
  - [ ] Test all billing queries and mutations

### Other Dependencies
- [ ] Update `lib/auth.ts`
  - [ ] Replace SubscriptionManager import if used
  - [ ] Test authentication flow

- [ ] Update `features/usage/utils/limitGuard.ts`
  - [ ] Replace SubscriptionManager import if used
  - [ ] Test usage limits

### Helper Functions
- [ ] Create `lib/api/backend.ts` helper
- [ ] Update all files to use backend helper
- [ ] Add TypeScript types for API responses

## Phase 3: Environment & Configuration ⏳

### Backend Environment
- [ ] Add `STRIPE_SECRET_KEY`
- [ ] Add `STRIPE_PUBLISHABLE_KEY`
- [ ] Add `STRIPE_WEBHOOK_SECRET`
- [ ] Add `PAYPAL_CLIENT_ID`
- [ ] Add `PAYPAL_CLIENT_SECRET`
- [ ] Add `PAYPAL_WEBHOOK_ID`
- [ ] Add `PAYPAL_MODE` (sandbox/live)
- [ ] Add `FRONTEND_URL` for CORS

### Frontend Environment
- [ ] Add `NEXT_PUBLIC_BACKEND_URL`
- [ ] Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` exists
- [ ] Verify `NEXT_PUBLIC_PAYPAL_CLIENT_ID` exists

## Phase 4: Testing 🧪

### Stripe Testing
- [ ] Test Stripe checkout flow (one-time payment)
  - [ ] Create checkout session
  - [ ] Complete payment
  - [ ] Verify callback handling
  - [ ] Verify database records
  - [ ] Verify email notifications

- [ ] Test Stripe subscription flow
  - [ ] Create subscription
  - [ ] Complete payment
  - [ ] Verify callback handling
  - [ ] Verify database records
  - [ ] Verify email notifications

- [ ] Test Stripe webhooks
  - [ ] Test payment succeeded event
  - [ ] Test payment failed event
  - [ ] Test subscription created event
  - [ ] Test subscription updated event
  - [ ] Test subscription deleted event
  - [ ] Verify signature validation

- [ ] Test Stripe cancellation
  - [ ] Cancel active subscription
  - [ ] Verify database update
  - [ ] Verify email notification

### PayPal Testing
- [ ] Test PayPal checkout flow
  - [ ] Create order
  - [ ] Complete payment
  - [ ] Capture payment
  - [ ] Verify database records
  - [ ] Verify email notifications

- [ ] Test PayPal subscription flow
  - [ ] Create subscription
  - [ ] Approve subscription
  - [ ] Verify database records
  - [ ] Verify email notifications

- [ ] Test PayPal webhooks
  - [ ] Test payment completed event
  - [ ] Test subscription activated event
  - [ ] Test subscription cancelled event
  - [ ] Verify signature validation

- [ ] Test PayPal cancellation
  - [ ] Cancel active subscription
  - [ ] Verify database update
  - [ ] Verify email notification

### Status Page Testing
- [ ] Test status page with successful payment
- [ ] Test status page with failed payment
- [ ] Test status page with pending payment
- [ ] Test status page with subscription
- [ ] Test status page error handling

### Integration Testing
- [ ] Test authentication flow
- [ ] Test CORS configuration
- [ ] Test error handling
- [ ] Test rate limiting
- [ ] Test concurrent requests
- [ ] Test idempotency

## Phase 5: Deployment 🚀

### Backend Deployment
- [ ] Deploy backend with billing endpoints
- [ ] Configure environment variables in production
- [ ] Verify backend is accessible
- [ ] Test health check endpoint

### Webhook Configuration
- [ ] Configure Stripe webhook URL in Stripe dashboard
  - URL: `https://your-backend.com/api/billing/stripe/webhook`
  - Events: All billing events
  - Copy webhook secret to environment

- [ ] Configure PayPal webhook URL in PayPal dashboard
  - URL: `https://your-backend.com/api/billing/paypal/webhook`
  - Events: All billing events
  - Copy webhook ID to environment

### Frontend Deployment
- [ ] Update `NEXT_PUBLIC_BACKEND_URL` to production URL
- [ ] Deploy frontend
- [ ] Verify frontend can reach backend
- [ ] Test end-to-end payment flow in production

### Monitoring
- [ ] Set up logging for billing operations
- [ ] Set up alerts for payment failures
- [ ] Set up alerts for webhook failures
- [ ] Monitor error rates
- [ ] Monitor response times

## Phase 6: Cleanup 🧹

### Frontend Cleanup
- [ ] Delete `apps/frontend/src/app/api/billing/**`
- [ ] Delete `apps/frontend/src/features/billing/utils/**`
- [ ] Delete `apps/frontend/src/features/billing/services/**` (except createStripe.ts)
- [ ] Delete `apps/frontend/src/features/billing/webhooks/**`
- [ ] Delete `apps/frontend/src/features/billing/helpers/emailService.ts`
- [ ] Delete `apps/frontend/src/features/billing/helpers/emailTemplates.ts`
- [ ] Verify no broken imports remain
- [ ] Run linter and fix any issues

### Documentation
- [ ] Update API documentation
- [ ] Update deployment documentation
- [ ] Update environment variable documentation
- [ ] Archive migration documents

### Final Verification
- [ ] Run full test suite
- [ ] Verify no regressions
- [ ] Get stakeholder approval
- [ ] Close migration ticket

## Progress Tracking

**Overall Progress:** 0 / 100 tasks completed (0%)

**By Phase:**
- Phase 1 (Backend): 0 / 28 (0%)
- Phase 2 (Frontend): 0 / 16 (0%)
- Phase 3 (Config): 0 / 11 (0%)
- Phase 4 (Testing): 0 / 31 (0%)
- Phase 5 (Deploy): 0 / 10 (0%)
- Phase 6 (Cleanup): 0 / 4 (0%)

---

**Last Updated:** 2026-01-10
**Migration Started:** 2026-01-10
**Target Completion:** TBD
