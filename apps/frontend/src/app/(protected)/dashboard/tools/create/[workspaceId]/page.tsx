"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { ToolBuilderView } from "@/features/dashboard/views/tools/ToolBuilderView";

function ToolCreateContent() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Workspace not found in URL.
      </div>
    );
  }

  return <ToolBuilderView workspaceId={workspaceId} initialTool={null} />;
}

export default function ToolCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading tool builder...
        </div>
      }
    >
      <ToolCreateContent />
    </Suspense>
  );
}

