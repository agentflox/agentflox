// lib/socket.ts
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket-events';
import { fetchAuthToken } from '@/utils/backend-request';

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
      socketInstance.emit('connection:ping' as any);
    }
  }, 30000);
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
    // Check if any context changed
    const contextChanged =
      auth.workspaceId !== (workspaceId || undefined) ||
      auth.projectId !== (projectId || undefined) ||
      auth.teamId !== (teamId || undefined);

    if (contextChanged) {
      console.log('🔄 Socket context changed, reconnecting socket...', scope);
      stopHeartbeat();
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    } else {
      return socket;
    }
  }

  // Clean up existing socket if not connected
  if (socket) {
    stopHeartbeat();
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://127.0.0.1:3002';
  const token = await fetchAuthToken();

  // Build auth object with context
  const auth: any = {
    token,
    workspaceId: workspaceId || undefined,
    projectId: projectId || undefined,
    teamId: teamId || undefined
  };

  socket = io(SOCKET_URL, {
    auth,
    transports: ['websocket'], // Prefer websocket
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity, // Keep trying
    timeout: 20000,
    withCredentials: true,
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected', scope);
    startHeartbeat(socket!);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    stopHeartbeat();
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
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
