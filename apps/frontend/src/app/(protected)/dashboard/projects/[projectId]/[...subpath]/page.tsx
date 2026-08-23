"use client";
import React from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

const ProjectDashboardView = dynamic(
  () => import("@/features/dashboard/views/project/ProjectDashboardView"),
  { 
    ssr: false, 
    loading: () => <DashboardLoadingState message="Loading project..." /> 
  }
);

export default function ProjectSubpathPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  return <ProjectDashboardView projectId={projectId} />;
}
