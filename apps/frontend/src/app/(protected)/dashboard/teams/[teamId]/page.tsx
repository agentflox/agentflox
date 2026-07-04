"use client";
import React from "react";
import dynamic from "next/dynamic";

const TeamDashboardView = dynamic(
  () => import("@/features/dashboard/views/team/TeamDashboardView"),
  { loading: () => <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" /></div> }
);

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
	const { teamId } = React.use(params);
	return <TeamDashboardView teamId={teamId} />;
}
