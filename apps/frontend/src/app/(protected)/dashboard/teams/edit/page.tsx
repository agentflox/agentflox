"use client";
import Shell from "@/components/layout/Shell";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import TeamForm from '@/entities/teams/components/TeamForm';
import TeamView from "@/features/dashboard/views/team/TeamView";
import Button from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function TeamDetailPage() {
	const params = useParams();
	const id = params?.id as string;
	const { data: cloud, isLoading, error } = trpc.team.get.useQuery({ id }, { enabled: !!id });
	const router = useRouter();
  	const { data: session } = useSession();

  	const isOwner = !!(cloud && (cloud as any).ownerId && session?.user?.id && (cloud as any).ownerId === session.user.id);

	useEffect(() => {
		if (!isLoading && !cloud && !error) {
			router.push('/dashboard/teams');
		}
	}, [cloud, isLoading, error, router]);

	if (isLoading) {
		return (
			<Shell>
				<div className="flex items-center justify-center h-64">
					<p className="text-muted-foreground">Loading team...</p>
				</div>
			</Shell>
		);
	}

	if (!cloud) {
	    return (
	      <div className="flex items-center justify-center h-full py-20">
	        <div className="text-center space-y-4">
	          <h2 className="text-2xl font-bold">Not exist.</h2>
	          <p className="text-muted-foreground">This project does not exist.</p>
	        </div>
	      </div>
	    );
	 }

	if (!isOwner) {
	    return (
	      <div className="flex items-center justify-center h-full py-20">
	        <div className="text-center space-y-4">
	          <h2 className="text-2xl font-bold">Permission denied</h2>
	          <p className="text-muted-foreground">You are not owner of this project.</p>
	        </div>
	      </div>
	    );
	 }

	return (
		<Shell>
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">Team</h1>
			</div>
			<TeamForm teamId={id} mode="edit" />
		</Shell>
	);
}


