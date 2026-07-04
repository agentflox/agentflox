'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { normalizeTimestamp } from '@/utils/utilities/formatter';
import type { CreatePostData } from '@agentflox/types';

/**
 * Discussion mutations only — no query or socket listeners.
 * Use in dialogs; keep useDiscussions at list/feed level.
 */
export function useDiscussionMutations(
  feedType: 'global' | 'user' | 'project' | 'team',
  feedId?: string,
  options?: {
    query?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { waitForConnection } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
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

  const normalizePost = useCallback(
    (src: any) => ({
      ...src,
      id: src.id,
      title: src.title || src.content?.split('\n')[0]?.slice(0, 120) || 'Untitled discussion',
      summary: src.summary || src.content?.split('\n').slice(1).join(' ').slice(0, 180) || '',
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
    }),
    []
  );

  const updatePostCache = useCallback(
    (updater: (items: any[]) => any[]) => {
      utils.discussions.list.setData(queryParams as any, (old: any) => {
        if (!old) return old;
        const items = (old as any).items ?? [];
        const updatedItems = updater(items).map(normalizePost);
        return { ...(old as any), items: updatedItems } as any;
      });
    },
    [utils, queryParams, normalizePost]
  );

  const createPost = useMutation({
    mutationFn: async (data: CreatePostData & { title?: string; topic?: string }) => {
      const tempPost = normalizePost({
        id: data.id,
        title: data.title || 'New Discussion',
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

  const likePost = useMutation({
    mutationFn: async (postId: string) => {
      const previousData = queryClient.getQueryData(queryKey);
      updatePostCache((items) =>
        items.map((p) => (p.id === postId ? { ...p, upvotes: (p.upvotes || 0) + 1 } : p))
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

  const unlikePost = useMutation({
    mutationFn: async (postId: string) => {
      const previousData = queryClient.getQueryData(queryKey);
      updatePostCache((items) =>
        items.map((p) => (p.id === postId ? { ...p, upvotes: Math.max(0, (p.upvotes || 0) - 1) } : p))
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

  return { createPost, likePost, unlikePost };
}
