'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { initSocket, disconnectSocket } from '@/lib/socket';
import { useToast } from '@/hooks/useToast';
import { useSession } from "next-auth/react";

export type SocketScope = {
  workspaceId?: string | null;
  projectId?: string | null;
  teamId?: string | null;
  [key: string]: string | null | undefined;
};

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  waitForConnection: () => Promise<Socket>;
  switchScope: (scope: SocketScope) => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  waitForConnection: async () => {
    throw new Error('useSocket must be used within SocketProvider');
  },
  switchScope: async () => { },
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const initializingRef = useRef(false);
  const toastShownRef = useRef(false);

  // Store current scope to avoid unnecessary reconnects
  const currentScopeRef = useRef<SocketScope>({});

  const connectSocket = useCallback(async (scope: SocketScope) => {
    // Check if scope is identical to current ref
    const isSameScope =
      currentScopeRef.current.workspaceId === scope.workspaceId &&
      currentScopeRef.current.projectId === scope.projectId &&
      currentScopeRef.current.teamId === scope.teamId;

    if (initializingRef.current && isSameScope) return;
    if (socket?.connected && isSameScope) return;

    initializingRef.current = true;
    currentScopeRef.current = scope;

    try {
      const socketInstance = await initSocket(scope);

      setSocket(socketInstance);

      // Connection handlers
      const handleConnect = () => {
        console.log('✅ Socket connected', scope);
        setIsConnected(true);
        toastShownRef.current = false;
      };

      const handleDisconnect = (reason: string) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleConnectError = (error: any) => {
        console.error('Socket connection error:', error);
        if (!toastShownRef.current) {
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to real-time server',
            variant: 'destructive',
          });
          toastShownRef.current = true;
        }
      };

      // Remove existing listeners first
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);

      // Add listeners
      socketInstance.on('connect', handleConnect);
      socketInstance.on('disconnect', handleDisconnect);
      socketInstance.on('connect_error', handleConnectError);

      setIsConnected(socketInstance.connected);

    } catch (error) {
      console.error('Error initializing socket:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to initialize connection',
        variant: 'destructive',
      });
      // Reset ref so we can try again
      currentScopeRef.current = {};
    } finally {
      initializingRef.current = false;
    }
  }, [socket, toast]);

  const switchScope = useCallback(async (scope: SocketScope) => {
    const isSameScope =
      currentScopeRef.current.workspaceId === scope.workspaceId &&
      currentScopeRef.current.projectId === scope.projectId &&
      currentScopeRef.current.teamId === scope.teamId;

    if (isSameScope) {
      return;
    }
    console.log('🔄 Switching socket scope:', scope);
    await connectSocket(scope);
  }, [connectSocket]);

  const waitForConnection = useCallback((): Promise<Socket> => {
    return new Promise<Socket>((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not initialized'));
      if (socket.connected) return resolve(socket);

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Connection timeout'));
      }, 5000);

      const handleConnect = () => {
        cleanup();
        resolve(socket);
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        socket.off('connect', handleConnect);
      };

      socket.once('connect', handleConnect);
    });
  }, [socket]);

  // Initial connection (global)
  useEffect(() => {
    if (status === 'authenticated' && !socket && !initializingRef.current) {
      connectSocket({});
    }
  }, [status, connectSocket, socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, waitForConnection, switchScope }}>
      {children}
    </SocketContext.Provider>
  );
}
