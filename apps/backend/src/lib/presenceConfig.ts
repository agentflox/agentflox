/**
 * Centralized presence timing configuration.
 * All heartbeat, TTL, and cleanup values must be derived from here
 * to prevent drift between client, server, and Redis.
 *
 * Rule: PRESENCE_TTL_SECONDS = (HEARTBEAT_MS / 1000) * 3
 * This tolerates 2 missed heartbeats before a user is considered offline.
 */
export const PRESENCE_CONFIG = {
    /** Redis key TTL in seconds — must be 3× the heartbeat interval */
    TTL_SECONDS: 90,
  
    /** How often the client sends a heartbeat (ms) — matches socket.io pingInterval */
    HEARTBEAT_MS: 25_000,
  
    /** How often the server runs presence cleanup (ms) */
    CLEANUP_INTERVAL_MS: 60_000,
  
    /** Socket.IO ping settings — keep in sync with server config */
    PING_INTERVAL_MS: 25_000,
    PING_TIMEOUT_MS: 30_000,
  } as const;