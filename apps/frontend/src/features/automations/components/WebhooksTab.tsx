"use client";

import { useState } from "react";
import { GitBranch, Search, Webhook, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { ActiveToggle } from "./shared/ActiveToggle";

export function WebhooksTab({
  onCreate,
  onEdit,
}: {
  onCreate: () => void;
  onEdit: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);

  const list = trpc.webhook.list.useQuery({
    type: "automation",
    search: search || undefined,
    isActive: activeFilter,
  });
  const setActive = trpc.webhook.setActive.useMutation({ onSuccess: () => list.refetch() });

  const items = list.data?.items ?? [];
  const activeCount = list.data?.activeCount ?? 0;
  const inactiveCount = list.data?.inactiveCount ?? 0;
  const hasFilters = search.length > 0 || activeFilter !== true;

  const clearFilters = () => {
    setSearch("");
    setSearchOpen(false);
    setActiveFilter(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter(true)}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer",
              activeFilter === true
                ? "bg-zinc-200 border-zinc-300 text-zinc-800"
                : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            Active
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] text-white">
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter(false)}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer",
              activeFilter === false
                ? "bg-zinc-200 border-zinc-300 text-zinc-800"
                : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            Inactive
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-300 px-1 text-[10px] text-zinc-700">
              {inactiveCount}
            </span>
          </button>
          {searchOpen ? (
            <div className="flex items-center gap-2 px-3 h-8 w-56 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20">
              <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <Input
                autoFocus
                variant="ghost"
                className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400"
                placeholder="Search webhooks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="button"
                className="cursor-pointer p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                onClick={() => {
                  setSearch("");
                  setSearchOpen(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 rounded-md border border-zinc-200 bg-zinc-100 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-200 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
          )}
        </div>
        <Button
          size="sm"
          className="bg-zinc-900 hover:bg-zinc-700 text-white h-8 cursor-pointer shrink-0"
          onClick={onCreate}
        >
          Create Webhook
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        {list.isLoading ? (
          <p className="py-16 text-center text-sm text-zinc-400">Loading webhooks…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-5 h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
              <GitBranch className="h-6 w-6 text-zinc-700" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">Let&apos;s set up your first Webhook!</h3>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Connect your apps seamlessly with Webhooks to send real-time updates, automate processes, and supercharge your integrations.
            </p>
            <Button
              type="button"
              className="mt-6 h-9 rounded-md bg-zinc-900 px-4 text-sm text-white hover:bg-zinc-800 cursor-pointer"
              onClick={onCreate}
            >
              Create Webhook
            </Button>
            {hasFilters && (
              <button
                type="button"
                className="mt-3 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y border rounded-lg mt-4">
            {items.map((hook: any) => (
              <button
                key={hook.id}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 cursor-pointer"
                onClick={() => onEdit(hook.id)}
              >
                <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                  <Webhook className="h-4 w-4 text-zinc-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">{hook.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{hook.url}</p>
                </div>
                <div
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <ActiveToggle
                    checked={hook.isActive}
                    onCheckedChange={(v) => {
                      setActive.mutate({ id: hook.id, isActive: v });
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
