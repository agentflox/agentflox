import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <Shell>
      <div className="space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title="Usage"
          description="View your current limits and historical consumption."
          actions={
            <Skeleton className="h-10 w-28 rounded-md" />
          }
        />

        <Card className="p-6">
          <Skeleton className="h-7 w-40 mb-4" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="mt-3 h-7 w-24" />
                <Skeleton className="mt-5 h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Skeleton className="h-7 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3 shadow-sm">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
          <div className="mt-6 h-[360px] rounded-lg border p-4 flex flex-col gap-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col items-end">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
