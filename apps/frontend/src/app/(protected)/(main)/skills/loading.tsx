import React from "react";
import Shell from "@/components/layout/Shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function SkillsLoading() {
  return (
    <Shell>
      <div className="flex flex-col space-y-6 pb-12">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Stats bar skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>

        {/* Scope bar skeleton */}
        <div className="flex items-center justify-between border-b pb-3">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>

        {/* Search bar skeleton */}
        <Skeleton className="h-10 w-full rounded-xl" />

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
