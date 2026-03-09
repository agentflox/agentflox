'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

interface ProposalCommentSectionProps {
  proposalId: string;
}

export function ProposalCommentSection({ proposalId }: ProposalCommentSectionProps) {
  const [content, setContent] = useState('');

  const listQuery = trpc.comments.listProposal.useQuery({ proposalId, page: 1, pageSize: 100 }, { enabled: !!proposalId });
  const createMutation = trpc.comments.createProposal.useMutation({
    onSuccess: () => {
      setContent('');
      listQuery.refetch();
    }
  });

  const comments = useMemo(() => listQuery.data?.items || [], [listQuery.data]);
  const topLevel = useMemo(() => comments.filter((c: any) => !c.parentId), [comments]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={''} alt={''} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!content.trim() || createMutation.isPending) return;
                createMutation.mutate({ proposalId, content: content.trim() });
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Write a comment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <Button type="submit" disabled={!content.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Posting...' : 'Comment'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {topLevel.map((comment: any) => (
            <div key={comment.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user?.avatar || ''} alt={comment.user?.name || ''} />
                  <AvatarFallback>{(comment.user?.name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold">{comment.user?.name || 'User'}</div>
                  <div className="text-sm text-foreground/90">{comment.content}</div>
                </div>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No comments yet. Be the first to comment!</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ProposalCommentSection;


