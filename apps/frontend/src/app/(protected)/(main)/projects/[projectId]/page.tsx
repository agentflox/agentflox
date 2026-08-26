"use client";
import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

const ProjectDashboardView = dynamic(
  () => import("@/features/dashboard/views/project/ProjectDashboardView"),
  { 
    ssr: false, 
    loading: () => <DashboardLoadingState message="Loading project..." /> 
  }
);

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  return <ProjectDashboardView projectId={projectId} />;
}
