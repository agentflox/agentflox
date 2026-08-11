import { PageHeader } from "@/entities/shared/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ExecutionsLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="px-8 pt-2 pb-2">
          <Button variant="ghost" disabled className="text-muted-foreground mb-[8px] -ml-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <PageHeader
          title="Execution usage"
          description="Each billed run against your plan execution quota — tool, agent, workforce, swarm, and chat."
          actions={<Skeleton className="h-10 w-28 rounded-md" />}
          className="px-8 pb-6"
        />
      </div>
      <div className="px-8 space-y-8">
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-20 rounded-md" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-12 rounded-md" />
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border p-3 shadow-sm">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <Skeleton className="h-7 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </div>
          <div className="h-[560px] rounded-lg border p-4 flex flex-col gap-4 overflow-hidden">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col items-end">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
