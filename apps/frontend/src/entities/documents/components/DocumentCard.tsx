"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MoreVertical, Calendar, ArrowRight, Eye, Trash2, FileText, PenSquare, Folder } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
	item: any;
	className?: string;
	isSelected?: boolean;
	onSelect?: (id: string, selected: boolean) => void;
	onDelete?: (id: string) => void;
	onOpen?: (id: string) => void;
	onManage?: (id: string) => void;
};

export function DocumentCard({ item, className, isSelected, onSelect, onDelete, onOpen, onManage }: Props) {
	const router = useRouter();

	const locationText =
		item.locationPath ||
		[
			item.workspace?.name || item.workspaceName,
			item.space?.name || item.spaceName,
			item.project?.name || item.projectName,
			item.team?.name || item.teamName,
			item.folder?.name || item.folderName,
			item.list?.name || item.listName,
		]
			.filter(Boolean)
			.join(" / ") ||
		null;

	const handleOpen = () => {
		if (onOpen) {
			onOpen(item.id);
		} else {
			router.push(`/docs/${item.id}`);
		}
	};

	return (
		<TooltipProvider delayDuration={200}>
			<div
				className={cn(
					"group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden h-full",
					isSelected ? "border-indigo-300 ring-2 ring-indigo-200 bg-indigo-50/20" : "border-slate-200 hover:border-indigo-300 hover:shadow-indigo-500/10",
					className
				)}
				onClick={handleOpen}
			>
				{/* Checkbox — top left */}
				<div
					className={cn(
						"absolute top-2 left-3 z-10 transition-opacity",
						isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
					)}
					onClick={(e) => { e.stopPropagation(); onSelect?.(item.id, !isSelected); }}
				>
					<Checkbox
						checked={isSelected}
						onCheckedChange={(checked) => onSelect?.(item.id, !!checked)}
						className="h-4 w-4 border-slate-300 bg-white shadow-sm cursor-pointer"
					/>
				</div>

				{/* Actions — top right, vertical dots */}
				<div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 z-20">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/50 hover:bg-zinc-100 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
								<MoreVertical className="h-4 w-4 text-zinc-400" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={(e) => {
								e.stopPropagation();
								if (onManage) onManage(item.id);
								else if (onOpen) onOpen(item.id);
								else router.push(`/docs/${item.id}`);
							}}>
								<PenSquare className="mr-1 h-4 w-4" />
								Edit Document
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
								className="text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
							>
								<Trash2 className="mr-1 h-4 w-4" />
								Delete Document
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="p-3 flex flex-col gap-4 flex-1 pt-12 relative z-0">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 space-y-2.5 flex-1">
							{locationText && (
								<Tooltip>
									<TooltipTrigger asChild>
										<div
											className="flex items-center gap-1.5 text-xs text-slate-500 font-normal truncate min-w-0 max-w-full"
											title={locationText}
										>
											<Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
											<span className="truncate">{locationText}</span>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>Document location</p>
									</TooltipContent>
								</Tooltip>
							)}
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-center gap-2">
									<span className="flex-shrink-0 text-lg leading-none">
										{item.icon || <FileText className="h-4 w-4 text-zinc-400" />}
									</span>
									<h3 className={cn(
										"font-medium text-base leading-snug line-clamp-1 transition-colors duration-200",
										isSelected ? "text-indigo-700" : "text-slate-900 group-hover:text-indigo-700"
									)}>
										{item.name || "Untitled Document"}
									</h3>
								</div>
							</div>
							<p className="line-clamp-2 text-sm text-slate-500 leading-relaxed">
								{item.description || "No description provided."}
							</p>
						</div>
					</div>

					<div className="mt-auto flex flex-col gap-4">
						<div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
							<div className="flex items-center gap-1.5">
								<Calendar className="h-3.5 w-3.5 text-slate-300" />
								<span className="font-medium">
									{item.updatedAt ? `Updated ${new Date(item.updatedAt).toLocaleDateString()}` : "No recent activity"}
								</span>
							</div>

							{/* Hover Open Indicator */}
							<div className={cn(
								"flex items-center gap-1 font-bold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-600"
							)}>
								<span>View</span>
								<ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}