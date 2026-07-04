"use client";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const WorkspaceDashboardView = dynamic(
  () => import("@/features/dashboard/views/workspace/WorkspaceDashboardView"),
  { loading: () => <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" /></div> }
);

export default function WorkspaceDetailPage() {
	const params = useParams();
	const workspaceId = params?.workspaceId as string;
	return <WorkspaceDashboardView workspaceId={workspaceId} />;
}
