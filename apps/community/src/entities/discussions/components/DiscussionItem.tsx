import Link from "next/link";
import { MessageSquare, TrendingUp, Pin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DiscussionItemProps {
  discussion: {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    topic?: string;
    isPinned: boolean;
    upvotes: number;
    _count: { comments: number };
    updatedAt: Date | string;
    author?: {
      id: string;
      name: string | null;
      image: string | null;
    };
  };
  href: string;
}

const TOPIC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FEATURE: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  DESIGN: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  IMPLEMENTATION: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  BUGS: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  ANNOUNCEMENT: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  ISSUE: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  OTHERS: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

export const DiscussionItem = ({ discussion, href }: DiscussionItemProps) => {
  const topicStyle = discussion.topic ? TOPIC_COLORS[discussion.topic] : TOPIC_COLORS.OTHERS;
  const timeAgo = formatDistanceToNow(new Date(discussion.updatedAt), { addSuffix: true });

  return (
    <Link
      href={href}
      className="group block p-5 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50/30 transition-all duration-200 border-b border-slate-100 last:border-0"
    >
      <div className="flex items-start gap-4">
        {/* Left: Engagement Stats */}
        <div className="flex flex-col items-center gap-2 min-w-[60px] pt-1">
          <div className="flex flex-col items-center">
            <TrendingUp className="h-4 w-4 text-slate-400 mb-1" />
            <span className="text-sm font-semibold text-slate-700">
              {discussion.upvotes}
            </span>
            <span className="text-xs text-slate-400">votes</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-2">
            {discussion.isPinned && (
              <Pin className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {discussion.title}
              </h3>
              {discussion.summary && (
                <p className="text-sm text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                  {discussion.summary}
                </p>
              )}
            </div>
          </div>

          {/* Tags & Topic */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {discussion.topic && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${topicStyle.bg} ${topicStyle.text} ${topicStyle.border}`}
              >
                {discussion.topic.toLowerCase().replace('_', ' ')}
              </span>
            )}
            {discussion.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                #{tag}
              </span>
            ))}
            {discussion.tags?.length > 3 && (
              <span className="text-xs text-slate-400">
                +{discussion.tags.length - 3} more
              </span>
            )}
          </div>

          {/* Footer Meta */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{discussion._count?.comments ?? 0} comments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeAgo}</span>
            </div>
            {discussion.author && (
              <div className="flex items-center gap-1.5">
                {discussion.author.image ? (
                  <img
                    src={discussion.author.image}
                    alt={discussion.author.name || "User"}
                    className="h-4 w-4 rounded-full"
                  />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-slate-200" />
                )}
                <span className="truncate max-w-[120px]">
                  {discussion.author.name || "Anonymous"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
