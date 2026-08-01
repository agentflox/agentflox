'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import type { CreateCommentData } from '@agentflox/types/socket-events';

type CommentEntityType = 'post' | 'listing';

/**
 * Comment mutations only — no query or socket listeners.
 * Use in CommentItem; keep useComments at CommentSection level.
 */
export function useCommentMutations(postId: string, entityType: CommentEntityType = 'post') {
  const { waitForConnection } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const queryKey =
    entityType === 'post'
      ? (['comments.list', { postId, page: 1, pageSize: 50 }] as const)
      : (['marketplace.listComments', { listingId: postId, page: 1, pageSize: 50 }] as const);

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

  const updateCommentCache = useCallback(
    (updater: (items: any[]) => any[]) => {
      if (entityType === 'listing') {
        utils.marketplace.listComments.setData(
          { listingId: postId as string, page: 1, pageSize: 50 },
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
        { postId: postId as string, page: 1, pageSize: 50 },
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

  const createComment = useMutation({
    mutationFn: async (data: CreateCommentData) => {
      const tempComment = {
        id: data.id,
        postId: data.postId,
        listingId: entityType === 'listing' ? data.postId : undefined,
        parentId: data.parentId,
        content: data.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEdited: false,
        upvotes: 0,
        downvotes: 0,
        isPending: true,
      } as any;

      updateCommentCache((items) => [...items, tempComment]);

      try {
        const s = await waitForConnection();
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Request timeout')), 60000);
          const eventName = entityType === 'listing' ? 'listing:comment:create' : 'comment:create';
          const payload =
            entityType === 'listing'
              ? { listingId: data.postId, content: data.content, parentId: data.parentId }
              : data;
          s.emit(eventName as any, payload, (err: any, response?: any) => {
            clearTimeout(timeoutId);
            if (err) {
              const message = typeof err === 'string' ? err : err?.message || 'Request failed';
              return reject(new Error(message));
            }
            resolve(response);
          });
        });

        const realComment = (response as any).comment;
        updateCommentCache((items) => {
          const withoutTemp = items.filter((c) => c.id !== data.id);
          const normalizedReal = normalizeComment({ ...realComment, isPending: false });
          if (withoutTemp.some((c) => c.id === normalizedReal.id)) {
            return withoutTemp;
          }
          return [...withoutTemp, normalizedReal];
        });

        return response;
      } catch (error) {
        updateCommentCache((items) => items.filter((c) => c.id !== data.id));
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

  const voteComment = useMutation({
    mutationFn: async ({
      commentId,
      voteType,
    }: {
      commentId: string;
      voteType: 'UPVOTE' | 'DOWNVOTE';
    }) => {
      const previousData = queryClient.getQueryData(queryKey);
      updateCommentCache((items) =>
        items.map((c) => {
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
              const message = typeof err === 'string' ? err : err?.message || 'Request failed';
              return reject(new Error(message));
            }
            resolve(response);
          });
        });
      } catch (error) {
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

  return { createComment, voteComment };
}

export type CommentMutations = ReturnType<typeof useCommentMutations>;
