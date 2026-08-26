import { PageHeader } from "@/entities/shared/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AiModelsLoading() {
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
          title="AI model usage"
          description="Per-model request and token detail for system and BYOK models. System usage debits your plan token pool; custom usage is ledger-only."
          actions={<Skeleton className="h-10 w-28 rounded-md" />}
          className="px-8 pb-6"
        />
      </div>
      <div className="px-8 space-y-8">
         <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-md" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-12 rounded-md" />
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border p-3 shadow-sm">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-72 mb-4" />

          <div className="h-[min(70vh,720px)] rounded-lg border p-4 flex flex-col gap-4 overflow-hidden">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                <div className="flex gap-4 items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col items-end">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
