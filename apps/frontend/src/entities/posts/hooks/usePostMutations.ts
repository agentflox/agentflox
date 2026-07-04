'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { normalizeTimestamp } from '@/utils/utilities/formatter';
import type { CreatePostData } from '@agentflox/types';

/**
 * Post mutations only — no feed query or socket listeners.
 * Use in PostCard / per-item components; keep usePosts at the feed level.
 */
export function usePostMutations(feedType: 'global' | 'user' | 'project' | 'team', feedId?: string) {
  const { waitForConnection } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const createProjectNotifications = trpc.notification.createForProjectMembers.useMutation();
  const createTeamNotifications = (trpc.notification as any).createForTeamMembers?.useMutation?.();

  const queryKey = ['posts.list', { feedId, page: 1, pageSize: 50 }] as const;

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

  const createPost = useMutation({
    mutationFn: async (data: CreatePostData) => {
      const tempPost = {
        id: data.id,
        content: data.content,
        project_id: data.projectId,
        team_id: data.teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
        likeCount: 0,
        commentCount: 0,
        isPending: true,
      };

      updatePostCache((items) => [tempPost, ...items]);

      try {
        const s = await waitForConnection();
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Request timeout')), 60000);
          s.emit('post:create', data, (err: any, response?: any) => {
            clearTimeout(timeoutId);
            if (err) {
              const message = typeof err === 'string' ? err : err?.message || 'Request failed';
              return reject(new Error(message));
            }
            resolve(response);
          });
        });

        updatePostCache((items) =>
          items.map((p) => (p.id === data.id ? { ...(response as any).post, isPending: false } : p))
        );

        return response;
      } catch (error) {
        updatePostCache((items) => items.filter((p) => p.id !== data.id));
        throw error;
      }
    },
    onSuccess: async (resp: any) => {
      toast({ title: 'Success', description: 'Post created successfully' });
      const projectId = resp?.post?.project_id;
      const teamId = resp?.post?.team_id;
      try {
        switch (true) {
          case !!projectId: {
            const result = await createProjectNotifications.mutateAsync({
              projectId: projectId!,
              title: 'New project post',
              content: 'A new post has been added to your project.',
              relatedId: resp?.post?.id,
              relatedType: 'POST',
            });
            const s = await waitForConnection();
            for (const uid of result.userIds || []) s.emit('notification:send', { userId: uid });
            break;
          }
          case !!teamId: {
            if (createTeamNotifications) {
              const result = await createTeamNotifications.mutateAsync({
                teamId: teamId!,
                title: 'New team post',
                content: 'A new post has been added to your team.',
                relatedId: resp?.post?.id,
                relatedType: 'POST',
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
    onError: (error: Error) =>
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      }),
  });

  const likePost = useMutation({
    mutationFn: async (postId: string) => {
      const previousData = queryClient.getQueryData(queryKey);
      updatePostCache((items) =>
        items.map((p) => (p.id === postId ? { ...p, likeCount: (p.likeCount || 0) + 1 } : p))
      );
      try {
        const s = await waitForConnection();
        s.emit('post:like', { postId });
      } catch (error) {
        queryClient.setQueryData(queryKey, previousData);
        throw error;
      }
    },
    onError: (error: Error) =>
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      }),
  });

  const unlikePost = useMutation({
    mutationFn: async (postId: string) => {
      const previousData = queryClient.getQueryData(queryKey);
      updatePostCache((items) =>
        items.map((p) => (p.id === postId ? { ...p, likeCount: Math.max(0, (p.likeCount || 0) - 1) } : p))
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

  const bookmarkPost = trpc.posts.bookmark.useMutation({
    onSuccess: (data) => {
      toast({ title: data.bookmarked ? 'Post bookmarked' : 'Bookmark removed' });
    },
  });

  const followPost = trpc.posts.follow.useMutation({
    onSuccess: (data) => {
      toast({ title: data.followed ? 'Following post' : 'Unfollowed post' });
    },
  });

  const reportPost = trpc.posts.report.useMutation({
    onSuccess: () => {
      toast({ title: 'Post reported', description: 'Thank you for helping us keep the community safe.' });
    },
  });

  return {
    createPost,
    likePost,
    unlikePost,
    bookmarkPost,
    followPost,
    reportPost,
  };
}
