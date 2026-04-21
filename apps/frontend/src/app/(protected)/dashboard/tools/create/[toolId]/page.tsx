"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { ToolBuilderView } from "@/features/dashboard/views/tools/ToolBuilderView";

function ToolCreateContent() {
  const params = useParams<{ toolId: string }>();
  const toolId = params.toolId;

  if (!toolId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Tool Id not found in URL.
      </div>
    );
  }

  return <ToolBuilderView toolId={toolId} initialTool={null} />;
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

