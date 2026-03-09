"use client";

import { notFound } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { CommentSection } from "@/entities/comments/components/CommentSection";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";

export default function DiscussionPage() {
  const params = useParams();
  const discussionId = params?.id as string;

  const { data: discussion, isLoading, isError } = trpc.discussions.get.useQuery(
    ({ id: discussionId } as any),
    { enabled: !!discussionId }
  );

  const projectId = (discussion as any)?.projectId as string | undefined;
  const teamId = (discussion as any)?.teamId as string | undefined;

  if (isLoading) {
    return <div>Loading discussion...</div>;
  }

  if (isError || !discussion) {
    return notFound();
  }

  // Basic access gate: expect API to set canView for unauthorized users
  if ((discussion as any)?.canView === false) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Permission denied</h2>
          <p className="text-muted-foreground">You do not have access to this discussion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Top: Discussion view */}
      <div className="bg-white rounded-lg shadow border border-slate-200 mb-6">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">{(discussion as any)?.title || 'Discussion'}</h1>
              {(discussion as any)?.summary && (
                <p className="mt-1 text-slate-600">{(discussion as any)?.summary}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {((discussion as any)?.tags || []).map((t: string) => (
                  <Badge key={t} variant="secondary">#{t}</Badge>
                ))}
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              {projectId && <div>Project: {projectId}</div>}
              {teamId && <div>Team: {teamId}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Comments (outside the discussion view) */}
      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Comments</h2>
        </div>
        <div className="p-4">
          <CommentSection 
            postId={discussionId} 
            feedType={projectId ? 'project' : teamId ? 'team' : 'global'} 
            feedId={projectId || teamId}
          />
        </div>
      </div>
    </div>
  );
}
