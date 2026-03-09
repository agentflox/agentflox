"use client";

import { useState, useMemo } from "react";
import { Search, Check, List, Kanban, Calendar, FileText, Activity, LayoutDashboard, BarChart3, Map, Table, Clock, Network, PenTool, Layout, Monitor, Sheet, Video, Image, Link, Box, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export type ViewType =
	// Popular
	| "LIST" | "BOARD" | "CALENDAR" | "GANTT" | "DOC" | "FORM"
	// Advanced
	| "TABLE" | "TIMELINE" | "WORKLOAD" | "WHITEBOARD" | "MIND_MAP" | "MAP" | "ACTIVITY" | "DASHBOARD"
	// Embeds
	| "EMBED" | "SPREADSHEET" | "FILE" | "VIDEO" | "DESIGN"
	// Legacy / Specific
	| "OVERVIEW" | "VIEWS" | "PROJECTS" | "TEAMS" | "TASKS" | "CHANNELS" | "PROPOSALS" | "TOOLS" | "MATERIALS" | "POSTS" | "DISCUSSIONS" | "LOGS" | "APPEAL" | "GOVERNANCE" | "ANALYTICS" | "WAR_ROOM" | "MARKETPLACE" | "MEMBERS" | "DOCS";

interface ViewOption {
	id: ViewType;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string; size?: number }>;
	category: "Popular" | "Advanced" | "Embeds" | "Templates" | "Other";
	color?: string;
	isTemplate?: boolean;
}

const availableViews: ViewOption[] = [
	// Popular
	{ id: "LIST", label: "List", description: "Track tasks, bugs, people & more", icon: List, category: "Popular", color: "text-slate-500 bg-slate-100" },
	{ id: "BOARD", label: "Board", description: "Kanban - Move tasks between columns", icon: Kanban, category: "Popular", color: "text-blue-600 bg-blue-100" },
	{ id: "CALENDAR", label: "Calendar", description: "Plan, schedule, & delegate", icon: Calendar, category: "Popular", color: "text-orange-600 bg-orange-100" },
	{ id: "GANTT", label: "Gantt", description: "Plan dependencies & time", icon: Network, category: "Popular", color: "text-red-500 bg-red-100" },
	{ id: "DOC", label: "Doc", description: "Collaborate & document anything", icon: FileText, category: "Popular", color: "text-cyan-500 bg-cyan-100" },
	{ id: "FORM", label: "Form", description: "Collect, track, & report data", icon: Layout, category: "Popular", color: "text-indigo-500 bg-indigo-100" },

	// Advanced
	{ id: "TABLE", label: "Table", description: "Structured table format", icon: Table, category: "Advanced", color: "text-emerald-600 bg-emerald-100" },
	{ id: "TIMELINE", label: "Timeline", description: "See tasks by start & due date", icon: Clock, category: "Advanced", color: "text-amber-700 bg-amber-100" },
	{ id: "WORKLOAD", label: "Workload", description: "Visualize team capacity", icon: BarChart3, category: "Advanced", color: "text-teal-600 bg-teal-100" },
	{ id: "WHITEBOARD", label: "Whiteboard", description: "Visualize & brainstorm ideas", icon: PenTool, category: "Advanced", color: "text-yellow-500 bg-yellow-100" },
	{ id: "MIND_MAP", label: "Mind Map", description: "Visual brainstorming of ideas", icon: Network, category: "Advanced", color: "text-pink-500 bg-pink-100" },
	{ id: "MAP", label: "Map", description: "Tasks visualized by address", icon: Map, category: "Advanced", color: "text-orange-500 bg-orange-100" },
	{ id: "DASHBOARD", label: "Dashboard", description: "Track metrics & insights", icon: LayoutDashboard, category: "Advanced", color: "text-violet-600 bg-violet-100" },
	{ id: "ACTIVITY", label: "Activity", description: "Real-time activity feed", icon: Activity, category: "Advanced", color: "text-blue-400 bg-blue-50" },

	// Embeds
	{ id: "EMBED", label: "Any website", description: "Embed any web content", icon: Link, category: "Embeds", color: "text-slate-500 bg-slate-100" },
	{ id: "SPREADSHEET", label: "Google Sheets", description: "Sync your spreadsheets", icon: Sheet, category: "Embeds", color: "text-green-600 bg-green-100" },
	{ id: "FILE", label: "Google Docs", description: "Sync your documents", icon: FileText, category: "Embeds", color: "text-blue-500 bg-blue-100" },
	{ id: "VIDEO", label: "YouTube", description: "Share your favorite videos", icon: Video, category: "Embeds", color: "text-red-600 bg-red-100" },
	{ id: "DESIGN", label: "Figma", description: "View your amazing designs", icon: Image, category: "Embeds", color: "text-purple-600 bg-purple-100" },
];

interface AddViewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	existingViews: ViewType[];
	onAddViews: (views: ViewType[]) => void;
	onAddFromTemplate?: (templateId: string) => void;
}

export function AddViewModal({ open, onOpenChange, existingViews, onAddViews, onAddFromTemplate }: AddViewModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedViews, setSelectedViews] = useState<ViewType[]>([]);

	const { data: templates = [] } = trpc.template.list.useQuery({ type: "VIEW" as any }, { enabled: open });

	const combinedViews = useMemo(() => {
		const templateViews: ViewOption[] = templates.map(t => ({
			id: t.id as any,
			label: t.name,
			description: t.description || "Template",
			icon: Sparkles,
			category: "Templates",
			color: "text-amber-600 bg-amber-100",
			isTemplate: true
		}));

		return [...availableViews, ...templateViews];
	}, [templates]);

	const filteredViews = useMemo(() => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return combinedViews;
		return combinedViews.filter(
			(view) =>
				view.label.toLowerCase().includes(query) ||
				view.description.toLowerCase().includes(query)
		);
	}, [searchQuery, combinedViews]);

	// Grouping
	const groupedViews = useMemo(() => {
		const groups: Record<string, ViewOption[]> = {
			"Popular": [],
			"Advanced": [],
			"Embeds": [],
			"Templates": []
		};
		filteredViews.forEach(view => {
			if (groups[view.category]) {
				groups[view.category].push(view);
			}
		});
		return groups;
	}, [filteredViews]);

	const toggleView = (viewId: ViewType) => {
		setSelectedViews((prev) =>
			prev.includes(viewId) ? prev.filter((id) => id !== viewId) : [...prev, viewId]
		);
	};

	const handleAdd = () => {
		const normalSelected = selectedViews.filter(id => availableViews.some(v => v.id === id));
		const templateSelected = selectedViews.filter(id => combinedViews.some(v => v.id === id && v.isTemplate));

		if (normalSelected.length > 0) {
			onAddViews(normalSelected);
		}

		if (templateSelected.length > 0 && onAddFromTemplate) {
			templateSelected.forEach(id => onAddFromTemplate(id as string));
		}

		if (selectedViews.length > 0) {
			setSelectedViews([]);
			setSearchQuery("");
			onOpenChange(false);
		}
	};

	const handleClose = () => {
		setSelectedViews([]);
		setSearchQuery("");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col p-0 gap-0 overflow-y-auto">
				<DialogHeader className="px-6 py-4 border-b shrink-0">
					<DialogTitle>Add View</DialogTitle>
					<DialogDescription>
						Choose from a variety of views to visualize your work.
					</DialogDescription>
					<div className="pt-4 relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search views..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
				</DialogHeader>

				<ScrollArea className="flex-1 p-6 bg-slate-50/50">
					<div className="space-y-8">
						{Object.entries(groupedViews).map(([category, views]) => (
							views.length > 0 && (
								<div key={category} className="space-y-3">
									<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">{category}</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
										{views.map((view) => {
											const isSelected = selectedViews.includes(view.id);
											const Icon = view.icon;
											return (
												<button
													key={view.id}
													onClick={() => toggleView(view.id)}
													className={cn(
														"relative flex items-center p-3 rounded-xl border bg-white transition-all duration-200 text-left hover:shadow-md hover:border-primary/20 hover:scale-[1.02]",
														isSelected ? "ring-2 ring-primary border-primary/50 shadow-sm" : "border-slate-200"
													)}
												>
													<div className={cn("h-10 w-10 shrink-0 rounded-lg flex items-center justify-center mr-3", view.color || "bg-slate-100 text-slate-600")}>
														<Icon size={20} />
													</div>
													<div className="flex-1 min-w-0">
														<div className="font-medium text-sm text-slate-900">{view.label}</div>
														<div className="text-xs text-slate-500 truncate">{view.description}</div>
													</div>
													{isSelected && (
														<div className="absolute top-2 right-2 h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm">
															<Check size={12} strokeWidth={3} />
														</div>
													)}
												</button>
											);
										})}
									</div>
								</div>
							)
						))}
						{filteredViews.length === 0 && (
							<div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
								<p>No views found matching "{searchQuery}"</p>
							</div>
						)}
					</div>
				</ScrollArea>

				<DialogFooter className="px-6 py-4 border-t bg-white shrink-0">
					<Button type="button" variant="ghost" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleAdd} disabled={selectedViews.length === 0}>
						Add {selectedViews.length > 0 ? `${selectedViews.length} ` : ""}View
						{selectedViews.length !== 1 ? "s" : ""}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}


