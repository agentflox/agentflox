'use client';

import { useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { normalizeTimestamp } from '@/utils/utilities/formatter';
import { usePostMutations } from './usePostMutations';
import { acquireFeedSubscription, acquirePostEventListeners } from '@/lib/socketRefCount';

export function usePosts(feedType: 'global' | 'user' | 'project' | 'team', feedId?: string) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const processedEvents = useRef(new Set<string>());
  const mutations = usePostMutations(feedType, feedId);

  const queryKey = ['posts.list', { feedId, page: 1, pageSize: 50 }] as const;

  // ✅ Shared normalizer
  const normalizePost = useCallback((src: any) => {
    if (!src) return src;
    return {
      ...src,
      createdAt: normalizeTimestamp(src.createdAt ?? src.created_at),
      updatedAt: normalizeTimestamp(src.updatedAt ?? src.updated_at),
      likeCount: src.likeCount ?? src.like_count ?? 0,
      commentCount: src.commentCount ?? src.comment_count ?? 0,
      projectId: src.projectId ?? src.project_id ?? undefined,
      teamId: src.teamId ?? src.team_id ?? undefined,
      user: src.user
        ? {
          id: src.user.id,
          name: src.user.name ?? null,
          image: src.user.image ?? src.user.avatar ?? null,
        }
        : undefined,
    };
  }, []);

  // ✅ Fetch with optimized settings
  const { data: postsResp, isLoading } = trpc.posts.list.useQuery(
    { feedId: feedId as string, page: 1, pageSize: 50 },
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

  // ✅ Live subscribe to cache updates
  const posts = useMemo(() => {
    const cached = queryClient.getQueryData(queryKey) as any;
    return (cached?.items || postsResp?.items || []) as any[];
  }, [queryClient.getQueryState(queryKey)?.dataUpdatedAt, postsResp]);

  // ✅ Subscribe to feed (ref-counted across hook instances)
  useEffect(() => {
    if (!socket || !isConnected || !feedId) return;
    return acquireFeedSubscription(socket, feedType, feedId);
  }, [socket, isConnected, feedType, feedId]);

  // ✅ Cache updater helper
  const updatePostCache = useCallback(
    (updater: (items: any[]) => any[]) => {
      utils.posts.list.setData(
        { feedId: feedId as string, page: 1, pageSize: 50 },
        (old) => {
          if (!old) return old;
          const items = (old as any).items ?? [];
          const updatedItems = updater(items).map(normalizePost);
          return { ...(old as any), items: updatedItems } as any;
        }
      );
    },
    [utils, feedId, normalizePost]
  );

  // ✅ Handle post created (deduplicated)
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

  const handlePostUpdated = useCallback(
    (data: any) => {
      updatePostCache((items) =>
        items.map((post) =>
          post.id === data.postId ? { ...post, content: data.content, isEdited: data.isEdited } : post
        )
      );
    },
    [updatePostCache]
  );

  const handlePostDeleted = useCallback(
    (data: any) => updatePostCache((items) => items.filter((post) => post.id !== data.postId)),
    [updatePostCache]
  );

  const handlePostLiked = useCallback(
    (data: any) =>
      updatePostCache((items) =>
        items.map((post) => (post.id === data.postId ? { ...post, likeCount: data.likeCount } : post))
      ),
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
    posts,
    isLoading,
    ...mutations,
  };
}
