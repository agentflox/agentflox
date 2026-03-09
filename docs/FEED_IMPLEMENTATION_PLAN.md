# Enterprise Feed & Notification System - Implementation Plan

## 🚨 Phase 1: Critical Stability Fixes (P0)
**Objective**: Prevent data corruption, runtime crashes, and security exploits.

### 1.1 Fix Invalid Supabase Usage
- **Context**: `commentHandlers.ts` attempts to pass `rpc()` calls (promises) into `.update()` payloads. This is invalid.
- **Action**:
    - Create Postgres RPC functions: `increment_comment_count`, `increment_post_likes`, `decrement_post_likes`.
    - Update handlers to call these RPCs directly.

### 1.2 Fix Race Conditions (Likes & Votes)
- **Context**: Current "Fetch, Add 1 in JS, Save" logic causes lost updates under concurrency.
- **Action**:
    - Replace JS logic with database-side atomic operations (RPCs).

### 1.3 Fix O(N) Vote Counting
- **Context**: `commentHandler` loads ALL votes into memory to count them.
- **Action**:
    - Use `COUNT(*)` query for initial display.
    - (Preferred) Use Database Triggers to maintain `upvotes` / `downvotes` columns on `post_comments` automatically.

### 1.4 Secure Notifications
- **Context**: `socket.on('notification:send')` allows client-side spoofing.
- **Action**:
    - Remove this handler entirely.
    - Create `NotificationService` for server-side dispatch.

---

## 🏗️ Phase 2: Architecture & Scalability (P1)
**Objective**: Support >10k users and ensure feed persistence.

### 2.1 Unified Feed Service
- **Problem**: Socket.IO events are ephemeral. Offline users miss updates.
- **Solution**:
    - Create `Activity` table (or use `ActivityLog`).
    - On Post Create -> Insert `Activity`.
    - **Hybrid Feed Strategy**:
        - **Global Feed**: Pull-model (Query `posts` desc, cached in Redis).
        - **User Feed**: Push-model (Fan-out to `feed:user:{id}` via Redis Streams/Queue).

### 2.2 Comment System Refactor
- **Problem**: Fragmented tables (`TeamComment`, `PostComment`, etc.).
- **Solution**:
    - Build a `CommentService` abstracting the diversity.
    - Ensure infinite depth is handled via safe recursion limits or "Load More replies" pagination.

### 2.3 Background Workers for Fan-Out
- **Problem**: Broadcasting to `feed:global` blocks the event loop.
- **Solution**:
    - Move broadcast logic to a BullMQ worker.
    - Socket server listens to Redis Pub/Sub for specific messages only, not heavy computation.

---

## 🔒 Phase 3: Enterprise Features (Hardening)

- **Idempotency keys** for all Write operations.
- **Rate Limiting** (Redis-based) per user/IP.
- **Audit Logging** for moderation actions.
- **Micro-batching** for high-frequency updates (e.g., "Viral Post" likes).
