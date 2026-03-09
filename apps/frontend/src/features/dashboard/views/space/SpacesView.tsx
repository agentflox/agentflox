"use client";

import { useState, useEffect } from "react";
import { Plus, FolderKanban, MoreHorizontal, Search, ChevronsLeft, ChevronsRight, LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LoadingContainer } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { useWorkspaceDetail } from "@/entities/workspace";
import { SpaceCreationModal } from "@/entities/spaces/components/SpaceCreationModal";
import { SpaceActionsMenu } from "@/features/dashboard/components/sidebar/SpaceActionsMenu";
import { SpaceCreateMenu } from "@/features/dashboard/components/sidebar/SpaceCreateMenu";
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import { ProjectImportModal } from "@/entities/projects/components/ProjectImportModal";
import { TeamImportModal } from "@/entities/teams/components/TeamImportModal";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import SpaceDetailView from "./SpaceDetailView";
import { ManageSpacesView } from "./ManageSpacesView";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";

interface SpacesViewProps {
	workspaceId: string;
	selectedSpaceId?: string;
	onSpaceSelect?: (spaceId: string) => void;
}

export default function SpacesView({ workspaceId, selectedSpaceId, onSpaceSelect }: SpacesViewProps) {
	const { data: workspace, isLoading: isLoadingWorkspace } = useWorkspaceDetail(workspaceId);
	const { toast } = useToast();
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [activeEntityId, setActiveEntityId] = useState<string | null>(null);

	// View & Sidebar State
	const [viewMode, setViewMode] = useState<'detail' | 'manage'>('detail');
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [showArchived, setShowArchived] = useState(false);

	// Modal states for create/import
	const [createProjectOpen, setCreateProjectOpen] = useState(false);
	const [importProjectOpen, setImportProjectOpen] = useState(false);
	const [createTeamOpen, setCreateTeamOpen] = useState(false);
	const [importTeamOpen, setImportTeamOpen] = useState(false);

	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Use TRPC infinite query for infinite loading
	const {
		data,
		isLoading: isSpacesLoading,
		isError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = trpc.space.listInfinite.useInfiniteQuery(
		{
			workspaceId,
			query: debouncedQuery,
			status: showArchived ? undefined : "active",
			pageSize: 20,
			scope: "all",
		},
		{
			getNextPageParam: (lastPage) => {
				const nextPage = lastPage.page + 1;
				const totalPages = Math.ceil(lastPage.total / 20);
				return nextPage <= totalPages ? nextPage : undefined;
			},
			initialPageParam: 1,
		} as any
	);

	// Flatten all pages into a single array
	const spaces = data?.pages.flatMap((page) => page.items) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	const isLoadingSpaces = isLoadingWorkspace || isSpacesLoading;

	const activeSpaceId = selectedSpaceId;

	// Auto-select first space if available and no space is selected
	useEffect(() => {
		if (!activeSpaceId && spaces.length > 0 && !isLoadingSpaces && !viewMode.includes('manage')) {
			if (onSpaceSelect) {
				onSpaceSelect(spaces[0].id);
			}
		}
	}, [activeSpaceId, spaces, isLoadingSpaces, onSpaceSelect, viewMode]);

	// Determine empty state
	const showEmptyState = !isLoadingSpaces && spaces.length === 0 && !searchQuery;

	// Fetch projects and teams for the workspace (only if sidebar expanded for now, or always?)
	// Optimization: could pause fetching if sidebar collapsed, but let's keep it simple
	const { data: projectsData } = trpc.project.list.useQuery(
		{ workspaceId, scope: "owned", pageSize: 50 },
		{ enabled: !!workspaceId }
	);
	const { data: teamsData } = trpc.team.list.useQuery(
		{ workspaceId, scope: "owned", pageSize: 50 },
		{ enabled: !!workspaceId }
	);

	const projects = projectsData?.items ?? [];
	const teams = teamsData?.items ?? [];

	const handleSpaceClick = (spaceId: string) => {
		if (onSpaceSelect) {
			onSpaceSelect(spaceId);
		}
		setViewMode('detail');
	};

	// Utils for cache invalidation
	const utils = trpc.useUtils();

	const handleCreateSuccess = (spaceId: string) => {
		utils.space.listInfinite.invalidate();
		handleSpaceClick(spaceId);
	};

	const handleCreateInternal = (type: 'list' | 'folder' | 'doc', spaceId?: string) => {
		if (spaceId) setActiveEntityId(spaceId);
		toast({ title: `Create ${type} coming soon`, description: "This feature is in development." });
	};

	const handleCreateEntity = (type: 'project' | 'team', mode: 'new' | 'import', spaceId?: string) => {
		if (spaceId) setActiveEntityId(spaceId);
		if (type === 'project') {
			mode === 'new' ? setCreateProjectOpen(true) : setImportProjectOpen(true);
		} else {
			mode === 'new' ? setCreateTeamOpen(true) : setImportTeamOpen(true);
		}
	};

	const handleCreateSpace = () => {
		setCreateModalOpen(true);
	};

	return (
		<div className="flex h-full gap-0 bg-background transition-all">
			{/* Spaces Sidebar */}
			<aside className={cn(
				"shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden",
				isSidebarCollapsed ? "w-0 border-none" : "w-80 border-r border-slate-200"
			)}>
				<div className="flex h-full flex-col overflow-hidden">


					{/* Header */}
					{/* Header */}
					{!isSidebarCollapsed && (
						<div className="flex flex-col border-b border-slate-200">
							{isSearchOpen ? (
								<div className="flex items-center gap-2 px-3 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
									<Search className="h-4 w-4 text-muted-foreground shrink-0" />
									<Input
										autoFocus
										placeholder="Search sidebar..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2 text-sm placeholder:text-muted-foreground/70"
									/>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0 rounded-full hover:bg-slate-100"
										onClick={() => {
											setIsSearchOpen(false);
											setSearchQuery("");
										}}
									>
										<X className="h-3 w-3 text-muted-foreground" />
									</Button>
								</div>
							) : (
								<div className="flex items-center justify-between px-4 py-3">
									<h2 className="text-sm font-semibold text-foreground">Spaces</h2>
									<div className="flex items-center gap-1">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-56">
												<DropdownMenuItem onClick={() => setCreateModalOpen(true)}>
													<Plus className="mr-2 h-4 w-4" /> Create Space
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => setViewMode("manage")}>
													<LayoutGrid className="mr-2 h-4 w-4" /> Manage Spaces
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<div className="flex items-center justify-between px-2 py-1.5 focus:bg-accent focus:text-accent-foreground rounded-sm outline-none w-full" onClick={(e) => {
													e.preventDefault();
													setShowArchived(!showArchived);
												}}>
													<span className="text-sm">Show archived</span>
													<Switch
														checked={showArchived}
														onCheckedChange={setShowArchived}
														className="scale-75 origin-right"
													/>
												</div>
											</DropdownMenuContent>
										</DropdownMenu>

										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-muted-foreground hover:text-foreground"
											onClick={() => setIsSearchOpen(true)}
											title="Search"
										>
											<Search className="h-4 w-4" />
										</Button>

										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-muted-foreground hover:text-foreground"
											onClick={() => setIsSidebarCollapsed(true)}
											title="Collapse Sidebar"
										>
											<ChevronsLeft className="h-4 w-4" />
										</Button>

										<Button
											onClick={handleCreateSpace}
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-muted-foreground hover:text-foreground"
											title="Create Space"
										>
											<Plus className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</div>
					)}
					{/* Collapsed state is now handled by floating button in main content area to save space */}

					{/* Spaces List - Hidden when collapsed */}
					{!isSidebarCollapsed && (
						<div className="flex-1 overflow-y-auto px-2 py-2">
							{isError ? (
								<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
									<p className="text-sm text-red-500">Failed to load spaces</p>
									<Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="mt-2 text-xs">
										Retry
									</Button>
								</div>
							) : isLoadingSpaces ? (
								<LoadingContainer
									label="Loading spaces..."
									spinnerSize="md"
									padding="md"
								/>
							) : spaces.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
									<FolderKanban className="mb-4 h-12 w-12 text-muted-foreground/50" />
									<p className="text-sm font-medium text-foreground">No spaces found</p>
									{searchQuery && (
										<p className="mt-1 text-xs text-muted-foreground">
											Try adjusting your search
										</p>
									)}
								</div>
							) : (
								<div className="space-y-1">
									{spaces.map((space) => {
										const isActive = activeSpaceId === space.id;
										return (
											<div
												key={space.id}
												className={cn(
													"group/item flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors",
													"hover:bg-slate-50",
													isActive && "bg-slate-100"
												)}
											>
												<button
													onClick={() => handleSpaceClick(space.id)}
													className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
													title={space.name}
												>
													<div
														className="flex h-8 w-8 items-center justify-center rounded-md text-primary bg-primary/10 shrink-0"
														style={space.color ? {
															backgroundColor: `${space.color}20`,
															color: space.color
														} : undefined}
													>
														<SpaceIcon icon={space.icon} size={16} />
													</div>
													<div className="flex min-w-0 flex-1 flex-col gap-1">
														<div className="flex items-center gap-2">
															<p className="truncate text-sm font-semibold text-foreground">
																{space.name}
															</p>
															{!space.isActive && (
																<Badge variant="secondary" className="shrink-0 text-xs px-1 h-5">
																	Archived
																</Badge>
															)}
														</div>
													</div>
												</button>
												<div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 flex items-center gap-1">
													<SpaceActionsMenu workspaceId={workspaceId} spaceId={space.id} />
													<SpaceCreateMenu
														onCreateInternal={(type) => handleCreateInternal(type, space.id)}
														onCreateEntity={(type, mode) => handleCreateEntity(type, mode, space.id)}
													/>
												</div>
											</div>
										);
									})}

									{/* Load More Button */}
									{hasNextPage && (
										<div className="mt-2 px-2">
											<Button
												variant="ghost"
												size="sm"
												className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-slate-100"
												onClick={() => fetchNextPage()}
												disabled={isFetchingNextPage}
											>
												{isFetchingNextPage ? "Loading..." : `Load More (${total - spaces.length} remaining)`}
											</Button>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Projects & Teams Sections (Only show if not collapsed) */}
					{!isSidebarCollapsed && projects.length > 0 && (
						<>
							<div className="border-t border-slate-200 px-4 py-2">
								<div className="flex items-center justify-between">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</h3>
								</div>
							</div>
							<div className="max-h-48 overflow-y-auto px-2 py-1 space-y-1">
								{projects.slice(0, 5).map((project) => (
									<button
										key={project.id}
										className="group/item flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition-colors focus:outline-none"
									>
										<span className="truncate text-sm text-foreground">{project.name}</span>
									</button>
								))}
								{projects.length > 5 && (
									<p className="px-3 py-2 text-xs text-muted-foreground">+{projects.length - 5} more</p>
								)}
							</div>
						</>
					)}

					{!isSidebarCollapsed && teams.length > 0 && (
						<>
							<div className="border-t border-slate-200 px-4 py-2">
								<div className="flex items-center justify-between">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teams</h3>
								</div>
							</div>
							<div className="max-h-48 overflow-y-auto px-2 py-1 space-y-1 mb-2">
								{teams.slice(0, 5).map((team) => (
									<button
										key={team.id}
										className="group/item flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition-colors focus:outline-none"
									>
										<span className="truncate text-sm text-foreground">{team.name}</span>
									</button>
								))}
								{teams.length > 5 && (
									<p className="px-3 py-2 text-xs text-muted-foreground">+{teams.length - 5} more</p>
								)}
							</div>
						</>
					)}
				</div>
			</aside>

			{/* Main Content */}
			<div className="flex-1 overflow-hidden bg-slate-50/50 relative">
				{isSidebarCollapsed && (
					<div className="absolute left-0 top-3 z-30">
						<Button
							variant="outline"
							size="icon"
							className="h-4 w-4 rounded-l-none border-l-0 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow transition-all"
							onClick={() => setIsSidebarCollapsed(false)}
							title="Expand Sidebar"
						>
							<ChevronsRight className="h-4 w-4 text-muted-foreground" />
						</Button>
					</div>
				)}
				{viewMode === 'manage' ? (
					<ManageSpacesView
						workspaceId={workspaceId}
						onClose={() => setViewMode('detail')}
						onSpaceSelect={handleSpaceClick}
						isSidebarCollapsed={isSidebarCollapsed}
					/>
				) : activeSpaceId ? (
					<SpaceDetailView spaceId={activeSpaceId} workspaceId={workspaceId} />
				) : showEmptyState ? (
					< div className="flex h-full items-center justify-center p-8" >
						<div className="max-w-md text-center">
							<div className="mb-6 flex justify-center">
								<div className="relative h-32 w-32 opacity-90">
									<FolderKanban className="h-full w-full text-slate-200" strokeWidth={1} />
									<div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-sm border border-slate-100">
										<Plus className="h-6 w-6 text-slate-400" />
									</div>
								</div>
							</div>
							<h3 className="text-lg font-medium text-slate-900 mb-2">
								You have no existing Spaces
							</h3>
							<p className="text-slate-500 mb-8 max-w-sm mx-auto">
								You have no existing Spaces to put shared tasks in. Create a Space now to organize your work.
							</p>
							<Button
								onClick={handleCreateSpace}
								className="bg-slate-900 text-white hover:bg-slate-800 px-6"
							>
								Create new Space
							</Button>
						</div>
					</div>
				) : (
					<div className="flex h-full items-center justify-center">
						<div className="text-center">
							<FolderKanban className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
							<p className="text-lg font-medium text-foreground">Select a space</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Choose a space from the sidebar to view its details
							</p>
							<Button variant="outline" className="mt-4" onClick={() => setViewMode('manage')}>
								Manage Spaces
							</Button>
						</div>
					</div>
				)}
			</div>

			<SpaceCreationModal
				workspaceId={workspaceId}
				open={createModalOpen}
				onOpenChange={setCreateModalOpen}
				onSuccess={handleCreateSuccess}
			/>

			{/* Create/Import Modals */}
			<ProjectCreationModal
				open={createProjectOpen}
				onOpenChange={setCreateProjectOpen}
				defaultSpaceId={activeEntityId || undefined}
			/>
			<ProjectImportModal
				spaceId={activeEntityId || ""}
				open={importProjectOpen}
				onOpenChange={setImportProjectOpen}
			/>
			<TeamCreationModal
				open={createTeamOpen}
				onOpenChange={setCreateTeamOpen}
				defaultSpaceId={activeEntityId || undefined}
			/>
			<TeamImportModal
				spaceId={activeEntityId || ""}
				open={importTeamOpen}
				onOpenChange={setImportTeamOpen}
			/>
		</div>
	);
}

