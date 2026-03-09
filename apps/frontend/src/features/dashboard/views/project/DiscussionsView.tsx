"use client";

import { useState, useMemo } from "react";
import { Search, Plus, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDiscussions } from "@/entities/discussions/hooks/useDiscussions";
import { DISCUSSSION_FILTERS } from "../../constants";
import { DiscussionDialog } from "@/entities/discussions/components/DiscussionDialog";
import { DiscussionList } from "@/entities/discussions/components/DiscussionList";
import { DiscussionRelated } from "@/entities/discussions/components/DiscussionRelated";

interface DiscussionsViewProps {
  projectId?: string;
  teamId?: string;
}

export const DiscussionsView = ({ projectId, teamId }: DiscussionsViewProps) => {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<typeof DISCUSSSION_FILTERS[number]["key"]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const feedType = teamId ? "team" : "project";
  const feedId = teamId || projectId;
  const { discussions, isLoading, createPost } = useDiscussions(feedType, feedId);

  // Filter discussions based on search and active filter
  const filteredDiscussions = useMemo(() => {
    let filtered = [...discussions];

    // Apply search query
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title?.toLowerCase().includes(searchLower) ||
          d.summary?.toLowerCase().includes(searchLower) ||
          d.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply topic filter
    if (activeFilter !== "all") {
      switch (activeFilter) {
        case "feature":
          filtered = filtered.filter((d) => d.topic === "FEATURE");
          break;
        case "design":
          filtered = filtered.filter((d) => d.topic === "DESIGN");
          break;
        case "implementation":
          filtered = filtered.filter((d) => d.topic === "IMPLEMENTATION");
          break;
        case "bugs":
          filtered = filtered.filter((d) => d.topic === "BUGS");
          break;
        case "announcements":
          filtered = filtered.filter((d) => d.topic === "ANNOUNCEMENT");
          break;
        case "issues":
          filtered = filtered.filter((d) => d.topic === "ISSUE");
          break;
        case "others":
          filtered = filtered.filter((d) => d.topic === "OTHERS" || !d.topic);
          break;
        case "pinned":
          filtered = filtered.filter((d) => d.isPinned);
          break;
        case "active":
          filtered = filtered.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
          break;
        case "upvoted":
          filtered = filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
          break;
        case "author":
          // This would need user context - for now just sort by most recent
          filtered = filtered.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          break;
      }
    }

    return filtered;
  }, [discussions, query, activeFilter]);

  // Get related discussions (most upvoted, excluding current view)
  const relatedDiscussions = useMemo(() => {
    return [...discussions]
      .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        title: d.title,
        upvotes: d.upvotes || 0,
        commentCount: d.commentCount || 0,
        topic: d.topic,
      }));
  }, [discussions]);

  const activeFilterLabel = DISCUSSSION_FILTERS.find((f) => f.key === activeFilter)?.label;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
            Discussions
          </h1>
          <p className="text-slate-600">
            Share ideas, ask questions, and collaborate with your team
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search discussions, tags, or keywords..."
                className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle & Create Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-11"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {activeFilter !== "all" && (
                  <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    1
                  </span>
                )}
              </Button>
              <Button onClick={() => setDialogOpen(true)} className="h-11">
                <Plus className="h-4 w-4 mr-2" />
                New Discussion
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-700">Filter by:</span>
                {activeFilter !== "all" && (
                  <Button
                    variant="ghost"
                    onClick={() => setActiveFilter("all")}
                    className="h-7 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {DISCUSSSION_FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    variant={activeFilter === f.key ? "primary" : "outline"}
                    onClick={() => setActiveFilter(f.key)}
                    className={`h-8 text-xs transition-all ${
                      activeFilter === f.key
                        ? "bg-blue-600 text-white shadow-md"
                        : "hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Filter Badge */}
        {activeFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-slate-600">Showing:</span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {activeFilterLabel}
              <button
                onClick={() => setActiveFilter("all")}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
            <span className="text-sm text-slate-500">
              ({filteredDiscussions.length} {filteredDiscussions.length === 1 ? "result" : "results"})
            </span>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Related Discussions Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <DiscussionRelated
              discussions={relatedDiscussions}
              baseHref="/dashboard/discussions"
              isLoading={isLoading}
            />
          </div>

          {/* Discussion List */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      All Discussions
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {isLoading
                        ? "Loading..."
                        : `${filteredDiscussions.length} discussion${
                            filteredDiscussions.length !== 1 ? "s" : ""
                          }`}
                    </p>
                  </div>
                </div>
              </div>
              <DiscussionList
                discussions={filteredDiscussions}
                isLoading={isLoading}
                emptyMessage={
                  query
                    ? "No discussions match your search. Try different keywords."
                    : activeFilter !== "all"
                    ? `No ${activeFilterLabel?.toLowerCase()} found. Try a different filter.`
                    : "No discussions yet. Start a conversation!"
                }
                baseHref="/dashboard/discussions"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Discussion Dialog */}
      <DiscussionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        teamId={teamId}
        onCreated={async () => {
          setDialogOpen(false);
        }}
      />
    </div>
  );
};
