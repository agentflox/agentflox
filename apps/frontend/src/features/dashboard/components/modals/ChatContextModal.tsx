"use client";

import { useState, useMemo } from "react";
import { Search, Check, X, FolderKanban, Users, FileCheck, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export type ContextEntity = {
	type: "workspace" | "space" | "project" | "team" | "member" | "proposal";
	id: string;
	name: string;
	description?: string;
};

interface ChatContextModalProps {
	workspaceId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedContexts: ContextEntity[];
	onContextsChange: (contexts: ContextEntity[]) => void;
}

export function ChatContextModal({
	workspaceId,
	open,
	onOpenChange,
	selectedContexts,
	onContextsChange,
}: ChatContextModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState<"workspaces" | "spaces" | "projects" | "teams" | "members" | "proposals">(
		"workspaces"
	);

	const { data: workspace } = trpc.workspace.get.useQuery({ id: workspaceId }, { enabled: open && !!workspaceId });
	const { data: spaces } = trpc.space.list.useQuery(
		{ workspaceId, page: 1, pageSize: 100 },
		{ enabled: open && activeTab === "spaces" }
	);
	// Use workspace data for projects and teams since they're already included
	const projects = useMemo(() => workspace?.projects ?? [], [workspace?.projects]);
	const teams = useMemo(() => workspace?.teams ?? [], [workspace?.teams]);
	// Proposals might not be in workspace.get, so we'll use workspace data if available or empty array
	const proposals = useMemo(() => [], []);

	const toggleContext = (entity: ContextEntity) => {
		const exists = selectedContexts.some((c) => c.type === entity.type && c.id === entity.id);
		if (exists) {
			onContextsChange(selectedContexts.filter((c) => !(c.type === entity.type && c.id === entity.id)));
		} else {
			onContextsChange([...selectedContexts, entity]);
		}
	};

	const isSelected = (type: string, id: string) => {
		return selectedContexts.some((c) => c.type === type && c.id === id);
	};

	const getFilteredItems = () => {
		const query = searchQuery.toLowerCase().trim();
		switch (activeTab) {
			case "workspaces":
				return workspace
					? [
							{
								type: "workspace" as const,
								id: workspace.id,
								name: workspace.name,
								description: workspace.description || undefined,
							},
					  ].filter(
							(item) =>
								!query ||
								item.name.toLowerCase().includes(query) ||
								item.description?.toLowerCase().includes(query)
					  )
					: [];
			case "spaces":
				return (
					spaces?.items
						?.map((space) => ({
							type: "space" as const,
							id: space.id,
							name: space.name,
							description: space.description || undefined,
						}))
						.filter(
							(item) =>
								!query ||
								item.name.toLowerCase().includes(query) ||
								item.description?.toLowerCase().includes(query)
						) || []
				);
			case "projects":
				return (
					projects
						?.map((project: any) => ({
							type: "project" as const,
							id: project.id,
							name: project.name,
							description: project.description || undefined,
						}))
						.filter(
							(item) =>
								!query ||
								item.name.toLowerCase().includes(query) ||
								item.description?.toLowerCase().includes(query)
						) || []
				);
			case "teams":
				return (
					teams
						?.map((team: any) => ({
							type: "team" as const,
							id: team.id,
							name: team.name,
							description: team.description || undefined,
						}))
						.filter(
							(item) =>
								!query ||
								item.name.toLowerCase().includes(query) ||
								item.description?.toLowerCase().includes(query)
						) || []
				);
			case "members":
				return (
					workspace?.members
						?.map((member) => ({
							type: "member" as const,
							id: member.user.id,
							name: member.user.name || "Unknown",
							description: member.user.email || undefined,
						}))
						.filter(
							(item) =>
								!query ||
								item.name.toLowerCase().includes(query) ||
								item.description?.toLowerCase().includes(query)
						) || []
				);
			case "proposals":
				return (
					proposals
						?.map((proposal: any) => ({
							type: "proposal" as const,
							id: proposal.id,
							name: proposal.title || proposal.name,
							description: proposal.description || undefined,
						}))
						.filter(
							(item) =>
								!query ||
								item.name.toLowerCase().includes(query) ||
								item.description?.toLowerCase().includes(query)
						) || []
				);
			default:
				return [];
		}
	};

	const filteredItems = getFilteredItems();

	const handleClose = () => {
		setSearchQuery("");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[700px]">
				<DialogHeader>
					<DialogTitle>Select Context</DialogTitle>
					<DialogDescription>
						Choose entities to include in the chat context. The AI will have access to information from these
						sources.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>

					{/* Selected Contexts */}
					{selectedContexts.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs font-medium text-muted-foreground">
								Selected ({selectedContexts.length})
							</p>
							<div className="flex flex-wrap gap-2">
								{selectedContexts.map((context) => (
									<Badge
										key={`${context.type}-${context.id}`}
										variant="secondary"
										className="flex items-center gap-1.5 pr-1"
									>
										{context.name}
										<button
											onClick={() => toggleContext(context)}
											className="ml-1 rounded-full hover:bg-slate-200"
										>
											<X className="h-3 w-3" />
										</button>
									</Badge>
								))}
							</div>
						</div>
					)}

					{/* Tabs */}
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
						<TabsList className="grid w-full grid-cols-6">
							<TabsTrigger value="workspaces" className="text-xs">
								<Building2 className="mr-1 h-3 w-3" />
								Workspaces
							</TabsTrigger>
							<TabsTrigger value="spaces" className="text-xs">
								<FolderKanban className="mr-1 h-3 w-3" />
								Spaces
							</TabsTrigger>
							<TabsTrigger value="projects" className="text-xs">
								<FolderKanban className="mr-1 h-3 w-3" />
								Projects
							</TabsTrigger>
							<TabsTrigger value="teams" className="text-xs">
								<Users className="mr-1 h-3 w-3" />
								Teams
							</TabsTrigger>
							<TabsTrigger value="members" className="text-xs">
								<User className="mr-1 h-3 w-3" />
								Members
							</TabsTrigger>
							<TabsTrigger value="proposals" className="text-xs">
								<FileCheck className="mr-1 h-3 w-3" />
								Proposals
							</TabsTrigger>
						</TabsList>

						<TabsContent value={activeTab} className="mt-4">
							<div className="max-h-[400px] space-y-1 overflow-y-auto rounded-lg border border-slate-200">
								{filteredItems.length === 0 ? (
									<div className="flex items-center justify-center py-12 px-4 text-center">
										<div>
											<p className="text-sm font-medium text-foreground">No items found</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{searchQuery ? "Try a different search term" : "No items available"}
											</p>
										</div>
									</div>
								) : (
									filteredItems.map((item) => {
										const selected = isSelected(item.type, item.id);
										return (
											<button
												key={`${item.type}-${item.id}`}
												onClick={() => toggleContext(item)}
												className={cn(
													"flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
													"hover:bg-slate-50",
													selected && "bg-slate-50"
												)}
											>
												<div
													className={cn(
														"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
														selected
															? "border-primary bg-primary text-primary-foreground"
															: "border-slate-300"
													)}
												>
													{selected && <Check className="h-3 w-3" />}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<p className="text-sm font-medium text-foreground">{item.name}</p>
														<Badge variant="outline" className="text-xs">
															{item.type}
														</Badge>
													</div>
													{item.description && (
														<p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
															{item.description}
														</p>
													)}
												</div>
											</button>
										);
									})
								)}
							</div>
						</TabsContent>
					</Tabs>
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={handleClose}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

