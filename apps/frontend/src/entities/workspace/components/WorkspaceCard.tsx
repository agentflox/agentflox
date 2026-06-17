"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Clock, Eye, MoreVertical, Briefcase, Users, FolderKanban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
    isSelected?: boolean;
    onSelect?: (id: string, selected: boolean) => void;
};

export function WorkspaceCard({ item, onOpen, isSelected, onSelect }: Props) {
	const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

	return (
        <div
            className={cn(
                "group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden h-full",
                isSelected ? "border-blue-400 ring-1 ring-blue-200 bg-blue-50/20" : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            )}
            onClick={() => onOpen?.(item.id)}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen?.(item.id); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Workspace
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

			<div className="p-4 flex flex-col gap-3 flex-1 pt-10">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1.5 min-w-0">
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-zinc-900 group-hover:text-blue-600 transition-colors dark:text-zinc-50">
								{item.name}
							</h3>
							<div
								className={`h-2 w-2 flex-shrink-0 rounded-full ${item.isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`}
								title={item.isActive ? "Active" : "Archived"}
							/>
						</div>
					</div>
                </div>

				<p className="line-clamp-2 text-[13px] text-zinc-500 dark:text-zinc-400">
					{item.description || "No description provided."}
				</p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-400 dark:text-zinc-500 mt-2">
					{item._count && (
						<>
							{item._count.members !== undefined && (
								<div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-zinc-300" />
									<span className="text-zinc-600 dark:text-zinc-300">
										{item._count.members}
									</span>
								</div>
							)}
							{item._count.projects !== undefined && (
								<div className="flex items-center gap-1.5">
                                    <FolderKanban className="h-4 w-4 text-zinc-300" />
									<span className="text-zinc-600 dark:text-zinc-300">
										{item._count.projects}
									</span>
								</div>
							)}
						</>
					)}
				</div>

                <div className="mt-auto pt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-zinc-300" />
                            <span>
                                {updatedAt ? `Updated ${updatedAt.toLocaleDateString()}` : "No recent activity"}
                            </span>
                        </div>
                    </div>
                </div>
			</div>
		</div>
	);
}



