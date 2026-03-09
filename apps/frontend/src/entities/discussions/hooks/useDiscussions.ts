'use client';

import { useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/useToast';
import { normalizeTimestamp } from '@/utils/utilities/formatter';
import { CreatePostData } from '@agentflox/types';

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
  const { socket, isConnected, waitForConnection } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const subscribedRef = useRef(false);
  const processedEvents = useRef(new Set<string>());
  const createProjectNotifications = trpc.notification.createForProjectMembers.useMutation();
  const createTeamNotifications = (trpc.notification as any).createForTeamMembers?.useMutation?.();

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

  // ✅ Subscribe to feed
  useEffect(() => {
    if (!socket || !isConnected || subscribedRef.current) return;

    socket.emit('feed:subscribe', { feedType, feedId });
    subscribedRef.current = true;

    return () => {
      if (socket && subscribedRef.current) {
        socket.emit('feed:unsubscribe', { feedType, feedId });
        subscribedRef.current = false;
      }
    };
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

  // ✅ Register socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('post:created', handlePostCreated);
    socket.on('post:updated', handlePostUpdated);
    socket.on('post:deleted', handlePostDeleted);
    socket.on('post:liked', handlePostLiked);
    socket.on('post:unliked', handlePostLiked);

    return () => {
      socket.off('post:created', handlePostCreated);
      socket.off('post:updated', handlePostUpdated);
      socket.off('post:deleted', handlePostDeleted);
      socket.off('post:liked', handlePostLiked);
      socket.off('post:unliked', handlePostLiked);
    };
  }, [socket, isConnected, handlePostCreated, handlePostUpdated, handlePostDeleted, handlePostLiked]);

  // ✅ Create post (optimistic)
  const createPost = useMutation({
    mutationFn: async (data: CreatePostData & { title?: string; topic?: string }) => {
      const tempPost = normalizePost({
        id: data.id,
        title: data.title || "New Discussion",
        content: data.content,
        topic: data.topic,
        projectId: data.projectId,
        teamId: data.teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        commentCount: 0,
        isPending: true,
      });

      updatePostCache((items) => [tempPost, ...items]);

      try {
        const s = await waitForConnection();
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Request timeout')), 60000);

          s.emit('post:create', data, (err: any, response?: any) => {
            clearTimeout(timeoutId);
            if (err) return reject(new Error(typeof err === 'string' ? err : err?.message || 'Request failed'));
            resolve(response);
          });
        });

        updatePostCache((items) =>
          items.map((p) =>
            p.id === data.id ? normalizePost({ ...(response as any).post, isPending: false }) : p
          )
        );

        return response;
      } catch (error) {
        updatePostCache((items) => items.filter((p) => p.id !== data.id));
        throw error;
      }
    },
    onSuccess: async (resp: any) => {
      toast({ title: 'Success', description: 'Discussion created successfully' });
      const projectId = resp?.post?.project_id as string | undefined;
      const teamId = resp?.post?.team_id as string | undefined;
      try {
        switch (true) {
          case !!projectId: {
            const result = await createProjectNotifications.mutateAsync({
              projectId: projectId!,
              title: 'New project discussion',
              content: 'A new discussion has been created in your project.',
              relatedId: resp?.post?.id as string | undefined,
              relatedType: 'PROJECT',
            });
            const s = await waitForConnection();
            for (const uid of result.userIds || []) s.emit('notification:send', { userId: uid });
            break;
          }
          case !!teamId: {
            if (createTeamNotifications) {
              const result = await createTeamNotifications.mutateAsync({
                teamId: teamId!,
                title: 'New team discussion',
                content: 'A new discussion has been created in your team.',
                relatedId: resp?.post?.id as string | undefined,
                relatedType: 'TEAM',
              } as any);
              const s = await waitForConnection();
              for (const uid of result.userIds || []) s.emit('notification:send', { userId: uid });
            }
            break;
          }
        }
      } catch (e) {
        console.warn('Failed to create/broadcast notifications', e);
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ✅ Like post (optimistic)
  const likePost = useMutation({
    mutationFn: async (postId: string) => {
      const previousData = queryClient.getQueryData(queryKey);
      updatePostCache((items) =>
        items.map((p) =>
          p.id === postId ? { ...p, upvotes: (p.upvotes || 0) + 1 } : p
        )
      );

      try {
        const s = await waitForConnection();
        s.emit('post:like', { postId });
      } catch (error) {
        queryClient.setQueryData(queryKey, previousData);
        throw error;
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ✅ Unlike post (optimistic)
  const unlikePost = useMutation({
    mutationFn: async (postId: string) => {
      const previousData = queryClient.getQueryData(queryKey);
      updatePostCache((items) =>
        items.map((p) =>
          p.id === postId ? { ...p, upvotes: Math.max(0, (p.upvotes || 0) - 1) } : p
        )
      );

      try {
        const s = await waitForConnection();
        s.emit('post:unlike', { postId });
      } catch (error) {
        queryClient.setQueryData(queryKey, previousData);
        throw error;
      }
    },
  });

  return {
    discussions,
    isLoading,
    createPost,
    likePost,
    unlikePost,
  };
}
