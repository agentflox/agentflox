"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MemberSkeleton() {
  return (
    <Card className="group relative flex flex-col overflow-hidden border-slate-200/60 transition-all h-full animate-pulse">
      {/* Background Decor */}
      <div className="h-20 bg-slate-100" />

      <div className="flex-1 flex flex-col px-6 pb-6 pt-0">
        <div className="flex flex-col items-center -mt-12 flex-1">
          {/* Avatar Skeleton */}
          <div className="h-24 w-24 border-4 border-white shadow-lg ring-1 ring-slate-100 rounded-full bg-slate-200" />

          <div className="mt-4 text-center space-y-2">
            {/* Name Skeleton */}
            <div className="h-5 w-32 mx-auto rounded bg-slate-200" />
            {/* Role/Location Skeleton */}
            <div className="h-4 w-24 mx-auto rounded bg-slate-100" />
          </div>
        </div>

        {/* Button Skeleton */}
        <div className="mt-6 h-10 w-full rounded-full bg-slate-100" />
      </div>
    </Card>
  );
}

export function AppealSkeleton() {
  return (
    <Card className="overflow-hidden border-slate-200/60 shadow-sm animate-pulse">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 flex-1">
            {/* Avatar Skeleton */}
            <div className="h-10 w-10 rounded-full bg-slate-200 border border-slate-100" />
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                {/* Name Skeleton */}
                <div className="h-4 w-24 rounded bg-slate-200" />
                {/* Status Badge Skeleton */}
                <div className="h-4 w-16 rounded bg-slate-100" />
              </div>
              {/* Message Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-3/4 rounded bg-slate-100" />
              </div>
            </div>
          </div>
          {/* Action Menu Skeleton */}
          <div className="h-8 w-8 rounded-full bg-slate-100" />
        </div>
      </div>
    </Card>
  );
}

export function GroupCardSkeleton() {
  return (
    <div className="flex flex-col justify-between h-[160px] rounded-xl border border-slate-200 bg-white p-6 animate-pulse">
      <div className="space-y-4 w-full">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-lg bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-6 w-12 rounded-full bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded bg-slate-50" />
          <div className="h-3.5 w-2/3 rounded bg-slate-50" />
        </div>
      </div>
    </div>
  );
}

export function GroupHeaderSkeleton() {
  return (
    <Card className="mb-4 border-slate-200 px-4 py-3 animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div className="h-6 w-48 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-slate-100" />
            ))}
          </div>
          <div className="h-8 w-24 rounded-full bg-slate-100" />
          <div className="h-8 w-24 rounded-full bg-indigo-100/50" />
        </div>
      </div>
    </Card>
  );
}
