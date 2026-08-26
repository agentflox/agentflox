import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <Shell>
      <div className="space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title="Billing & Subscription"
          description="Manage your subscription plan, review your payment history, and purchase credits."
        />

        <div className="space-y-6">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
          
          <Card className="p-0 border-zinc-100 dark:border-zinc-800/60 overflow-hidden bg-white/50 dark:bg-zinc-950/50 shadow-sm">
            <div className="h-24 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20 p-6 flex items-center justify-between">
              <div className="space-y-3">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-700">
              <div className="p-6 space-y-6">
                <Skeleton className="h-3 w-32 uppercase tracking-widest" />
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-dashed border-zinc-100 dark:border-zinc-800 last:border-0">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-zinc-50/30 dark:bg-zinc-900/10 space-y-6">
                <Skeleton className="h-3 w-32 uppercase tracking-widest" />
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-dashed border-zinc-100 dark:border-zinc-800 last:border-0">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
