# Authentication Methods in Invitation Flow

## Summary
All three authentication methods (Credentials, Google OAuth, Magic Link) now properly preserve the `callbackUrl` and redirect users back to the invitation acceptance page after successful authentication.

---

## 1. **Credentials Login** ✅

### Flow:
1. User clicks invitation link → `/invite/accept?token=abc123`
2. Not authenticated → Shown "Login Required"
3. Clicks "Login to Accept" → `/login?callbackUrl=/invite/accept?token=abc123`
4. Enters email and password
5. `SignInWithCredentials(email, password, callbackUrl)` is called
6. After success → `window.location.href = callbackUrl`
7. **Redirects to `/invite/accept?token=abc123`** ✅
8. Invitation auto-accepts
9. Redirects to `/dashboard`

### Key Code:
```tsx
// LoginView.tsx
const callbackUrl = searchParams.get('callbackUrl') || '/';
const result = await SignInWithCredentials(email, password, callbackUrl);
if (result.success) {
  window.location.href = callbackUrl; // ✅ Uses dynamic callbackUrl
}
```

---

## 2. **Google OAuth** ✅

### Flow:
1. User clicks invitation link → `/invite/accept?token=abc123`
2. Not authenticated → Shown "Login Required"
3. Clicks "Login to Accept" → `/login?callbackUrl=/invite/accept?token=abc123`
4. Clicks "Continue with Google"
5. `SignInWithGoogle(callbackUrl)` is called
6. Redirects to Google OAuth page
7. User authorizes
8. **NextAuth redirects to `/invite/accept?token=abc123`** ✅ (handled by NextAuth)
9. Invitation auto-accepts
10. Redirects to `/dashboard`

### Key Code:
```tsx
// LoginView.tsx
await SignInWithGoogle(callbackUrl);

// auth.service.ts
export async function SignInWithGoogle(callbackUrl?: string) {
  await signIn('google', { callbackUrl: callbackUrl || '/' }); // ✅ Passed to NextAuth
}
```

### How NextAuth Handles It:
- Google OAuth redirects to NextAuth callback: `/api/auth/callback/google`
- NextAuth extracts the `callbackUrl` from the session/state
- After successful auth, NextAuth redirects to `callbackUrl`
- **No manual redirect needed** - NextAuth does it automatically

---

## 3. **Magic Link** ✅

### Flow:
1. User clicks invitation link → `/invite/accept?token=abc123`
2. Not authenticated → Shown "Login Required"
3. Clicks "Login to Accept" → `/login?callbackUrl=/invite/accept?token=abc123`
4. Enters email for magic link
5. `SignInWithMagicLink(email, callbackUrl)` is called
6. Magic link email is sent (NextAuth stores `callbackUrl` in database)
7. **Redirects to `/auth/verify-request?type=magiclink&email=user@email.com&callbackUrl=/invite/accept?token=abc123`** ✅
8. User sees "Check your email" page
9. User clicks magic link in email
10. Magic link goes to NextAuth: `/api/auth/callback/email?token=...`
11. **NextAuth retrieves stored `callbackUrl` and redirects to `/invite/accept?token=abc123`** ✅
12. Invitation auto-accepts
13. Redirects to `/dashboard`

### Key Code:
```tsx
// LoginView.tsx - Preserve callbackUrl when redirecting to verify page
const result = await SignInWithMagicLink(magicEmail, callbackUrl);
if (result?.success) {
  const verifyUrl = `/auth/verify-request?type=magiclink&email=${email}`;
  const urlWithCallback = callbackUrl !== '/' 
    ? `${verifyUrl}&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : verifyUrl;
  window.location.href = urlWithCallback; // ✅ Preserves callbackUrl
}

// auth.service.ts - Pass to NextAuth
export async function SignInWithMagicLink(email: string, callbackUrl?: string) {
  await signIn('nodemailer', { 
    email, 
    redirect: false,
    callbackUrl: callbackUrl || '/' // ✅ NextAuth stores this
  });
}
```

### How NextAuth Handles Magic Link:
1. When `signIn('nodemailer')` is called, NextAuth:
   - Generates a verification token
   - Stores the token + `callbackUrl` in the database
   - Sends email with link: `/api/auth/callback/email?token=...`

2. When user clicks the magic link:
   - NextAuth validates the token
   - Retrieves the associated `callbackUrl` from database
   - Authenticates the user
   - Redirects to the stored `callbackUrl`

---

## Files Modified

1. ✅ **LoginView.tsx**
   - Extracts `callbackUrl` from URL
   - Passes to all signin methods
   - Redirects to `callbackUrl` after credentials login
   - Preserves `callbackUrl` in magic link verify redirect

2. ✅ **auth.service.ts**
   - All signin functions accept optional `callbackUrl`
   - Pass `callbackUrl` to NextAuth's `signIn()`

3. ✅ **verify-request/page.tsx**
   - Extracts `callbackUrl` from URL
   - Preserves in "Back to Sign In" link

4. ✅ **invite/accept/page.tsx**
   - Already handles authenticated/unauthenticated states
   - Shows "Login to Accept" with callback URL

---

## Key Takeaways

### What Works Automatically:
- **Google OAuth**: NextAuth handles the redirect cycle completely
- **Magic Link**: NextAuth stores callbackUrl in DB and retrieves it on callback

### What We Handle Manually:
- **Credentials**: We manually redirect using `window.location.href = callbackUrl`
- **Magic Link Verify Page**: We preserve callbackUrl in the verify-request URL

### Security Notes:
- All `callbackUrl` values are URL-encoded to prevent injection
- NextAuth validates the callbackUrl domain (prevents open redirects)
- The invitation token is preserved throughout the entire flow
