# Redis Subscriber Mode Fix

## Issue
The backend API server was crashing on startup with the error:
```
❌ Redis sub error: Connection in subscriber mode, only subscriber commands may be used
```

## Root Cause
The `redisSub` connection was being used for two different purposes:
1. **Socket.IO Redis Adapter** - The `createAdapter(redisPub, redisSub)` internally puts the subscriber connection into subscriber mode
2. **Notifications Pub/Sub** - The code was also trying to subscribe to the `notifications` channel using the same `redisSub` connection

Once a Redis connection enters subscriber mode, it can only execute subscriber-specific commands (SUBSCRIBE, UNSUBSCRIBE, PSUBSCRIBE, PUNSUBSCRIBE, PING, QUIT). Any other command, including the `info` command that ioredis runs during `_readyCheck`, will fail.

## Solution
Created a **dedicated fourth Redis connection** (`redisNotificationsSub`) specifically for notification channel subscriptions, keeping `redisSub` exclusively for the Socket.IO adapter.

### Changes Made

#### 1. `apps/backend/src/lib/redis.ts`
- Added `redisNotificationsSub` to the global Redis clients object
- Created a new Redis connection instance for notifications
- Added event handlers for connection monitoring
- Exported the new connection

#### 2. `apps/backend/src/main.api.ts`
- Imported `redisNotificationsSub`
- Updated notification channel subscription to use `redisNotificationsSub` instead of `redisSub`
- Updated message handler to listen on `redisNotificationsSub`

#### 3. `apps/backend/src/services/observability/healthCheck.ts`
- Added health check for `redisNotificationsSub` connection
- Imported the new connection
- Added status monitoring

#### 4. `apps/backend/src/lib/lifecycleManager.ts`
- Imported `redisNotificationsSub`
- Added graceful shutdown for the new connection
- Ensures all Redis connections are properly closed on shutdown

## Redis Connection Architecture

After the fix, we now have **four separate Redis connections**, each with a specific purpose:

1. **`redis`** - Main Redis connection for general operations (caching, data storage, commands)
2. **`redisPub`** - Publisher connection for Socket.IO and other pub/sub publishing
3. **`redisSub`** - Subscriber connection **exclusively for Socket.IO adapter**
4. **`redisNotificationsSub`** - Subscriber connection **exclusively for application notifications**

## Why This Matters

### Redis Subscriber Mode Constraints
When a connection subscribes to channels, it enters a special mode where:
- ✅ Can execute: SUBSCRIBE, UNSUBSCRIBE, PSUBSCRIBE, PUNSUBSCRIBE, PING, QUIT
- ❌ Cannot execute: Any other Redis commands (SET, GET, INFO, etc.)

### Best Practice
**Always use separate Redis connections for different subscriber use cases** to avoid conflicts and maintain clean separation of concerns.

## Testing
After implementing this fix:
1. All four Redis connections should establish successfully
2. No "subscriber mode" errors should appear
3. Socket.IO adapter should work correctly
4. Notification subscriptions should work independently
5. Health checks should report all connections as healthy

## Related Files
- `apps/backend/src/lib/redis.ts`
- `apps/backend/src/main.api.ts`
- `apps/backend/src/services/observability/healthCheck.ts`
- `apps/backend/src/lib/lifecycleManager.ts`

---
**Fixed**: 2026-01-19
**Issue**: Redis subscriber mode conflict
**Resolution**: Dedicated connection per subscriber use case
