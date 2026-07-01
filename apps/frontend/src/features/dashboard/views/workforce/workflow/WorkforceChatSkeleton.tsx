"use client";

import React from "react";

export function WorkforceChatSkeleton() {
  return (
    <div className="flex h-full flex-col bg-[#fafafa] min-h-0">
      {/* Message area skeleton */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex justify-end">
            <div className="h-12 w-2/3 rounded-2xl rounded-tr-sm bg-zinc-200 animate-pulse" />
          </div>
          <div className="flex justify-start">
            <div className="h-14 w-3/4 rounded-2xl bg-zinc-200 animate-pulse" />
          </div>
          <div className="flex justify-end">
            <div className="h-10 w-1/2 rounded-2xl rounded-tr-sm bg-zinc-200 animate-pulse" />
          </div>
        </div>
      </div>
      {/* Composer area skeleton */}
      <div className="flex-none px-4 py-4 bg-white border-t border-zinc-200">
        <div className="max-w-2xl mx-auto">
          <div className="h-[100px] w-full rounded-xl border border-zinc-200 bg-zinc-50 animate-pulse" />
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="h-3 w-8 bg-zinc-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-zinc-200 rounded animate-pulse" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-zinc-200" />
            <div className="h-8 w-32 rounded-full bg-zinc-200 animate-pulse" />
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
