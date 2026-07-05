'use client';

import { usePosts } from '../hooks/usePosts';
import { PostCard } from './PostCard';
import { Loader2 } from 'lucide-react';

interface PostListProps {
  feedType: 'global' | 'user' | 'project' | 'team';
  feedId?: string;
}

export function PostList({ feedType, feedId }: PostListProps) {
  const { posts, isLoading } = usePosts(feedType, feedId);
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts yet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Be the first to share something!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} feedType={feedType} feedId={feedId} />
      ))}
    </div>
  );
}
