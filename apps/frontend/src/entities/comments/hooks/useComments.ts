'use client';

import { useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/useToast';
import type { CreateCommentData } from '@agentflox/types/socket-events';
import type { PostComment } from '@agentflox/database/src/generated/prisma/client';
import { normalizeTimestamp } from '@/utils/utilities/formatter';

export function useComments(postId: string) {
  const { socket, isConnected, waitForConnection } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const subscribedRef = useRef(false);
  const postIdRef = useRef(postId);
  const processedEvents = useRef(new Set<string>());

  useEffect(() => {
    postIdRef.current = postId;
  }, [postId]);

  const queryKey = ['comments.list', { postId, page: 1, pageSize: 100 }] as const;

  const normalizeComment = useCallback((src: any) => {
    if (!src) return src;
    return {
      ...src,
      postId: src.postId ?? src.post_id,
      parentId: src.parentId ?? src.parent_id,
      content: src.content,
      createdAt: src.createdAt ?? src.created_at,
      updatedAt: src.updatedAt ?? src.updated_at,
      isEdited: src.isEdited ?? false,
      upvotes: src.upvotes ?? 0,
      downvotes: src.downvotes ?? 0,
    };
  }, []);
  // ✅ Fetch with optimized settings
  const { data: commentsResp, isLoading } = trpc.comments.list.useQuery(
    { postId, page: 1, pageSize: 100 },
    {
      enabled: !!postId,
      staleTime: Infinity,
      gcTime: 300000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
    }
  );

  // ✅ CRITICAL FIX: Subscribe to live cache updates
  const comments = useMemo(() => {
    const cached = queryClient.getQueryData(queryKey) as any;
    return (cached?.items || commentsResp?.items || []) as PostComment[];
  }, [queryClient.getQueryState(queryKey)?.dataUpdatedAt, commentsResp]); // Re-run when cache updates

  // ✅ Subscribe to post room
  useEffect(() => {
    if (!socket || !isConnected || !postId || subscribedRef.current) return;

    socket.emit('feed:subscribe', {
      feedType: 'project',
      feedId: postId
    });
    subscribedRef.current = true;

    return () => {
      if (socket && subscribedRef.current) {
        socket.emit('feed:unsubscribe', {
          feedType: 'project',
          feedId: postId
        });
        subscribedRef.current = false;
      }
    };
  }, [socket, isConnected, postId]);

  // ✅ Helper: Update cache instantly
  const updateCommentCache = useCallback(
    (updater: (items: any[]) => any[]) => {
      utils.comments.list.setData(
        { postId: postId as string, page: 1, pageSize: 100 },
        (old) => {
          if (!old) return old;
          const items = (old as any).items ?? [];
          const updatedItems = updater(items).map(normalizeComment);
          return { ...(old as any), items: updatedItems } as any;
        }
      );
    },
    [utils, postId, normalizeComment]
  );

  // ✅ Handle comment created (with deduplication)
  const handleCommentCreated = useCallback((data: any) => {
    if (data.comment.postId !== postIdRef.current) return;
    const eventId = `created-${data.comment.id}`;
    if (processedEvents.current.has(eventId)) return;
    processedEvents.current.add(eventId);
    setTimeout(() => processedEvents.current.delete(eventId), 5000);
    updateCommentCache((items) => {
      if (items.some(c => c.id === data.comment.id)) return items;
      return [...items, normalizeComment(data.comment)];
    });
  }, [updateCommentCache]);

  // ✅ Handle comment updated
  const handleCommentUpdated = useCallback((data: any) => {
    updateCommentCache((items) =>
      items.map((comment) =>
        comment.id === data.commentId
          ? {
            ...comment,
            content: data.content,
            isEdited: data.isEdited
          }
          : comment
      )
    );
  }, [updateCommentCache]);

  // ✅ Handle comment deleted
  const handleCommentDeleted = useCallback((data: any) => {
    if (data.postId !== postIdRef.current) return;
    updateCommentCache((items) =>
      items.filter((comment) => comment.id !== data.commentId)
    );
  }, [updateCommentCache]);

  // ✅ Handle comment voted
  const handleCommentVoted = useCallback((data: any) => {
    updateCommentCache((items) =>
      items.map((comment) =>
        comment.id === data.commentId
          ? { ...comment, upvotes: data.upvotes, downvotes: data.downvotes }
          : comment
      )
    );
  }, [updateCommentCache]);

  // ✅ Register socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('comment:voted', handleCommentVoted);

    return () => {
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('comment:voted', handleCommentVoted);
    };
  }, [socket, isConnected, handleCommentCreated, handleCommentUpdated, handleCommentDeleted, handleCommentVoted]);

  // ✅ Create comment with INSTANT optimistic update
  const createComment = useMutation({
    mutationFn: async (data: CreateCommentData) => {
      const tempComment = {
        id: data.id,
        postId: data.postId,
        parentId: data.parentId,
        content: data.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEdited: false,
        upvotes: 0,
        downvotes: 0,
        isPending: true,
      } as any;

      // ✅ INSTANT optimistic update
      updateCommentCache((items) => [...items, tempComment]);

      try {
        const s = await waitForConnection();
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Request timeout')), 60000);

          s.emit('comment:create', data, (err: any, response?: any) => {
            clearTimeout(timeoutId);
            if (err) {
              const message = typeof err === 'string' ? err : (err?.message || 'Request failed');
              return reject(new Error(message));
            }
            resolve(response);
          });
        });

        // ✅ Replace temp with real comment
        const realComment = (response as any).comment;
        updateCommentCache((items) =>
          items.map(c => c.id === data.id ? {
            ...realComment,
            isPending: false
          } : c)
        );

        return response;
      } catch (error) {
        // ✅ Remove optimistic comment on error
        updateCommentCache((items) => items.filter(c => c.id !== data.id));
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // ✅ Vote comment with optimistic update
  const voteComment = useMutation({
    mutationFn: async ({
      commentId,
      voteType
    }: {
      commentId: string;
      voteType: 'UPVOTE' | 'DOWNVOTE'
    }) => {
      // ✅ Optimistic update
      const previousData = queryClient.getQueryData(queryKey);
      updateCommentCache((items) =>
        items.map(c => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            upvotes: voteType === 'UPVOTE' ? (c.upvotes || 0) + 1 : c.upvotes,
            downvotes: voteType === 'DOWNVOTE' ? (c.downvotes || 0) + 1 : c.downvotes,
          };
        })
      );

      try {
        const s = await waitForConnection();
        return await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Request timeout')), 60000);

          s.emit('comment:vote', { commentId, voteType }, (err: any, response?: any) => {
            clearTimeout(timeoutId);
            if (err) {
              const message = typeof err === 'string' ? err : (err?.message || 'Request failed');
              return reject(new Error(message));
            }
            resolve(response);
          });
        });
      } catch (error) {
        // ✅ Revert on error
        queryClient.setQueryData(queryKey, previousData);
        throw error;
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    comments, // ✅ Return live-updated comments, not commentsResp.items
    isLoading,
    createComment,
    voteComment,
  };
}
