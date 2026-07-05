import { Loader2, MessageSquare } from "lucide-react";
import { DiscussionItem } from "./DiscussionItem";

interface DiscussionListProps {
  discussions: any[];
  isLoading: boolean;
  emptyMessage?: string;
  baseHref: string;
}

export const DiscussionList = ({
  discussions,
  isLoading,
  emptyMessage = "No discussions yet. Start a conversation!",
  baseHref,
}: DiscussionListProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm text-slate-600 font-medium">Loading discussions...</p>
        <p className="text-xs text-slate-400 mt-1">This will only take a moment</p>
      </div>
    );
  }

  if (discussions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-slate-100 p-4 mb-4">
          <MessageSquare className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-base font-medium text-slate-700 mb-1">No discussions found</p>
        <p className="text-sm text-slate-500 text-center max-w-md">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {discussions.map((discussion) => (
        <DiscussionItem
          key={discussion.id}
          discussion={discussion}
          href={`${baseHref}/${discussion.id}`}
        />
      ))}
    </div>
  );
};
