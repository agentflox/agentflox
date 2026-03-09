"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
	GitBranch, UserIcon, Bot, MessageSquare, Paperclip,
	Calendar, CheckCircle2, MoreHorizontal, Flag, Target, ListIcon, FileText
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskTypeIcon } from "./TaskTypeIcon";


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

export function TaskCard({ item, onOpen, onConvert, className }: Props) {
	const statusLabel = typeof item.status === 'object' ? (item as any).status?.name : item.status;

	// Format date if needed
	const dueDate = item.dueDate ? new Date(item.dueDate) : null;
	const isOverdue = dueDate && dueDate < new Date();

	return (
		<div
			className={cn(
				"group relative flex flex-col bg-white rounded-lg border border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-pointer overflow-hidden",
				className
			)}
			onClick={() => onOpen?.(item.id)}
		>
			{/* Priority Stripe (Optional) */}
			{item.priority === 'URGENT' && (
				<div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
			)}

			<div className="p-3 flex flex-col gap-2">
				{/* Header: Project/Context & Actions */}
				<div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
					<div className="flex items-center gap-2">
						{item.project ? (
							<span className="truncate max-w-[100px]">{item.project.name}</span>
						) : item.team ? (
							<span className="truncate max-w-[100px]">{item.team.name}</span>
						) : (
							<span>Task</span>
						)}
						{item.parent && (
							<>
								<span className="text-zinc-300 px-0.5">/</span>
								<div className="flex items-center gap-1" title={item.parent.title}>
									<GitBranch className="h-3 w-3" />
									<span className="truncate max-w-[80px]">Parent</span>
								</div>
							</>
						)}
					</div>

					<div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-white/50 backdrop-blur-sm rounded-md">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-6 w-6">
									<MoreHorizontal className="h-4 w-4 text-zinc-500" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen?.(item.id); }}>View Details</DropdownMenuItem>
								<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onConvert?.(item.id); }}>Convert to Proposal</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* Title */}
				<div className="flex items-start gap-2">
					<div className={cn("mt-1.5 h-3.5 w-3.5 flex-shrink-0")}>
						{item.taskType ? (
							<TaskTypeIcon type={item.taskType} className="h-3.5 w-3.5" />
						) : (
							<div className={cn("mt-1 h-3 w-3 rounded-full border flex-shrink-0", getStatusColor(statusLabel))} />
						)}
					</div>
					<h3 className="text-sm font-medium text-zinc-900 leading-snug line-clamp-2">
						{item.title}
					</h3>
				</div>

				{/* Tags Section */}
				{/* <div className="flex flex-wrap gap-1">
                    {item.priority && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-zinc-200 text-zinc-500 font-normal">
                            {item.priority}
                        </Badge>
                    )}
                </div> */}

				{/* Footer: Meta Info & Assignees */}
				<div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-50 h-8">
					<div className="flex items-center gap-3 text-zinc-400">
						{getPriorityIcon(item.priority as any)}

						{dueDate && (
							<div className={cn("flex items-center gap-1 text-[11px]", isOverdue ? "text-red-500 font-medium" : "")}>
								<Calendar className="h-3 w-3" />
								<span>{dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
							</div>
						)}

						{(item._count?.comments || 0) > 0 && (
							<div className="flex items-center gap-1 text-[11px]">
								<MessageSquare className="h-3 w-3" />
								<span>{item._count?.comments}</span>
							</div>
						)}

						{(item.subtasks?.length || 0) > 0 && (
							<div className="flex items-center gap-1 text-[11px]">
								<CheckCircle2 className="h-3 w-3" />
								<span>{item.subtasks?.length}</span>
							</div>
						)}
					</div>

					<div className="flex -space-x-1.5">
						{item.assignee ? (
							<Avatar className="h-5 w-5 border border-white ring-1 ring-zinc-100">
								<AvatarImage src={item.assignee.image || undefined} />
								<AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">
									{item.assignee.name?.substring(0, 1).toUpperCase()}
								</AvatarFallback>
							</Avatar>
						) : item.assignees && item.assignees.length > 0 ? (
							item.assignees.slice(0, 3).map((a, i) => (
								<Avatar key={i} className="h-5 w-5 border border-white ring-1 ring-zinc-100">
									<AvatarImage src={a.user?.image || undefined} />
									<AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">
										{a.user?.name?.substring(0, 1).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							))
						) : (
							<div className="h-5 w-5 rounded-full border border-dashed border-zinc-300 flex items-center justify-center">
								<UserIcon className="h-3 w-3 text-zinc-300" />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
