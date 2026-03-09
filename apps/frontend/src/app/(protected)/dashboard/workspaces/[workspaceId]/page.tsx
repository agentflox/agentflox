"use client";
import { useParams } from "next/navigation";
import WorkspaceViewComponent from "@/features/dashboard/views/workspace/WorkspaceView";

export default function WorkspaceDetailPage() {
	const params = useParams();
	const workspaceId = params?.workspaceId as string;
	return <WorkspaceViewComponent workspaceId={workspaceId} />;
}