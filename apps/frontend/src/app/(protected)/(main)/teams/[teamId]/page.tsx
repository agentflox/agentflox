"use client";
import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

const TeamDashboardView = dynamic(
  () => import("@/features/dashboard/views/team/TeamDashboardView"),
  { 
    ssr: false, 
    loading: () => <DashboardLoadingState message="Loading team..." /> 
  }
);

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = React.use(params);
  return <TeamDashboardView teamId={teamId} />;
}
