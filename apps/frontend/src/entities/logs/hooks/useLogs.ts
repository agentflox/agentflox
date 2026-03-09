// hooks/useActivityLogs.ts
'use client';

import { useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useEffect, useRef, useCallback } from 'react';
import type { ActivityLog } from '@agentflox/database/src/generated/prisma/client';

interface UseActivityLogsParams {
  projectId?: string;
  teamId?: string;
  userId?: string;
  category?: string;
}

export function useActivityLogs(params: UseActivityLogsParams) {
  const { socket, isConnected, waitForConnection } = useSocket();
  const queryClient = useQueryClient();
  const paramsRef = useRef(params);

  // Update ref when params change
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const queryParams = {
    projectId: params.projectId,
    teamId: params.teamId,
    userId: params.userId,
    category: params.category,
    page: 1,
    pageSize: 50,
  };

  const queryKey = ['logs.list', queryParams];

  // Fetch logs via tRPC
  const { data: logsResp, isLoading } = trpc.logs.list.useQuery(queryParams, {
    enabled: isConnected,
    staleTime: 30000, // Cache for 30 seconds
    placeholderData: keepPreviousData,
  });

  // Memoized filter check function
  const matchesFilters = useCallback((log: any) => {
    const currentParams = paramsRef.current;
    return (
      (!currentParams.projectId || log.projectId === currentParams.projectId) &&
      (!currentParams.teamId || log.teamId === currentParams.teamId) &&
      (!currentParams.userId || log.userId === currentParams.userId) &&
      (!currentParams.category || log.category === currentParams.category)
    );
  }, []);

  // Memoized event handler
  const handleLogCreated = useCallback((data: any) => {
    const log = data.log;

    // Check if this log matches our filters
    if (!matchesFilters(log)) return;

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      const items = (old?.items ?? []) as ActivityLog[];

      // Prevent duplicates
      if (items.some(l => l.id === log.id)) return old;

      // Add new log at the beginning and limit to pageSize
      return {
        ...old,
        items: [log, ...items].slice(0, queryParams.pageSize)
      };
    });
  }, [queryClient, queryKey, matchesFilters, queryParams.pageSize]);

  // Listen for new logs
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('log:created', handleLogCreated);

    return () => {
      socket.off('log:created', handleLogCreated);
    };
  }, [socket, isConnected, handleLogCreated]);

  return {
    logs: logsResp?.items || [],
    isLoading,
    total: logsResp?.total || 0,
  };
}
