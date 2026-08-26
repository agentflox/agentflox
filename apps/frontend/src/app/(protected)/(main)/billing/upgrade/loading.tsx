import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpgradeLoading() {
  return (
    <Shell>
      <div className="space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title="Upgrade Your Account"
          description="Choose a subscription plan or purchase a one-time package to unlock more features."
        />

        <div className="w-full flex flex-col items-center">
          <div className="flex justify-center mb-8">
            <div className="bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl flex gap-2">
              <Skeleton className="h-10 w-44 rounded-lg" />
              <Skeleton className="h-10 w-44 rounded-lg" />
            </div>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 border-zinc-100 dark:border-zinc-800/60 overflow-hidden bg-white/50 dark:bg-zinc-950/50 shadow-sm">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32 rounded-md" />
                  <Skeleton className="h-10 w-24 rounded-md mt-6" />
                  <div className="space-y-3 mt-6 pb-6 border-b border-border/50">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-5/6 rounded-md" />
                    <Skeleton className="h-4 w-4/6 rounded-md" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-md mt-8" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
