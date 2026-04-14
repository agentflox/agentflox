"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceListItem } from "@/entities/spaces/types";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MoreVertical, Folder, Calendar } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
	item: SpaceListItem;
	className?: string;
	isSelected?: boolean;
	onSelect?: (id: string, selected: boolean) => void;
};

export function SpaceCard({ item, className, isSelected, onSelect }: Props) {
	const router = useRouter();

	return (
		<div
			className={cn(
				"group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden h-full",
				isSelected ? "border-blue-400 ring-1 ring-blue-200 bg-blue-50/20" : "border-zinc-200 hover:border-zinc-300",
				className
			)}
			onClick={() => router.push(`/dashboard/spaces/${item.id}`)}
		>
			{/* Checkbox — top left */}
			<div
				className={cn(
					"absolute top-2 left-2 z-10 transition-opacity",
					isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
				)}
				onClick={(e) => { e.stopPropagation(); onSelect?.(item.id, !isSelected); }}
			>
				<Checkbox
					checked={isSelected}
					onCheckedChange={(checked) => onSelect?.(item.id, !!checked)}
					className="h-4 w-4 border-zinc-300 bg-white shadow-sm cursor-pointer"
				/>
			</div>

			{/* Actions — top right, vertical dots */}
			<div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
							<MoreVertical className="h-4 w-4 text-zinc-400" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/spaces/${item.id}`); }}>
							View standalone
						</DropdownMenuItem>
						{item.workspaceId ? (
							<DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/workspaces/${item.workspaceId}?v=spaces&sid=${item.id}`); }}>
								View in workspace
							</DropdownMenuItem>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="p-4 flex flex-col gap-3 flex-1 pt-7">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-1">
						<h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-zinc-900 group-hover:text-blue-600 transition-colors">
							{item.name}
						</h3>
					</div>
					<Badge variant={item.isActive ? "default" : "secondary"}>
						{item.isActive ? "Active" : "Archived"}
					</Badge>
				</div>
				
				{item.description && (
					<p className="line-clamp-2 text-[13px] text-zinc-500">{item.description}</p>
				)}

				<div className="mt-auto pt-4 flex flex-col gap-1.5">
					{item.workspace && (
						<div className="flex items-center gap-1.5 text-xs text-zinc-500">
							<Folder className="h-3.5 w-3.5 text-zinc-400" />
							<span>{item.workspace.name}</span>
						</div>
					)}
					{item.updatedAt && (
						<div className="flex items-center gap-1.5 text-xs text-zinc-400">
							<Calendar className="h-3.5 w-3.5 text-zinc-300" />
							<span>{new Date(item.updatedAt).toLocaleDateString()}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}



