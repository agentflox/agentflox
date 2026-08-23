"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
	GitBranch, UserIcon, Bot, MessageSquare, Paperclip,
	Calendar, CheckCircle2, MoreVertical, Flag, Target, ListIcon, FileText, PenSquare, Trash2, ArrowRight, Folder
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskTypeIcon } from "./TaskTypeIcon";
import { EntityStatusBadge } from "@/components/ui/status-badge";

type TaskSummary = {
	id: string;
	title: string;
	description?: string | null;
	status?: string | null;
	priority?: string | null;  // Assuming priority exists or will exist
	visibility?: string | null;
	isPublic?: boolean | null;
	parentId?: string | null;
	project?: { id: string; name: string | null } | null;
	team?: { id: string; name: string | null } | null;
	channel?: { id: string; name: string | null } | null;
	workspace?: { id: string; name: string | null } | null;
	space?: { id: string; name: string | null } | null;
	list?: { id: string; name: string | null; locationType?: string | null; folder?: { id: string; name: string | null } | null } | null;
	assignee?: { id: string; name: string | null; email: string | null; image?: string | null } | null;
	assignees?: Array<{
		id: string;
		userId: string | null;
		agentId: string | null;
		user?: { id: string; name: string | null; email: string | null; image: string | null } | null;
		agent?: { id: string; name: string | null; avatar: string | null } | null;
	}>;
	parent?: { id: string; title: string } | null;
	subtasks?: TaskSummary[];
	updatedAt?: string | Date | null;
	_count?: {
		comments?: number;
		attachments?: number;
	};
	dueDate?: string | Date | null;
	taskType?: "TASK" | "MILESTONE" | "FORM_RESPONSE" | "MEETING_NOTE";
};

type Props = {
	item: TaskSummary;
	onOpen?: (id: string) => void;
	onConvert?: (id: string) => void;
	className?: string;
	isSelected?: boolean;
	onSelect?: (id: string, selected: boolean) => void;
	onDelete?: (id: string) => void;
};

const getStatusColor = (status: string | null | undefined) => {
	switch (status?.toLowerCase()) {
		case "done":
		case "completed": return "bg-emerald-500 text-white border-emerald-600";
		case "in_progress":
		case "in progress": return "bg-blue-500 text-white border-blue-600";
		case "blocked": return "bg-red-500 text-white border-red-600";
		default: return "bg-zinc-200 text-zinc-600 border-zinc-300"; // Todo/Open
	}
};

const getPriorityIcon = (priority: string | null | undefined) => {
	switch (priority) {
		case 'URGENT': return <Flag className="h-3 w-3 fill-red-500 text-red-600" />;
		case 'HIGH': return <Flag className="h-3 w-3 fill-orange-500 text-orange-600" />;
		case 'NORMAL': return <Flag className="h-3 w-3 text-blue-500" />;
		case 'LOW': return <Flag className="h-3 w-3 text-zinc-400" />;
		default: return null;
	}
};

export function TaskCard({ item, onOpen, onConvert, className, isSelected, onSelect, onDelete }: Props) {
	const statusLabel = typeof item.status === 'object' ? (item as any).status?.name : item.status;

	const locationText =
		(item as any).locationPath ||
		(item.list?.locationType === 'PERSONAL'
			? `My personal / ${item.list?.name || 'List'}`
			: [
				item.workspace?.name,
				item.space?.name,
				item.team?.name,
				item.project?.name,
				item.list?.folder?.name,
				item.list?.name
			].filter(Boolean).join(' / ') || null);

	// Format date if needed
	const dueDate = item.dueDate ? new Date(item.dueDate) : null;
	const isOverdue = dueDate && dueDate < new Date();

	return (
		<div
			className={cn(
				"group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden h-full",
				isSelected ? "border-emerald-300 ring-2 ring-emerald-200 bg-emerald-50/20" : "border-slate-200 hover:border-emerald-300 hover:shadow-emerald-500/10",
				className
			)}
			onClick={() => onOpen?.(item.id)}
		>
			{/* Priority Stripe (Optional) */}
			{item.priority === 'URGENT' && (
				<div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
			)}

			{/* Checkbox — top left, visible on hover or when selected */}
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
						<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen?.(item.id); }}>
							<PenSquare className="mr-1 h-4 w-4" />
							Edit Task
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
							className="text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
						>
							<Trash2 className="mr-1 h-4 w-4" />
							Delete Task
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="p-3 flex flex-col gap-4 flex-1 pt-12 relative z-0">
				{/* Location / Destination */}
				{locationText && (
					<div
						className="flex items-center gap-1.5 text-xs text-slate-500 font-normal truncate min-w-0 max-w-full"
						title={locationText}
					>
						<Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
						<span className="truncate">{locationText}</span>
						{item.parent && (
							<div className="flex items-center gap-1 shrink-0 ml-2 text-zinc-400" title={item.parent.title}>
								<GitBranch className="h-3 w-3" />
								<span className="truncate text-xs max-w-[80px]">{item.parent.title}</span>
							</div>
						)}
					</div>
				)}

				{/* Title & Description */}
				<div className="min-w-0 space-y-2.5 flex-1">
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-2">
							<div className="h-4 w-4 flex items-center justify-center flex-shrink-0">
								{item.taskType && <TaskTypeIcon type={item.taskType} className="h-4 w-4" />}
							</div>
							<h3 className={cn(
								"font-medium text-base leading-snug line-clamp-1 transition-colors duration-200",
								isSelected ? "text-indigo-700" : "text-slate-900 group-hover:text-indigo-700"
							)}>
								{item.title || "Untitled Task"}
							</h3>
						</div>
						<div className="shrink-0">
							<EntityStatusBadge status={statusLabel} />
						</div>
					</div>
					{item.description ? (
						<div
							className="line-clamp-2 text-sm text-slate-500 leading-relaxed"
							dangerouslySetInnerHTML={{ __html: item.description }}
						/>
					) : (
						<p className="line-clamp-2 text-sm text-slate-500 leading-relaxed">
							No description provided.
						</p>
					)}
				</div>

				{/* Tags Section */}
				{/* <div className="flex flex-wrap gap-1">
                    {item.priority && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-zinc-200 text-zinc-500 font-normal">
                            {item.priority}
                        </Badge>
                    )}
                </div> */}

				{/* Footer */}
				<div className="mt-auto flex flex-col gap-4">
					<div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
						<div className="flex items-center gap-1.5">
							<Calendar className="h-3.5 w-3.5 text-slate-300" />
							<span className="font-medium">
								{item.updatedAt ? `Updated ${new Date(item.updatedAt).toLocaleDateString()}` : "No recent activity"}
							</span>
						</div>

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
	);
}
