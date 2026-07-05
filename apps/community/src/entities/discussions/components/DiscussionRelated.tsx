import Link from "next/link";
import { TrendingUp, MessageSquare, ExternalLink } from "lucide-react";

interface RelatedDiscussion {
  id: string;
  title: string;
  upvotes: number;
  commentCount: number;
  topic?: string;
}

interface DiscussionRelatedProps {
  discussions: RelatedDiscussion[];
  baseHref: string;
  isLoading?: boolean;
}

export const DiscussionRelated = ({
  discussions,
  baseHref,
  isLoading = false,
}: DiscussionRelatedProps) => {
  return (
    <aside className="space-y-4">
      {/* Related Discussions Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Related Discussions
          </h3>
        </div>
        <div className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : discussions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No related discussions yet
            </p>
          ) : (
            <ul className="space-y-1">
              {discussions.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`${baseHref}/${d.id}`}
                    className="group flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5 group-hover:text-blue-600 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {d.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {d.upvotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {d.commentCount}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Stats Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-4">
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Discussion Tips</h3>
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Use clear titles to attract responses</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Tag discussions appropriately</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Upvote quality contributions</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};
