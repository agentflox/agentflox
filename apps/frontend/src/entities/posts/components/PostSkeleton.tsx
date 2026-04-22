"use client";

import { Card } from "@/components/ui/card";

export function PostSkeleton() {
  return (
    <Card className="p-6 space-y-4 overflow-hidden border-slate-200/60 shadow-sm animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-100" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-3 pt-2">
        <div className="h-6 w-3/4 rounded bg-slate-200" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-2/3 rounded bg-slate-100" />
        </div>
      </div>

      {/* Media Skeleton (simulated cover) */}
      <div className="h-48 w-full rounded-xl bg-slate-50" />

      {/* Actions Skeleton */}
      <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
        <div className="h-8 w-16 rounded-md bg-slate-100" />
        <div className="h-8 w-16 rounded-md bg-slate-100" />
        <div className="h-8 w-16 rounded-md bg-slate-100" />
      </div>
    </Card>
  );
}

export function SectionHeaderSkeleton() {
  return (
    <Card className="p-4 border-slate-200/60 shadow-sm animate-pulse mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200" />
          <div className="h-5 w-40 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 rounded-lg bg-slate-100" />
          <div className="h-8 w-24 rounded-lg bg-slate-100" />
          <div className="h-8 w-24 rounded-lg bg-indigo-100/50" />
        </div>
      </div>
    </Card>
  );
}
