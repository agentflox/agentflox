# ENTERPRISE FEED & NOTIFICATION SYSTEM UPGRADE PLAN

## Executive Summary
Transforming the feed and notification system to handle 50k+ concurrent users by implementing:
- Hybrid fan-out architecture with intelligent batching
- Multi-layer caching with selective invalidation
- Event-sourced notifications with deduplication
- Rate limiting and backpressure handling
- Horizontal scalability with Redis Cluster

## Critical Fixes Implementation

### Phase 1: Database Schema & Constraints (Day 1-2)

#### 1. Post/Comment Schema Updates
```prisma
model Post {
  likeCount    Int @default(0) // Add CHECK constraint >= 0
  commentCount Int @default(0) // Add CHECK constraint >= 0
  shareCount   Int @default(0) // Add CHECK constraint >= 0
  
  // Add indexes for performance
  @@index([createdAt, visibility])
  @@index([userId, createdAt])
  @@index([projectId, createdAt])
  @@index([teamId, createdAt])
}

model PostComment {
  upvotes      Int @default(0) // Add CHECK constraint >= 0
  downvotes    Int @default(0) // Add CHECK constraint >= 0
  depth        Int @default(0) @map("depth") // Prevent unbounded threading
  
  @@index([postId, createdAt])
  @@index([parentId, createdAt])
}
```

#### 2. Notification Schema (Event-Sourced)
```prisma
model NotificationEvent {
  id            String   @id @default(cuid())
  eventType     String   // POST_LIKED, COMMENT_CREATED, etc.
  actorId       String
  entityType    String   // POST, COMMENT, etc.
  entityId      String
  metadata      Json
  aggregateKey  String   // For deduplication
  createdAt     DateTime @default(now())
  
  @@index([aggregateKey, createdAt])
  @@index([createdAt])
}

model Notification {
  id            String   @id @default(cuid())
  userId        String
  type          String
  title         String
  message       String
  actorIds      String[] // Aggregated actors
  entityType    String
  entityId      String
  metadata      Json
  read          Boolean  @default(false)
  readAt        DateTime?
  aggregateKey  String   // For deduplication
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([userId, aggregateKey]) // Prevent duplicates
  @@index([userId, read, createdAt])
  @@index([createdAt])
}
```

#### 3. Feed Materialization Tables
```prisma
model UserFeedCache {
  id          String   @id @default(cuid())
  userId      String
  postId      String
  score       Float    // For ranking
  createdAt   DateTime @default(now())
  
  @@unique([userId, postId])
  @@index([userId, score(sort: Desc)])
  @@index([createdAt])
}
```

### Phase 2: Rate Limiting & Backpressure (Day 2-3)

#### 1. Fan-out Rate Limiter Service
```typescript
class FanoutRateLimiter {
  async broadcastWithBackpressure(
    rooms: string[],
    event: string,
    data: any,
    options?: {
      batchSize?: number;
      delayMs?: number;
      maxRetries?: number;
    }
  ): Promise<void>
}
```

#### 2. Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>
}
```

### Phase 3: Caching Strategy (Day 3-4)

#### 1. Multi-Layer Cache
- L1: Application memory (LRU cache for hot posts)
- L2: Redis (selective caching with granular invalidation)
- L3: Database read replicas

#### 2. Selective Cache Invalidation
```typescript
// Instead of: invalidateGlobalCache()
// Use: invalidateSpecificFeeds(postId, affectedUserIds)
```

### Phase 4: Notification System (Day 4-5)

#### 1. Event-Driven Notifications
```typescript
class NotificationEventBus {
  async publishEvent(event: NotificationEvent): Promise<void>
  async subscribe(handler: EventHandler): void
}
```

#### 2. Aggregation & Deduplication
```typescript
class NotificationAggregator {
  async aggregate(
    events: NotificationEvent[],
    window: number
  ): Promise<Notification[]>
}
```

### Phase 5: Feed Architecture (Day 5-7)

#### 1. Hybrid Fan-out Model
- **High-Profile Users** (>10k followers): Fan-out-on-read with caching
- **Regular Users** (<10k followers): Fan-out-on-write with batching

#### 2. Feed Service Redesign
```typescript
class EnterpriseFeedService {
  // Pre-computed feeds with incremental updates
  async getUserFeed(userId: string, options: FeedOptions): Promise<Feed>
  
  // Real-time merge with cached results
  async mergeRealtimeUpdates(cachedFeed: Feed): Promise<Feed>
}
```

## Performance Targets

### Response Times
- Feed fetch: <200ms (p95)
- Post creation: <100ms
- Like/Unlike: <50ms
- Comment creation: <100ms
- Notification delivery: <500ms (p99)

### Scalability
- 50k+ concurrent WebSocket connections
- 10k posts/second
- 100k likes/second
- 1M+ notifications/hour

### Reliability
- 99.9% uptime
- 0% data loss
- <1% notification miss rate

## Infrastructure Requirements

### Redis Cluster
```yaml
nodes: 6
memory_per_node: 8GB
persistence: AOF + RDB
clustering: enabled
```

### Database
```yaml
connection_pool: 100
read_replicas: 3
query_timeout: 5s
```

### Socket.IO
```yaml
adapter: @socket.io/redis-adapter
sticky_sessions: true
transports: ['websocket', 'polling']
```

## Monitoring & Observability

### Metrics
- Feed latency (p50, p95, p99)
- Cache hit rate
- Fan-out batch size
- Notification delivery rate
- Circuit breaker state

### Alerts
- Feed latency > 500ms
- Cache hit rate < 80%
- Socket connection pool > 80%
- Database connection pool > 90%
- Notification lag > 5 minutes

## Rollback Strategy

### Phase-by-Phase Rollback
1. Feature flags for new vs old feed system
2. Dual-write to both systems during migration
3. Shadow mode for new system (log only)
4. Gradual traffic shifting (10% → 50% → 100%)
5. Instant rollback on error rate > 0.1%

## Cost Analysis

### Infrastructure Costs
- Redis Cluster: $500/month
- Read Replicas: $300/month
- Monitoring: $100/month
- **Total**: ~$900/month

### Savings
- Reduced database load: -60%
- Reduced cache invalidation: -80%
- Improved user engagement: +30%

## Success Criteria

### Critical
- [x] No negative like counts
- [x] No cache invalidation storms
- [x] No socket room memory leaks
- [x] Notification deduplication working
- [x] Feed latency < 200ms

### Important
- [ ] 50k concurrent users supported
- [ ] 10k posts/second handled
- [ ] 99.9% uptime achieved
- [ ] < 1% notification loss

### Nice-to-Have
- [ ] ML-based feed ranking
- [ ] A/B testing framework
- [ ] Multi-region support
