"use client";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type WorkspaceSummary = {
	id: string;
	name: string;
	description?: string | null;
	isActive?: boolean | null;
	updatedAt?: string | Date | null;
	_count?: {
		members?: number;
		projects?: number;
		teams?: number;
		tasks?: number;
		channels?: number;
	};
};

type Props = {
	item: WorkspaceSummary;
	onOpen?: (id: string) => void;
};

export function WorkspaceCard({ item, onOpen }: Props) {
	const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

	return (
		<Card
			onClick={() => onOpen?.(item.id)}
			className="group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-200 hover:border-zinc-400 hover:shadow-md dark:hover:border-zinc-700"
		>
			<CardHeader className="space-y-4 pb-4">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							<CardTitle className="truncate text-base font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
								{item.name}
							</CardTitle>
							<div
								className={`h-2 w-2 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-zinc-300"
									}`}
								title={item.isActive ? "Active" : "Archived"}
							/>
						</div>
						{item.description && (
							<p className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
								{item.description}
							</p>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="mt-auto pb-4 pt-0">
				<div className="flex items-center gap-4 text-xs font-medium text-zinc-400 dark:text-zinc-500">
					{item._count && (
						<>
							{item._count.members !== undefined && (
								<div className="flex items-center gap-1.5">
									<span>Members</span>
									<span className="text-zinc-600 dark:text-zinc-300">
										{item._count.members}
									</span>
								</div>
							)}
							{item._count.projects !== undefined && (
								<div className="flex items-center gap-1.5">
									<span>Projects</span>
									<span className="text-zinc-600 dark:text-zinc-300">
										{item._count.projects}
									</span>
								</div>
							)}
						</>
					)}
				</div>
			</CardContent>
			<CardFooter className="border-t bg-zinc-50/50 px-6 py-3 dark:bg-zinc-900/50">
				<div className="flex w-full items-center justify-between text-xs text-zinc-400">
					<span>
						{updatedAt
							? `Updated ${updatedAt.toLocaleDateString(undefined, {
								month: "short",
								day: "numeric",
							})}`
							: "No recent activity"}
					</span>
				</div>
			</CardFooter>
		</Card>
	);
}



