import { Skeleton } from '@/components/ui/skeleton';

export function IntegrationsPageSkeleton() {
  return (
    <div className="pb-6">
      <div className="pb-4 bg-white border-b border-zinc-200">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-10 w-full max-w-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-6 pb-12">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
