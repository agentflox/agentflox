"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Blocks, AlertCircle } from "lucide-react";

function ToolLoadingState() {
  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-24 w-24 animate-pulse rounded-full bg-primary/5 blur-xl" />
        <div className="absolute h-16 w-16 animate-[spin_3s_linear_infinite] rounded-full border-b-2 border-l-2 border-primary/30" />
        <div className="absolute h-12 w-12 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-t-2 border-r-2 border-primary/60" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-background ring-1 ring-border shadow-sm backdrop-blur-sm">
          <Blocks className="h-4 w-4 text-primary animate-pulse" />
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium tracking-widest text-foreground uppercase">
            Initializing
          </h3>
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: "0ms" }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: "150ms" }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">
          Loading tool builder canvas...
        </p>
      </div>
    </div>
  );
}

const ToolFlowBuilderView = dynamic(
  () =>
    import("@/features/dashboard/views/tools/ToolFlowBuilderView").then(
      (m) => m.ToolFlowBuilderView,
    ),
  { ssr: false, loading: () => <ToolLoadingState /> },
);

function ToolDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  // Prefetch builder JS while tool metadata loads
  React.useEffect(() => {
    void import("@/features/dashboard/views/tools/ToolFlowBuilderView");
  }, []);

  const { data: tool, isLoading, error } = trpc.compositeTool.get.useQuery(
    { id },
    { enabled: !!id, staleTime: 60_000, refetchOnWindowFocus: false },
  );

  if (isLoading) {
    return <ToolLoadingState />;
  }

  if (error || !tool) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-destructive/10 blur-xl" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">Unable to load tool</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {error?.message || "Tool not found or you don't have access. Please check your permissions."}
          </p>
        </div>
      </div>
    );
  }

  return <ToolFlowBuilderView initialTool={tool} />;
}

export default function ToolDetailPage() {
  return (
    <Suspense fallback={<ToolLoadingState />}>
      <ToolDetailContent />
    </Suspense>
  );
}
