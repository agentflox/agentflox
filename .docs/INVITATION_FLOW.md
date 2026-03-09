# Email Invitation Flow - Implementation Documentation

## Overview
The email invitation acceptance flow is handled by the frontend page located at:
**`/app/invite/accept/page.tsx`** (publicly accessible, outside protected routes)

## Complete Flow

### 1. **Email Link Click**
- User receives an email with a secure link: `https://app.agentflox.com/invite/accept?token=a1b2c3...`
- Clicking the link opens the frontend application at `/invite/accept?token=...`

### 2. **Page Access** 
- The middleware allows public access to `/invite/accept` (no authentication required)
- The page loads and extracts the token from URL query parameters

### 3. **Authentication Check**
The page uses `useSession()` to determine the user's authentication state:

#### **Case A: User is Already Logged In**
1. Page detects authenticated session
2. Automatically calls `POST /api/invitations/accept` with the token
3. Backend validates:
   - Token is valid and not expired
   - `current_user.email === invited_email`
4. If successful:
   - Access is granted (WorkspaceMember/WorkspaceGuest created)
   - User sees success message
   - Redirects to `/dashboard` after 2 seconds

#### **Case B: User is NOT Logged In**
1. Page detects unauthenticated state
2. Shows "Login Required" UI with message:
   > "You need to login with the email address that received this invitation to continue."
3. User clicks "Login to Accept" button
4. Redirects to: `/login?callbackUrl=/invite/accept?token=...`
5. After successful login, NextAuth redirects back to `/invite/accept?token=...`
6. Now authenticated, the flow proceeds as in Case A

### 4. **Email Verification (Backend)**
The backend controller validates:
```typescript
if (userEmail && invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error(`This invitation is for ${invitation.email}. You are logged in as ${userEmail}.`);
}
```

This ensures users can only accept invitations sent to their own email address.

### 5. **Error Handling**
The page handles various error scenarios:
- **No Token**: "Invalid invitation link. Token is missing."
- **Expired Token**: "Invitation has expired"
- **Wrong Email**: "This invitation is for [email]. You are logged in as [different-email]."
- **Already Accepted**: "Invitation is no longer valid"

Users can:
- Return to dashboard
- Try a different account (redirects to login)

## Key Implementation Files

### Frontend
1. **`/app/invite/accept/page.tsx`**
   - Main invitation acceptance page
   - Handles auth state detection
   - Manages token extraction and acceptance flow
   
2. **`/middleware.ts`**
   - Allows public access to `/invite/accept` route
   - Preserves token in URL during authentication flow

3. **`/features/auth/views/LoginView.tsx`**
   - Extracts `callbackUrl` from query parameters
   - Passes `callbackUrl` to all signin methods (credentials, Google, magic link)
   - Redirects user to `callbackUrl` after successful authentication

4. **`/services/auth.service.ts`**
   - Updated `SignInWithCredentials`, `SignInWithGoogle`, and `SignInWithMagicLink`
   - All functions accept optional `callbackUrl` parameter
   - Pass `callbackUrl` to NextAuth's `signIn` function
   
5. **`/services/permissions.service.ts`**
   - Provides `invitations.accept(token)` method
   - Centralizes API calls

### Backend
1. **`/controllers/invitation.controller.ts`**
   - `@Post('accept')` endpoint
   - Validates token, email, and expiration
   - Creates workspace access atomically
   - Uses `JwtAuthGuard` for authentication

## Security Features

1. **Token-Based**: Secure random tokens (64 hex characters)
2. **Email Verification**: Backend enforces logged-in user email matches invited email
3. **Expiration**: Tokens expire after 7-30 days
4. **Single Use**: Status changes from 'pending' to 'accepted' prevent reuse
5. **Atomic Operations**: Database transactions ensure data consistency

## User Experience Flow

```
Email Click → Page Load → Auth Check
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              Logged In             Not Logged In
                    ↓                   ↓
            Accept Automatically    Show Login Prompt
                    ↓                   ↓
              Success/Error        Login → Callback
                    ↓                   ↓
              Redirect to         Accept Automatically
               Dashboard                ↓
                                  Success/Error
                                        ↓
                                  Redirect to
                                   Dashboard
```

## Testing Scenarios

1. **Happy Path (Authenticated)**:
   - User clicks email link while logged in
   - Token is valid, email matches
   - Invitation accepted automatically

2. **Happy Path (Unauthenticated)**:
   - User clicks email link, not logged in
   - Sees login prompt
   - Logs in with correct email
   - Returns to page, invitation accepted

3. **Wrong Email**:
   - User logged in as user_a@example.com
   - Clicks invitation sent to user_b@example.com
   - See error message

4. **Expired Token**:
   - User clicks old invitation link
   - Sees "Invitation has expired" error

5. **Already Accepted**:
   - User clicks same link twice
   - Sees "Invitation is no longer valid"
