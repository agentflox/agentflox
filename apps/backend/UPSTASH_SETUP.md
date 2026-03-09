# Upstash Redis Configuration Guide

## Overview

Your Agentflox backend is now configured to work seamlessly with **Upstash Redis** (serverless Redis). No Sentinel configuration is needed - Upstash handles high availability automatically.

## Setup Steps

### 1. Get Your Upstash Redis URL

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database (or use existing)
3. Copy the **Redis URL** (it will look like this):
   ```
   rediss://default:YOUR_PASSWORD@YOUR-ENDPOINT.upstash.io:6379
   ```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Upstash Redis Configuration
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR-ENDPOINT.upstash.io:6379

# Remove these (not needed for Upstash):
# REDIS_SENTINEL_1=
# REDIS_SENTINEL_2=
# REDIS_SENTINEL_3=
# REDIS_PASSWORD=
```

### 3. What's Configured

The Redis configuration automatically detects and configures:

✅ **TLS/SSL** - Upstash uses `rediss://` protocol (secure)
✅ **Authentication** - Username and password from URL
✅ **BullMQ Compatibility** - `maxRetriesPerRequest: null`
✅ **IPv6 Support** - Upstash supports both IPv4 and IPv6
✅ **Retry Strategy** - Exponential backoff for connection issues
✅ **Error Recovery** - Auto-reconnect on retriable errors

## Features Supported

All BullMQ queues work with Upstash:
- ✅ Message Delivery Queue
- ✅ Agent Builder Queue
- ✅ Agent Execution Queue
- ✅ Matching Queue

## Local Development

For local development without Upstash, just remove or comment out `REDIS_URL`:

```env
# REDIS_URL=rediss://...
```

The system will automatically fall back to `localhost:6379`.

## Upstash vs Traditional Redis

| Feature | Upstash | Traditional Redis |
|---------|---------|-------------------|
| Setup | Instant, serverless | Requires server/container |
| High Availability | Built-in | Requires Sentinel/Cluster |
| Scaling | Automatic | Manual configuration |
| Pricing | Pay-per-request | Fixed instance cost |
| TLS | Always enabled | Optional |
| Connection | `rediss://` URL | Host/port or Sentinel |

## Troubleshooting

### Connection Issues

If you see connection errors:

1. **Verify URL format**: Should start with `rediss://` (note the double 's')
2. **Check credentials**: Ensure password is correct
3. **Firewall**: Upstash uses port 6379 (should be open)
4. **Region**: Choose Upstash region closest to your deployment

### BullMQ Worker Errors

If you see `maxRetriesPerRequest` errors:
- ✅ Already fixed! The configuration includes `maxRetriesPerRequest: null`

### TLS Certificate Errors

If you see TLS/SSL errors:
- ✅ Already configured with `rejectUnauthorized: false` for Upstash compatibility

## Performance Tips

1. **Choose the right region**: Deploy Upstash in the same region as your backend
2. **Use connection pooling**: Already configured (3 clients: redis, redisPub, redisSub)
3. **Monitor usage**: Check Upstash dashboard for request metrics
4. **Enable pipeline**: Upstash supports Redis pipelining for batch operations

## Migration from Local Redis

To migrate from local Redis to Upstash:

1. Export data from local Redis (if needed):
   ```bash
   redis-cli --rdb dump.rdb
   ```

2. Update `.env` with Upstash URL

3. Restart your backend:
   ```bash
   npm run dev
   ```

4. Verify connection in logs:
   ```
   ✅ Redis client connected
   ✅ Redis client ready
   ```

## Cost Optimization

Upstash pricing is based on:
- **Commands executed** (pay-per-request)
- **Data transfer**
- **Storage**

To optimize costs:
- Use `removeOnComplete` and `removeOnFail` in queue options (already configured)
- Set appropriate TTLs for cached data
- Monitor command usage in Upstash dashboard

## Support

- **Upstash Docs**: https://docs.upstash.com/redis
- **BullMQ Docs**: https://docs.bullmq.io/
- **ioredis Docs**: https://github.com/redis/ioredis

---

**Note**: Your configuration is production-ready and works with both Upstash and traditional Redis instances. No code changes needed when switching between them - just update the `REDIS_URL` environment variable.
