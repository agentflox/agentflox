import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket-events';
import { fetchAuthToken } from '@/utils/backend-request';

/**
 * Centralized presence timing configuration.
 * All heartbeat, TTL, and cleanup values must be derived from here
 * to prevent drift between client, server, and Redis.
 *
 * Rule: PRESENCE_TTL_SECONDS = (HEARTBEAT_MS / 1000) * 3
 * This tolerates 2 missed heartbeats before a user is considered offline.
 */
const PRESENCE_CONFIG = {
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

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

const startHeartbeat = (socketInstance: Socket) => {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socketInstance?.connected) {
      // Must match the server-side 'heartbeat' event handler in main.api.ts
      socketInstance.emit('heartbeat' as any);
    }
  }, PRESENCE_CONFIG.HEARTBEAT_MS);
};

interface InitSocketScope {
  workspaceId?: string | null;
  projectId?: string | null;
  teamId?: string | null;
}

export const initSocket = async (scope: InitSocketScope = {}) => {
  const { workspaceId, projectId, teamId } = scope;

  // Return existing connected socket if context matches
  if (socket?.connected) {
    const auth = (socket.auth as any) || {};
    const contextChanged =
      auth.workspaceId !== (workspaceId || undefined) ||
      auth.projectId !== (projectId || undefined) ||
      auth.teamId !== (teamId || undefined);

    if (contextChanged) {
      console.log('🔄 Socket context changed, reconnecting...', scope);
      stopHeartbeat();
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    } else {
      return socket;
    }
  }

  // Clean up any existing disconnected socket
  if (socket) {
    stopHeartbeat();
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://127.0.0.1:3002';
  const token = await fetchAuthToken();

  const auth: any = {
    token,
    workspaceId: workspaceId || undefined,
    projectId: projectId || undefined,
    teamId: teamId || undefined,
  };

  socket = io(SOCKET_URL, {
    auth,
    // Try WebSocket first, fall back to polling
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    // timeout must exceed the server's upgradeTimeout (10s) to avoid
    // client giving up before the server finishes the WS handshake
    timeout: 20000,
    withCredentials: true,
    // Don't connect immediately — defer slightly so the server has
    // finished binding the port in development before we attempt
    autoConnect: false,
  });

  // Defer connection by one tick to avoid racing the server boot in dev
  setTimeout(() => socket?.connect(), 100);

  socket.on('connect', () => {
    console.log('✅ Socket connected', scope);
    startHeartbeat(socket!);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    stopHeartbeat();
  });

  socket.on('connect_error', (error) => {
    // Log the full error — this is where CORS, auth, and port problems surface
    console.error('🔴 Socket connection error:', error.message, error);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  stopHeartbeat();
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};