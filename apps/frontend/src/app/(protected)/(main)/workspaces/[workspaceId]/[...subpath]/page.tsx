"use client";
import React from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

const WorkspaceDashboardView = dynamic(
  () => import("@/features/dashboard/views/workspace/WorkspaceDashboardView"),
  { 
    ssr: false, 
    loading: () => <DashboardLoadingState message="Loading workspace..." /> 
  }
);

export default function WorkspaceSubpathPage() {
  const params = useParams();
  const workspaceId = params?.workspaceId as string;
  const subpath = Array.isArray(params?.subpath) ? params.subpath : undefined;

  return <WorkspaceDashboardView workspaceId={workspaceId} subpath={subpath} />;
}
