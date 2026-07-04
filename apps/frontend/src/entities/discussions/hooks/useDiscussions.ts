'use client';

import { useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { normalizeTimestamp } from '@/utils/utilities/formatter';
import { useDiscussionMutations } from './useDiscussionMutations';
import { acquireFeedSubscription, acquirePostEventListeners } from '@/lib/socketRefCount';

export function useDiscussions(
  feedType: 'global' | 'user' | 'project' | 'team',
  feedId?: string,
  options?: {
    query?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const processedEvents = useRef(new Set<string>());
  const mutations = useDiscussionMutations(feedType, feedId, options);

  const queryParams = {
    feedType: feedType === 'team' ? 'team' : 'project',
    feedId: feedId!,
    query: options?.query,
    filter: options?.filter,
    page: options?.page || 1,
    pageSize: options?.pageSize || 50,
  };

  const queryKey = ['discussions.list', queryParams] as const;

  // ✅ Fetch with optimized settings
  const { data: postsResp, isLoading } = trpc.discussions.list.useQuery(
    feedId ? queryParams : (undefined as any),
    {
      enabled: !!feedId,
      staleTime: Infinity,
      gcTime: 300000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
    }
  );

  // ✅ Reusable normalizer
  const normalizePost = useCallback((src: any) => ({
    ...src,
    id: src.id,
    title: src.title || src.content?.split("\n")[0]?.slice(0, 120) || "Untitled discussion",
    summary: src.summary || src.content?.split("\n").slice(1).join(" ").slice(0, 180) || "",
    content: src.content,
    topic: src.topic,
    tags: src.tags || [],
    isPinned: src.isPinned || false,
    upvotes: src.upvotes ?? src.likeCount ?? src.like_count ?? 0,
    commentCount: src.commentCount ?? src.comment_count ?? src._count?.comments ?? 0,
    createdAt: normalizeTimestamp(src.createdAt ?? src.created_at),
    updatedAt: normalizeTimestamp(src.updatedAt ?? src.updated_at),
    projectId: src.projectId ?? src.project_id ?? undefined,
    teamId: src.teamId ?? src.team_id ?? undefined,
    author: src.author || src.user
      ? {
        id: (src.author || src.user).id,
        name: (src.author || src.user).name ?? null,
        image: (src.author || src.user).image ?? (src.author || src.user).avatar ?? null,
      }
      : undefined,
    _count: src._count || { comments: src.commentCount ?? src.comment_count ?? 0 },
  }), []);

  // ✅ Live subscribe to cache updates
  const discussions = useMemo(() => {
    const cached = queryClient.getQueryData(queryKey) as any;
    const items = cached?.items || postsResp?.items || [];
    return items.map(normalizePost);
  }, [queryClient.getQueryState(queryKey)?.dataUpdatedAt, postsResp, normalizePost]);

  // ✅ Subscribe to feed (ref-counted)
  useEffect(() => {
    if (!socket || !isConnected || !feedId) return;
    return acquireFeedSubscription(socket, feedType, feedId);
  }, [socket, isConnected, feedType, feedId]);

  // ✅ Helper: Update cache instantly
  const updatePostCache = useCallback(
    (updater: (items: any[]) => any[]) => {
      if (!feedId) return;

      utils.discussions.list.setData(queryParams as any, (old: any) => {
        if (!old) return old;
        const updatedItems = updater(old.items ?? []).map(normalizePost);
        return { ...old, items: updatedItems } as any;
      });
    },
    [utils, queryParams, normalizePost]
  );

  // ✅ Handle post created
  const handlePostCreated = useCallback(
    (data: any) => {
      const src = data.post || data;
      const id = src.id;

      const eventId = `created-${id}`;
      if (processedEvents.current.has(eventId)) return;
      processedEvents.current.add(eventId);
      setTimeout(() => processedEvents.current.delete(eventId), 5000);

      updatePostCache((items) => {
        if (items.some((p) => p.id === id)) return items;
        return [normalizePost(src), ...items];
      });
    },
    [updatePostCache, normalizePost]
  );

  // ✅ Handle post updated
  const handlePostUpdated = useCallback(
    (data: any) => {
      updatePostCache((items) =>
        items.map((post) =>
          post.id === data.postId
            ? {
              ...post,
              content: data.content,
              title: data.title || post.title,
              topic: data.topic || post.topic,
              isEdited: data.isEdited
            }
            : post
        )
      );
    },
    [updatePostCache]
  );

  // ✅ Handle post deleted
  const handlePostDeleted = useCallback(
    (data: any) => {
      updatePostCache((items) => items.filter((post) => post.id !== data.postId));
    },
    [updatePostCache]
  );

  // ✅ Handle post liked/unliked
  const handlePostLiked = useCallback(
    (data: any) => {
      updatePostCache((items) =>
        items.map((post) =>
          post.id === data.postId ? { ...post, upvotes: data.likeCount } : post
        )
      );
    },
    [updatePostCache]
  );

  // ✅ Register socket listeners (ref-counted per feed)
  useEffect(() => {
    if (!socket || !isConnected || !feedId) return;

    return acquirePostEventListeners(socket, feedType, feedId, {
      onCreated: handlePostCreated,
      onUpdated: handlePostUpdated,
      onDeleted: handlePostDeleted,
      onLiked: handlePostLiked,
    });
  }, [socket, isConnected, feedType, feedId, handlePostCreated, handlePostUpdated, handlePostDeleted, handlePostLiked]);

  return {
    discussions,
    isLoading,
    ...mutations,
  };
}
