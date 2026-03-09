# Frontend Services Restructure

## Summary
Moved centralized API clients and Auth Actions to `apps/frontend/src/services` to consolidate all backend interactions in one place.

## ✅ Key Changes

### 1. Created Dedicated Services Directory
**Location:** `apps/frontend/src/services/`

- **`agent.service.ts`**: (Moved from `lib/agent.ts`)
  - Renamed `backendApi` -> `agentService`.
  - Handle all AI Agent related operations.

- **`billing.service.ts`**: (Moved from `lib/billing.ts`)
  - Renamed `billingApi` -> `billingService`.
  - Handle all Stripe/PayPal/Subscription operations.

- **`matching.service.ts`**: (Moved from `lib/matching.ts`)
  - Renamed `matchingApi` -> `matchingService`.
  - Handle AI Matching/Marketplace search.

- **`auth.service.ts`**: (Moved from `actions/auth/index.ts`)
  - Contains Server Actions for authentication (`SignInWithGoogle`, `RegisterUser`, etc.).
  - Kept `'use server'` directive.

- **`paypal.service.ts`**: (Moved from `features/billing/services/paypal.service.ts`)
  - Moved class-based service to root `services/`.

### 2. Updated References
Updated all imports in tRPC routers, Views, and Components to point to the new services.

- **tRPC Routers**: `agent.ts`, `marketplace.ts`.
- **Auth Views**: `LoginView`, `RegisterView`, `RequestResetPasswordView`, `ResetPasswordView`.
- **Billing Components**: `StripeButton`, `BillingStatusPage`, `LimitGuard`, `CheckoutPaymentCard`, `SubscriptionPaymentCard`.
- **Lib Utils**: `auth.ts`.

### 3. Cleanup & Other Moves
- Deleted `apps/frontend/src/lib/agent.ts`, `billing.ts`, `matching.ts`.
- Deleted `apps/frontend/src/actions` directory.
- Moved `apps/frontend/src/lib/email` -> `apps/frontend/src/features/auth/email`.

## 🚀 Benefits
- **Clear Separation of Concerns**: All external service interactions are now in `services/`.
- **Consistent Naming**: All services follow `*.service.ts` pattern and `xyzService` naming convention.
- **Centralized Logic**: Easier to audit security and logic for backend communication.
