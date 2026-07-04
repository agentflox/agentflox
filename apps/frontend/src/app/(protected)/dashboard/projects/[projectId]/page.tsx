"use client";
import React from "react";
import dynamic from "next/dynamic";

const ProjectDashboardView = dynamic(
  () => import("@/features/dashboard/views/project/ProjectDashboardView"),
  { loading: () => <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" /></div> }
);

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  return <ProjectDashboardView projectId={projectId} />;
}
