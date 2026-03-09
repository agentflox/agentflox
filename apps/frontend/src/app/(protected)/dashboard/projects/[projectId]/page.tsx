"use client";
import React from "react";
import ProjectDashboardView from "@/features/dashboard/views/project/ProjectDashboardView";

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  return <ProjectDashboardView projectId={projectId} />;
}
