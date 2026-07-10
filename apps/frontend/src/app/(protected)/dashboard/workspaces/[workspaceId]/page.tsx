"use client";
import React, { Suspense } from "react";
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

export default function WorkspaceDetailPage() {
	const params = useParams();
	const workspaceId = params?.workspaceId as string;

	console.log("[WorkspaceDetailPage] Rendering page shell for:", workspaceId);

	return <WorkspaceDashboardView workspaceId={workspaceId} />;
}
