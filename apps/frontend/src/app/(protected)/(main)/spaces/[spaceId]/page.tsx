"use client";
import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { DashboardLoadingState } from "@/features/dashboard/components/shared/DashboardStates";

const SpaceDashboardView = dynamic(
  () => import("@/features/dashboard/views/space/SpaceDashboardView"),
  { 
    ssr: false, 
    loading: () => <DashboardLoadingState message="Loading space..." /> 
  }
);

export default function SpaceDetailPage() {
  const params = useParams();
  const spaceId = params?.spaceId as string;
  return <SpaceDashboardView spaceId={spaceId} />;
}
