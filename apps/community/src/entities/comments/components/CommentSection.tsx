'use client';

import { useState, useEffect } from 'react';
import { useComments } from '../hooks/useComments';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface CommentSectionProps {
  postId: string;
  feedId?: string;
  feedType?: 'global' | 'user' | 'project' | 'team';
  entityType?: 'post' | 'listing';
}

export function CommentSection({ postId, feedId, feedType, entityType = 'post' }: CommentSectionProps) {
  const { data: session, status } = useSession();
  const { comments, isLoading, createComment, voteComment } = useComments(postId, entityType);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const topLevelComments = comments.filter((c: any) => !c.parentId);

  return (
    <div className="space-y-4">
      {/* Comment Form or Login Prompt */}
      {status === 'unauthenticated' ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4 border rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Post a comment</h3>
          <div className="flex gap-3">
            <Link href={`/login?callbackUrl=${encodeURIComponent(currentPath)}`}>
              <Button variant="outline" className="rounded-full px-6 font-semibold h-10 bg-white hover:bg-zinc-100">Log in</Button>
            </Link>
            <Link href={`/register?callbackUrl=${encodeURIComponent(currentPath)}`}>
              <Button className="rounded-full px-6 font-semibold h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Sign up</Button>
            </Link>
          </div>
        </div>
      ) : (
        <CommentForm
          postId={postId}
          submitting={createComment.isPending}
          onSubmit={(content) => {
            createComment.mutate({
              id: uuidv4(),
              postId,
              content,
            });
          }}
          placeholder="Write a comment..."
        />
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {topLevelComments.map((comment: any) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            onReply={(commentId) => setReplyingTo(commentId)}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            entityType={entityType}
            createComment={createComment}
            voteComment={voteComment}
          />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-center text-muted-foreground py-4">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
}
