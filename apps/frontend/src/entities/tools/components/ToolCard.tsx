import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLinkIcon, MoreVertical, Eye, Share2, PenSquare, Wrench, Calendar, Sparkles, Workflow, ArrowRight, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
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
	const isAI = item.mode === "AI";
	const isFlow = item.mode === "MANUAL";

	return (
		<div
			className={cn(
				"group relative flex flex-col bg-white rounded-xl border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden h-full",
				isSelected
					? "border-indigo-300 ring-2 ring-indigo-200 bg-indigo-50/20"
					: "border-slate-200",
				!isSelected && isAI && "hover:border-violet-300 hover:shadow-violet-500/15",
				!isSelected && isFlow && "hover:border-sky-300 hover:shadow-sky-500/15"
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
						<Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/50 hover:bg-white backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
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
								isSelected ? "text-indigo-700" : isAI ? "text-slate-900 group-hover:text-violet-700" : "text-slate-900 group-hover:text-sky-700"
							)}>
								{item.name || "Untitled Tool"}
							</h3>

							{/* Mode Badge */}
							<span className={cn(
								"shrink-0 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm",
								isAI
									? "bg-violet-500 text-white dark:bg-violet-600"
									: "bg-sky-500 text-white dark:bg-sky-600"
							)}>
								{isAI ? <Sparkles className="h-3 w-3" /> : <Workflow className="h-3 w-3" />}
								{isAI ? "AI Mode" : "Flow Mode"}
							</span>
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
						<div className={cn(
							"flex items-center gap-1 font-bold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300",
							isAI ? "text-violet-600" : "text-sky-600"
						)}>
							<span>View</span>
							<ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}



