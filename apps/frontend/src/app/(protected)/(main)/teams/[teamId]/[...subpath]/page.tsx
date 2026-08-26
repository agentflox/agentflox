"use client";
import React from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

const TeamDashboardView = dynamic(
  () => import("@/features/dashboard/views/team/TeamDashboardView"),
  { 
    ssr: false, 
    loading: () => <DashboardLoadingState message="Loading team..." /> 
  }
);

export default function TeamSubpathPage() {
  const params = useParams();
  const teamId = params?.teamId as string;
  const subpath = Array.isArray(params?.subpath) ? params.subpath : undefined;

  return <TeamDashboardView teamId={teamId} subpath={subpath} />;
}
