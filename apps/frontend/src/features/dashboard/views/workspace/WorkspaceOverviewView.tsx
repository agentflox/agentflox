"use client";

import { useMemo } from "react";
import { useWorkspaceDetail } from "@/entities/workspace";
import { WorkspaceHero } from "@/features/dashboard/components/workspace/WorkspaceHero";
import { WorkspaceStats } from "@/features/dashboard/components/workspace/WorkspaceStats";
import { ActiveChannelsCard } from "@/features/dashboard/components/workspace/ActiveChannelsCard";
import { SpacesCard } from "@/features/dashboard/components/workspace/SpacesCard";
import { ProjectLandscapeCard } from "@/features/dashboard/components/workspace/ProjectLandscapeCard";
import { TeamMovementsCard } from "@/features/dashboard/components/workspace/TeamMovementsCard";
import { ResourceLibraryCard } from "@/features/dashboard/components/workspace/ResourceLibraryCard";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
	workspaceId: string;
};

export default function WorkspaceOverviewView({ workspaceId }: Props) {
	const { data, isLoading } = useWorkspaceDetail(workspaceId);
	const workspace = data ?? null;

	return (
		<div className="space-y-8 pb-10 fade-in-up animate-in slide-in-from-bottom-5 duration-500">

			{/* 1. Hero Section */}
			<WorkspaceHero workspace={workspace} isLoading={isLoading} />

			{/* 2. Stats Row */}
			<WorkspaceStats workspace={workspace} isLoading={isLoading} />

			{/* 3. Main Content Grid */}
			<div className="grid gap-6 lg:grid-cols-2 xl:gap-8">
				{/* Left Column */}
				<div className="space-y-6">
					<ActiveChannelsCard workspace={workspace} isLoading={isLoading} />
					<ProjectLandscapeCard workspace={workspace} isLoading={isLoading} />
				</div>

				{/* Right Column */}
				<div className="space-y-6">
					<SpacesCard workspace={workspace} isLoading={isLoading} />
					<TeamMovementsCard workspace={workspace} isLoading={isLoading} />
				</div>

				{/* Full Width */}
				<ResourceLibraryCard workspace={workspace} isLoading={isLoading} />
			</div>
		</div>
	);
}
