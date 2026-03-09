"use client";
import React from "react";
import TeamDashboardView from "@/features/dashboard/views/team/TeamDashboardView";

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
	const { teamId } = React.use(params);
	return <TeamDashboardView teamId={teamId} />;
}