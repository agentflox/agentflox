'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowBigUp, ArrowBigDown, MessageCircle } from 'lucide-react';
import { useComments } from '../hooks/useComments';
import { CommentForm } from './CommentForm';
import type { PostComment } from '@agentflox/database/src/generated/prisma/client';
import { cn } from '@/lib/utils';
import { useFormattedTime } from '@/hooks/useFormattedTime';
import { v4 as uuidv4 } from 'uuid';

interface CommentItemProps {
  comment: PostComment;
  allComments: PostComment[];
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  depth?: number;
}

export function CommentItem({
  comment,
  allComments,
  onReply,
  replyingTo,
  setReplyingTo,
  depth = 0,
}: CommentItemProps) {
  const formattedTime = useFormattedTime(comment.createdAt);
  const { voteComment, createComment } = useComments(comment.postId);
  const [userVote, setUserVote] = useState<'UPVOTE' | 'DOWNVOTE' | null>(null);
  const [showReplies, setShowReplies] = useState(true);

  const handleVote = async (voteType: 'UPVOTE' | 'DOWNVOTE') => {
    try {
      if (userVote === voteType) {
        setUserVote(null);
        // Optional: remove vote on backend
      } else {
        await voteComment.mutateAsync({
          commentId: comment.id,
          voteType,
        });
        setUserVote(voteType);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleReplySubmit = (content: string) => {
    createComment.mutate({
      id: uuidv4(),
      postId: comment.postId,
      content,
      parentId: comment.id,
    });
    setReplyingTo(null);
  };

  const isReplyingToThis = replyingTo === comment.id;
  const maxDepth = 5;
  const replies = allComments.filter((c) => c.parentId === comment.id);

  return (
    <div className={cn('flex gap-3', depth > 0 && 'ml-8')}>
      {/* Avatar */}
      <Avatar className="h-8 w-8">
        <AvatarImage src={''} />
        <AvatarFallback>?</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">User {comment?.userId?.slice(0, 4)}</span>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
          {comment.isEdited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className={cn('h-7 px-2', userVote === 'UPVOTE' && 'text-orange-500')}
            onClick={() => handleVote('UPVOTE')}
          >
            <ArrowBigUp className={cn('h-4 w-4 mr-1', userVote === 'UPVOTE' && 'fill-current')} />
            {comment.upvotes}
          </Button>

          <Button
            variant="ghost"
            className={cn('h-7 px-2', userVote === 'DOWNVOTE' && 'text-blue-500')}
            onClick={() => handleVote('DOWNVOTE')}
          >
            <ArrowBigDown className={cn('h-4 w-4 mr-1', userVote === 'DOWNVOTE' && 'fill-current')} />
            {comment.downvotes}
          </Button>

          {depth < maxDepth && (
            <Button
              variant="ghost"
              className="h-7 px-2"
              onClick={() => onReply(comment.id)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Reply
            </Button>
          )}

          {replies.length > 0 && (
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? 'Hide' : 'Show'} {replies.length}{' '}
              {replies.length === 1 ? 'reply' : 'replies'}
            </Button>
          )}
        </div>

        {/* Reply Form */}
        {isReplyingToThis && (
          <div className="mt-2">
            <CommentForm
              postId={comment.postId}
              onSubmit={handleReplySubmit}
              onCancel={() => setReplyingTo(null)}
              placeholder={`Reply to user...`}
              autoFocus
            />
          </div>
        )}

        {/* Nested Replies */}
        {showReplies && replies.length > 0 && (
          <div className="space-y-4 mt-4">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                allComments={allComments}
                onReply={onReply}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
