'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
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
  entityType?: 'post' | 'listing';
}

export function CommentItem({
  comment,
  allComments,
  onReply,
  replyingTo,
  setReplyingTo,
  depth = 0,
  entityType = 'post',
}: CommentItemProps) {
  const formattedTime = useFormattedTime(comment.createdAt);
  const { voteComment, createComment } = useComments(comment.postId, entityType);
  const [userVote, setUserVote] = useState<'UPVOTE' | 'DOWNVOTE' | null>(null);
  const [showReplies, setShowReplies] = useState(false);

  const replies = allComments.filter((c) => c.parentId === comment.id);
  const isReplyingToThis = replyingTo === comment.id;
  const maxDepth = 5;

  const handleVote = async (voteType: 'UPVOTE' | 'DOWNVOTE') => {
    try {
      if (userVote === voteType) {
        setUserVote(null);
      } else {
        await voteComment.mutateAsync({ commentId: comment.id, voteType });
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
    setShowReplies(true);
  };

  return (
    <div className="flex gap-3 relative">
      {/* Trunk Line — connects all nested replies down the tree block */}
      {showReplies && replies.length > 0 && (
        <div
          className={cn(
            "absolute w-[2px] bg-zinc-200 dark:bg-zinc-800 z-0",
            depth === 0 ? "left-[17px] top-[40px] bottom-[42px]" : "left-[13px] top-[30px] bottom-[42px]"
          )}
        />
      )}

      {/* Branch Curve — extends out from Trunk to child relative node */}
      {depth > 0 && (
        <div
          className="absolute border-l-2 border-b-2 border-zinc-200 dark:border-zinc-800 rounded-bl-[14px] z-0 pointer-events-none"
          style={{
            left: depth === 1 ? "-30px" : "-26px",
            width: depth === 1 ? "40px" : "34px",
            top: "-12px",
            height: "26px"
          }}
        />
      )}

      {/* Avatar column */}
      <div className="flex flex-col items-center flex-shrink-0 z-10 w-fit h-fit pt-0.5">
        <Avatar className={cn('ring-4 ring-background', depth === 0 ? 'h-9 w-9' : 'h-7 w-7')}>
          <AvatarImage src={''} />
          <AvatarFallback
            className={cn(
              'font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
              depth === 0 ? 'text-sm' : 'text-xs'
            )}
          >
            {comment?.userId?.slice(0, 1).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Comment body */}
      <div className="flex-1 min-w-0 pb-2 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100">
            User {comment?.userId?.slice(0, 4)}
          </span>
          <span className="text-[12px] text-zinc-500">{formattedTime}</span>
          {comment.isEdited && (
            <span className="text-[11px] text-zinc-400">(edited)</span>
          )}
        </div>

        {/* Content */}
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 mb-2">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {entityType === 'post' && (
            <div className="flex items-center">
              <button
                onClick={() => handleVote('UPVOTE')}
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer',
                  userVote === 'UPVOTE' && 'text-blue-600'
                )}
              >
                <ArrowBigUp className={cn('h-5 w-5', userVote === 'UPVOTE' && 'fill-current')} />
              </button>
              <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 min-w-[1ch] text-center">
                {comment.upvotes - comment.downvotes > 0 ? comment.upvotes - comment.downvotes : ''}
              </span>
              <button
                onClick={() => handleVote('DOWNVOTE')}
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer',
                  userVote === 'DOWNVOTE' && 'text-blue-600'
                )}
              >
                <ArrowBigDown className={cn('h-5 w-5', userVote === 'DOWNVOTE' && 'fill-current')} />
              </button>
            </div>
          )}

          {depth < maxDepth && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-[12px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors px-3 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Reply
            </button>
          )}
        </div>

        {/* Reply form */}
        {isReplyingToThis && (
          <div className="mt-3 mb-2 relative z-50 isolate"> {/* Higher z-index for the active form */}
            <CommentForm
              postId={comment.postId}
              onSubmit={handleReplySubmit}
              onCancel={() => setReplyingTo(null)}
              submitting={createComment.isPending}
              placeholder="Add a reply..."
              autoFocus
            />
          </div>
        )}

        {/* Start Toggle replies button — Render only if HIDDEN */}
        {!showReplies && replies.length > 0 && (
          <button
            onClick={() => setShowReplies(true)}
            className="flex items-center gap-2 mt-2 text-[13px] font-semibold text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            <ArrowBigDown className="h-4 w-4" />
            View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {/* Nested replies */}
        {showReplies && replies.length > 0 && (
          <div className="mt-3 space-y-3 relative">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                allComments={allComments}
                onReply={onReply}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                depth={depth + 1}
                entityType={entityType}
              />
            ))}

            {/* Bottom Toggle — acts as terminating tether node */}
            <div className="relative pt-0 z-10 w-fit">
              {/* Branch curve extending to Toggle string */}
              <div
                className="absolute border-l-2 border-b-2 border-zinc-200 dark:border-zinc-800 rounded-bl-[14px] z-[-1] pointer-events-none"
                style={{
                  left: depth === 0 ? "-30px" : "-26px",
                  width: depth === 0 ? "40px" : "34px",
                  top: "-12px",
                  height: "26px"
                }}
              />
              <button
                onClick={() => setShowReplies(false)}
                className="flex items-center gap-2 text-[13px] font-semibold text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-full transition-colors bg-background/80 backdrop-blur-sm cursor-pointer"
              >
                <ArrowBigUp className="h-4 w-4" />
                Hide replies
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}