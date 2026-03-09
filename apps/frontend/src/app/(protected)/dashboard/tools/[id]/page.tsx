"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { ToolBuilderView } from "@/features/dashboard/views/tools/ToolBuilderView";

function ToolDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: tool, isLoading, error } = trpc.compositeTool.get.useQuery({ id }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading tool...
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {error?.message || "Tool not found or you don't have access."}
      </div>
    );
  }

  return <ToolBuilderView workspaceId={tool.workspaceId} initialTool={tool as any} />;
}

export default function ToolDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading tool...
        </div>
      }
    >
      <ToolDetailContent />
    </Suspense>
  );
}

