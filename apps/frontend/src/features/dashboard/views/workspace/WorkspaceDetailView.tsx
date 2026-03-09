"use client";

import { useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useWorkspaceDetail } from "@/entities/workspace";
import {
	WorkspaceContentTabs,
	ContentTab,
} from "@/features/dashboard/components/WorkspaceContentTabs";
import WorkspaceOverviewView from "./WorkspaceOverviewView";
import OrganizationView from "../organization/OrganizationView";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card.skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

type Props = {
	workspaceId: string;
};

export default function WorkspaceDetailView({ workspaceId }: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const { data: workspace, isLoading } = useWorkspaceDetail(workspaceId);

	// Get active tab from URL or default to overview
	const activeTab = (searchParams.get("tab") as ContentTab) || "overview";

	const handleTabChange = (tab: ContentTab) => {
		const params = new URLSearchParams(searchParams);
		params.set("tab", tab);
		router.push(`${pathname}?${params.toString()}`);
	};

	if (isLoading) {
		return (
			<div className="space-y-6 p-6">
				<div className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
				<div className="space-y-4">
					<CardSkeleton />
					<CardSkeleton />
				</div>
			</div>
		);
	}

	if (!workspace) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-slate-500">Workspace not found.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full bg-slate-50/50">
			{/* Organization Context Banner */}
			{workspace.organization && (
				<div className="bg-white border-b border-zinc-200 px-6 py-3">
					<div className="flex items-center gap-2 text-sm">
						<Building2 className="h-4 w-4 text-zinc-400" />
						<span className="text-zinc-500">Organization:</span>
						<button
							onClick={() => handleTabChange("organization")}
							className="font-medium text-zinc-900 hover:text-primary transition-colors"
						>
							{workspace.organization.name}
						</button>
						<Badge variant="outline" className="ml-2">
							{workspace.name}
						</Badge>
					</div>
				</div>
			)}

			<div className="sticky top-0 z-10">
				<WorkspaceContentTabs
					activeTab={activeTab}
					onTabChange={handleTabChange}
				/>
			</div>

			<div className="flex-1 overflow-auto p-6">
				{activeTab === "overview" && (
					<WorkspaceOverviewView workspaceId={workspaceId} />
				)}

				{activeTab === "organization" && workspace.organizationId && (
					<OrganizationView organizationId={workspace.organizationId} />
				)}

				{activeTab === "projects" && (
					<div className="space-y-4">
						{/* Placeholder for ProjectsListView */}
						<Card>
							<CardContent className="p-6">
								<h2 className="text-xl font-semibold mb-4">Projects</h2>
								<p className="text-slate-500">Project list view coming here...</p>
								{/* We will implement the actual list view next */}
							</CardContent>
						</Card>
					</div>
				)}

				{activeTab === "teams" && (
					<div className="space-y-4">
						{/* Placeholder for TeamsListView */}
						<Card>
							<CardContent className="p-6">
								<h2 className="text-xl font-semibold mb-4">Teams</h2>
								<p className="text-slate-500">Team list view coming here...</p>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Catch-all for other tabs */}
				{activeTab !== "overview" &&
					activeTab !== "organization" &&
					activeTab !== "projects" &&
					activeTab !== "teams" && (
						<div className="flex flex-col items-center justify-center h-64 text-slate-400">
							<p>The {activeTab} view is under construction.</p>
						</div>
					)}
			</div>
		</div>
	);
}
