import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon, MoreVertical, Eye, Share2, PenSquare, Wrench, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ToolSummary = {
	id: string;
	name: string;
	description?: string | null;
	category?: string | null;
	productUrl?: string | null;
	isPublic?: boolean | null;
	updatedAt?: string | Date | null;
	mode?: string | null;
};

type Props = {
	item: ToolSummary;
	onOpen?: (id: string) => void;
	onManage?: (id: string) => void;
	onDelete?: (id: string) => void;
	isSelected?: boolean;
	onSelect?: (id: string, selected: boolean) => void;
};

export function ToolCard({ item, onOpen, onManage, onDelete, isSelected, onSelect }: Props) {
	const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

	return (
		<div
			className={cn(
				"group relative flex flex-col bg-white rounded-xl border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden h-full",
				isSelected
					? "border-indigo-300 ring-2 ring-indigo-200 bg-indigo-50/20"
					: "border-slate-200 hover:border-slate-300 hover:shadow-slate-500/10"
			)}
			onClick={() => onOpen?.(item.id)}
		>
			{/* Checkbox — top left */}
			<div
				className={cn(
					"absolute top-3 left-3 z-10 transition-opacity duration-200",
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
			<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-2 right-2 z-10">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/50 hover:bg-zinc-100 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
							<MoreVertical className="h-4 w-4 text-zinc-500" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManage?.(item.id); }}>
							<PenSquare className="mr-2 h-4 w-4" />
							Edit Tool
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
							className="text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete tool
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="p-3 flex flex-col gap-4 flex-1 pt-12 relative z-0">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-2.5 flex-1">
						<div className="flex items-start justify-between gap-3">
							<h3 className={cn(
								"font-bold text-base leading-snug line-clamp-1 transition-colors duration-200",
								isSelected ? "text-indigo-700" : "text-slate-900 group-hover:text-indigo-600"
							)}>
								{item.name || "Untitled Tool"}
							</h3>
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
								{updatedAt ? `Updated ${updatedAt.toLocaleDateString()}` : "No recent activity"}
							</span>
						</div>

						{/* Hover Open Indicator */}
						<div className="flex items-center gap-1 font-bold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-600">
							<span>View</span>
							<ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}




