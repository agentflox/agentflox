# Invitation Flow - CallbackUrl Fix Summary

## Problem
When users clicked an invitation link and were not logged in, they were redirected to `/login?callbackUrl=/invite/accept?token=...`, but after successful login, they were redirected to `/` instead of back to the invitation acceptance page.

## Root Cause
The `LoginView` component was hardcoded to redirect to `/` after successful authentication, ignoring the `callbackUrl` query parameter.

## Solution Implemented

### 1. **LoginView.tsx** - Extract and Use CallbackUrl
```tsx
// Extract callbackUrl from URL
const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const callbackUrl = searchParams.get('callbackUrl') || '/';

// Pass to signin functions
await SignInWithCredentials(email, password, callbackUrl);
await SignInWithGoogle(callbackUrl);
await SignInWithMagicLink(magicEmail, callbackUrl);

// Redirect to callbackUrl after success
window.location.href = callbackUrl;
```

### 2. **auth.service.ts** - Accept CallbackUrl Parameter
```typescript
export async function SignInWithCredentials(
    email: string,
    password: string,
    callbackUrl?: string  // NEW
): Promise<AuthActionResult> {
    const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: callbackUrl || '/'  // Pass to NextAuth
    });
    ...
}

// Similar updates for SignInWithGoogle and SignInWithMagicLink
```

### 3. **middleware.ts** - Allow Public Access
```typescript
const isInviteAccept = pathname.startsWith("/invite/accept");

// Allow public access to invitation acceptance page
if (isInviteAccept) {
    return NextResponse.next();
}
```

## Complete Flow Now

1. **User clicks email link**: `https://app.agentflox.com/invite/accept?token=abc123`

2. **Page loads** (public access allowed by middleware)

3. **Not authenticated** → Shows "Login Required" UI

4. **User clicks "Login to Accept"** → Redirects to:
   ```
   /login?callbackUrl=/invite/accept?token=abc123
   ```

5. **User logs in** with credentials/Google/magic link

6. **After successful authentication** → Redirects to:
   ```
   /invite/accept?token=abc123
   ```

7. **Page auto-accepts invitation** (now authenticated)

8. **Success** → Redirects to `/dashboard`

## Files Modified

1. ✅ `/app/invite/accept/page.tsx` - Invitation acceptance page (already existed)
2. ✅ `/middleware.ts` - Allow public access to `/invite/accept`
3. ✅ `/features/auth/views/LoginView.tsx` - Extract and use callbackUrl
4. ✅ `/services/auth.service.ts` - Accept callbackUrl in signin functions
5. ✅ `.docs/INVITATION_FLOW.md` - Updated documentation

## Testing Checklist

### Scenario 1: Unauthenticated User (Primary Fix)
- [ ] Click invitation link while logged out
- [ ] Should see "Login Required" message
- [ ] Click "Login to Accept" button
- [ ] Should redirect to `/login?callbackUrl=/invite/accept?token=...`
- [ ] Login with correct email
- [ ] **Should redirect back to `/invite/accept?token=...`** ✨ (FIXED)
- [ ] Invitation should auto-accept
- [ ] Should redirect to `/dashboard`

### Scenario 2: Authenticated User (Existing Flow)
- [ ] Click invitation link while logged in
- [ ] Should immediately accept invitation
- [ ] Should redirect to `/dashboard`

### Scenario 3: Wrong Email
- [ ] Login as user A
- [ ] Click invitation sent to user B
- [ ] Should show error: "This invitation is for user-b@email.com. You are logged in as user-a@email.com"
- [ ] Click "Try Different Account"
- [ ] Should redirect to login with callbackUrl preserved

### Scenario 4: Google OAuth
- [ ] Click invitation link (logged out)
- [ ] Click "Login to Accept"
- [ ] Click "Continue with Google"
- [ ] Complete Google OAuth
- [ ] **Should redirect back to invitation page** ✨ (FIXED)
- [ ] Invitation should auto-accept

## Technical Notes

- **NextAuth Integration**: The `callbackUrl` is now properly passed through the NextAuth signin flow
- **Client-side Redirect**: Using `window.location.href` for hard navigation to ensure session updates
- **Public Route**: `/invite/accept` is exempt from authentication in middleware
- **Token Preservation**: URL parameters (including token) are preserved throughout the login flow
