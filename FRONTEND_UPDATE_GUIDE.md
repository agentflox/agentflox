# Frontend API Update Guide

## Quick Reference for Updating API Calls

### Environment Variable
First, ensure you have the backend URL configured:

```env
# apps/frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
```

### Pattern for Updates

**Before:**
```typescript
const response = await fetch('/api/billing/stripe/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

**After:**
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/stripe/checkout`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Add auth token if needed
  },
  credentials: 'include', // Include cookies for auth
  body: JSON.stringify(data)
});
```

### Files to Update

#### 1. PayPal Service
**File:** `apps/frontend/src/features/billing/services/paypal.service.ts`

**Lines to change:**
- Line 46: `/api/billing/paypal/subscribe` → `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/paypal/subscribe`
- Line 92: `/api/billing/paypal/checkout` → `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/paypal/checkout`
- Line 117: `/api/billing/paypal/capture` → `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/paypal/capture`
- Line 145: `/api/paypal/cancel` → `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/paypal/cancel`

#### 2. Stripe Button
**File:** `apps/frontend/src/features/billing/components/stripe/StripeButton.tsx`

**Lines to change:**
- Line 28-29: Update both `/api/billing/stripe/subscribe` and `/api/billing/stripe/checkout`

```typescript
const endpoint = event.type === 'BILLING.PAYMENT.SUBSCRIPTION'
  ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/stripe/subscribe`
  : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/stripe/checkout`;
```

#### 3. Billing Status Page
**File:** `apps/frontend/src/app/(protected)/dashboard/billing/status/page.tsx`

**Lines to change:**
- Line 48: `/api/billing/status?${params}` → `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/status?${params}`
- Line 70: `/api/billing/status` → `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/status`

### tRPC Routers

For tRPC routers, you have two options:

#### Option 1: Call Backend API Directly
```typescript
// In apps/frontend/src/trpc/routers/billing.ts
import { publicProcedure, router } from '../trpc';

export const billingRouter = router({
  getSubscription: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/subscription/${input.userId}`
      );
      return response.json();
    }),
});
```

#### Option 2: Import Backend Utils (if backend is accessible)
```typescript
// Only if backend utils are accessible from frontend build
import { SubscriptionManager } from '@backend/utils/billing';

export const billingRouter = router({
  getSubscription: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await SubscriptionManager.getCurrentSubscription(input.userId);
    }),
});
```

**Recommended:** Option 1 (API calls) for better separation of concerns.

### Helper Function

Create a helper to simplify backend API calls:

**File:** `apps/frontend/src/lib/api/backend.ts`
```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

export async function backendFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${BACKEND_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
}

// Usage example:
// const response = await backendFetch('/api/billing/stripe/checkout', {
//   method: 'POST',
//   body: JSON.stringify(data)
// });
```

Then update all files to use this helper:
```typescript
import { backendFetch } from '@/lib/api/backend';

// Instead of:
const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/...`, ...);

// Use:
const response = await backendFetch('/api/billing/...', ...);
```

### Authentication

If your backend requires authentication, ensure you're sending the auth token:

```typescript
import { getSession } from 'next-auth/react';

const session = await getSession();
const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/billing/...`, {
  headers: {
    'Authorization': `Bearer ${session?.accessToken}`,
    'Content-Type': 'application/json',
  },
  credentials: 'include',
});
```

### Testing Checklist

After making changes, test:
- [ ] Stripe checkout flow
- [ ] Stripe subscription flow
- [ ] PayPal checkout flow
- [ ] PayPal subscription flow
- [ ] Billing status page loads correctly
- [ ] Error handling works
- [ ] Authentication is properly passed
- [ ] CORS is configured correctly on backend

### Common Issues

**Issue:** CORS errors
**Solution:** Ensure backend has CORS configured to allow requests from frontend domain:
```typescript
// In backend main.api.ts or similar
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

**Issue:** 401 Unauthorized
**Solution:** Ensure auth tokens are being sent correctly and backend auth middleware is configured.

**Issue:** 404 Not Found
**Solution:** Verify the backend URL is correct and the backend server is running on the expected port.
