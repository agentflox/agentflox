'use client';

import { useState } from 'react';
import { useComments } from '../hooks/useComments';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CommentSectionProps {
  postId: string;
  feedId?: string;
  feedType?: 'global' | 'user' | 'project' | 'team';
}

export function CommentSection({ postId, feedId, feedType }: CommentSectionProps) {
  const { comments, isLoading, createComment } = useComments(postId);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

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
      {/* Comment Form */}
      <CommentForm
        postId={postId}
        feedId={feedId}
        feedType={feedType}
        onSubmit={(content) => {
          createComment.mutate({
            id: uuidv4(),
            postId,
            content,
          });
        }}
        placeholder="Write a comment..."
      />

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
