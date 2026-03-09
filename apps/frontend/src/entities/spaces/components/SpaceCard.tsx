"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceListItem } from "@/entities/spaces/types";
import { useRouter } from "next/navigation";

type Props = {
	item: SpaceListItem;
};

export function SpaceCard({ item }: Props) {
	const router = useRouter();
	const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;
	const counts = item._count ?? {};

	return (
		<Card className="flex h-full flex-col">
			<CardHeader className="space-y-3">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-1">
						<CardTitle className="truncate text-lg">{item.name}</CardTitle>
						{item.workspace && (
							<p className="text-xs text-muted-foreground">
								Workspace: <span className="font-medium text-foreground">{item.workspace.name}</span>
							</p>
						)}
					</div>
					<Badge variant={item.isActive ? "default" : "secondary"}>
						{item.isActive ? "Active" : "Archived"}
					</Badge>
				</div>
				{item.description && (
					<p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
				)}
			</CardHeader>
			<CardFooter className="flex flex-col gap-2">
				{item.workspaceId ? (
					<>
						<Button
							className="w-full"
							onClick={() => router.push(`/dashboard/workspaces/${item.workspaceId}?v=spaces&sid=${item.id}`)}
						>
							View in workspace
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => router.push(`/dashboard/spaces/${item.id}`)}
						>
							View standalone
						</Button>
					</>
				) : (
					<Button
						className="w-full"
						onClick={() => router.push(`/dashboard/workspaces/cmkl6sy9v0000w5rg7uwrreht?v=spaces&sid=${item.id}`)}
					>
						View space
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}



