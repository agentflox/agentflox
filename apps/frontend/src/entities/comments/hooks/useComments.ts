'use client';

import { useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { PostComment } from '@agentflox/database/src/generated/prisma/client';
import { useCommentMutations } from './useCommentMutations';
import { acquireCommentRoom, acquireCommentEventListeners } from '@/lib/socketRefCount';

type CommentEntityType = 'post' | 'listing';

export interface UseCommentsOptions {
  enabled?: boolean;
}

export function useComments(
  postId: string,
  entityType: CommentEntityType = 'post',
  options: UseCommentsOptions = {}
) {
  const { enabled = true } = options;
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const postIdRef = useRef(postId);
  const processedEvents = useRef(new Set<string>());
  const mutations = useCommentMutations(postId, entityType);

  useEffect(() => {
    postIdRef.current = postId;
  }, [postId]);

  const queryKey = entityType === 'post'
    ? (['comments.list', { postId, page: 1, pageSize: 100 }] as const)
    : (['marketplace.listComments', { listingId: postId, page: 1, pageSize: 100 }] as const);

  const normalizeComment = useCallback((src: any) => {
    if (!src) return src;
    return {
      ...src,
      postId: src.postId ?? src.post_id ?? src.listingId ?? src.listing_id,
      listingId: src.listingId ?? src.listing_id,
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
  const postCommentsQuery = trpc.comments.list.useQuery(
    { postId, page: 1, pageSize: 100 },
    {
      enabled: enabled && !!postId && entityType === 'post',
      staleTime: Infinity,
      gcTime: 300000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
    }
  );
  const listingCommentsQuery = trpc.marketplace.listComments.useQuery(
    { listingId: postId, page: 1, pageSize: 100 },
    {
      enabled: enabled && !!postId && entityType === 'listing',
      staleTime: Infinity,
      gcTime: 300000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
    }
  );
  const commentsResp = entityType === 'post' ? postCommentsQuery.data : listingCommentsQuery.data;
  const isLoading = entityType === 'post' ? postCommentsQuery.isLoading : listingCommentsQuery.isLoading;

  // ✅ CRITICAL FIX: Subscribe to live cache updates
  const comments = useMemo(() => {
    const cached = queryClient.getQueryData(queryKey) as any;
    const sourceItems = (cached?.items || commentsResp?.items || []) as any[];
    return sourceItems.map((item) => normalizeComment(item)) as PostComment[];
  }, [queryClient.getQueryState(queryKey)?.dataUpdatedAt, commentsResp]); // Re-run when cache updates

  // ✅ Subscribe to post/listing comment room (ref-counted)
  useEffect(() => {
    if (!enabled || !socket || !isConnected || !postId) return;
    return acquireCommentRoom(socket, entityType, postId);
  }, [enabled, socket, isConnected, postId, entityType]);

  // ✅ Helper: Update cache instantly
  const updateCommentCache = useCallback(
    (updater: (items: any[]) => any[]) => {
      if (entityType === 'listing') {
        utils.marketplace.listComments.setData(
          { listingId: postId as string, page: 1, pageSize: 100 },
          (old) => {
            if (!old) return old;
            const items = (old as any).items ?? [];
            const updatedItems = updater(items).map(normalizeComment);
            return { ...(old as any), items: updatedItems } as any;
          }
        );
        return;
      }

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
    [utils, postId, normalizeComment, entityType]
  );

  // ✅ Handle comment created (with deduplication)
  const handleCommentCreated = useCallback((data: any) => {
    const incomingTargetId = data.comment?.postId ?? data.comment?.listingId;
    if (incomingTargetId !== postIdRef.current) return;
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

  // ✅ Register socket listeners (ref-counted per post/listing)
  useEffect(() => {
    if (!enabled || !socket || !isConnected || !postId) return;

    return acquireCommentEventListeners(socket, entityType, postId, {
      onCreated: handleCommentCreated,
      onUpdated: handleCommentUpdated,
      onDeleted: handleCommentDeleted,
      onVoted: handleCommentVoted,
    });
  }, [enabled, socket, isConnected, postId, entityType, handleCommentCreated, handleCommentUpdated, handleCommentDeleted, handleCommentVoted]);

  return {
    comments,
    isLoading,
    ...mutations,
  };
}
