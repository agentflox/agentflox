const fs = require('fs');

const file = 'c:/Users/datng/agentflox/apps/frontend/src/entities/task/components/TaskCreationModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const popoverIdx = content.indexOf('function TaskListSelectPopover');
const modalLogic = content.slice(0, popoverIdx);

// Add missing imports to modalLogic if needed
let modifiedModalLogic = modalLogic;
const newImports = `import { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
import { FolderIcon } from "@/entities/folders/components/FolderIcon";
import { ListEntityIcon } from "@/entities/lists/components/ListEntityIcon";
`;
if (!modifiedModalLogic.includes('WorkspaceIcon')) {
  modifiedModalLogic = modifiedModalLogic.replace(/import \{ SpaceIcon \}.*?;/, (match) => {
    return match + '\n' + newImports;
  });
}

const newPopover = `
type DestinationOption = {
	key: string;
	kind: 'personal' | 'workspace' | 'space' | 'project' | 'team' | 'folder' | 'list';
	label: string;
	depth: number;
	workspaceId?: string;
	spaceId?: string;
	projectId?: string;
	teamId?: string;
	folderId?: string;
	listId?: string;
};

function TaskListSelectPopover({
  value,
  onChange,
  recentLists,
  hasError,
}: {
  value: string;
  onChange: (listId: string) => void;
  recentLists: any[];
  hierarchy?: any; // kept for compatibility in props, but unused
  hasError?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set());

  const toggleNode = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: workspacesData } = trpc.workspace.list.useQuery(
		{ scope: "owned" as const, pageSize: 50 },
		{ enabled: open }
	);
	const workspaces = workspacesData?.items || [];

	const { data: spacesData } = trpc.space.list.useQuery(
		{ scope: "all", pageSize: 50 },
		{ enabled: open }
	);
	const { data: projectsData } = trpc.project.list.useQuery(
		{ scope: "all" as any, pageSize: 50 },
		{ enabled: open }
	);
	const { data: teamsData } = trpc.team.list.useQuery(
		{ scope: "all" as any, pageSize: 50 },
		{ enabled: open }
	);
	const { data: foldersData } = trpc.folder.byContext.useQuery(
		{},
		{ enabled: open }
	);
	const { data: listsData } = trpc.list.byContext.useQuery(
		{ archived: false },
		{ enabled: open }
	);

	const spaces = spacesData?.items || [];
	const projects = projectsData?.items || [];
	const teams = teamsData?.items || [];
	const folders = foldersData?.items || [];
	const lists = listsData?.items || [];

	const destinationOptions = React.useMemo<DestinationOption[]>(() => {
		const opts: DestinationOption[] = [
			{ key: "PERSONAL", label: "Personal", kind: "personal", depth: 0 }
		];

		workspaces.forEach((w: any) => {
			opts.push({ key: \`WORKSPACE:\${w.id}\`, kind: "workspace", label: w.name, depth: 0 });
		});

		spaces.forEach((s: any) => opts.push({ key: \`SPACE:\${s.id}\`, kind: "space", label: s.name, depth: 0, spaceId: s.id }));
		projects.forEach((p: any) => opts.push({ key: \`PROJECT:\${p.id}\`, kind: "project", label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined }));
		teams.forEach((t: any) => opts.push({ key: \`TEAM:\${t.id}\`, kind: "team", label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined }));
		folders.forEach((f: any) => opts.push({ key: \`FOLDER:\${f.id}\`, kind: "folder", label: f.name, depth: f.parentId ? 2 : (f.spaceId || f.projectId || f.teamId ? 1 : 0), folderId: f.id, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, teamId: f.teamId || undefined }));
		lists.forEach((l: any) => opts.push({ key: \`LIST:\${l.id}\`, kind: "list", label: l.name, depth: l.folderId ? 2 : (l.spaceId || l.projectId || l.teamId ? 1 : 0), listId: l.id, folderId: l.folderId || undefined, spaceId: l.spaceId || undefined, projectId: l.projectId || undefined, teamId: l.teamId || undefined }));

		return opts;
	}, [workspaces, spaces, projects, teams, folders, lists]);

	const treeNodes = React.useMemo(() => {
		return workspaces.map((ws: any) => {
			const wsSpaces = spaces.filter((s: any) => s.workspaceId === ws.id);
			const spaceNodes = wsSpaces.map((space: any) => {
				const spaceId = space.id;
				const projectsUnderSpace = destinationOptions.filter(o => o.kind === 'project' && o.spaceId === spaceId);
				const teamsUnderSpace = destinationOptions.filter(o => o.kind === 'team' && o.spaceId === spaceId);
				const foldersUnderSpace = destinationOptions.filter(o => o.kind === 'folder' && o.spaceId === spaceId && !o.projectId && !o.teamId);
				const listsUnderSpace = destinationOptions.filter(o => o.kind === 'list' && o.spaceId === spaceId && !o.projectId && !o.teamId && !o.folderId);

				const expandedProjectsTeams = [...projectsUnderSpace, ...teamsUnderSpace].map(pt => {
					const ptId = pt.kind === 'project' ? pt.projectId : pt.teamId;
					const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && ((pt.kind === 'project' && o.projectId === ptId) || (pt.kind === 'team' && o.teamId === ptId)));
					const listsUnderPt = destinationOptions.filter(o => o.kind === 'list' && !o.folderId && ((pt.kind === 'project' && o.projectId === ptId) || (pt.kind === 'team' && o.teamId === ptId)));
					return {
						...pt,
						children: foldersUnderPt.map(f => {
							const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
							return { ...f, children: listsUnderFolder };
						}),
						lists: listsUnderPt
					};
				});

				return {
					key: \`SPACE:\${spaceId}\`,
					name: space.name,
					icon: space.icon,
					color: space.color,
					workspaceId: ws.id,
					children: expandedProjectsTeams,
					folders: foldersUnderSpace.map(f => {
						const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
						return { ...f, children: listsUnderFolder };
					}),
					lists: listsUnderSpace
				};
			});

			const rootProjects = destinationOptions.filter(o => o.kind === 'project' && !o.spaceId).map(p => {
				const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && o.projectId === p.projectId);
				const listsUnderPt = destinationOptions.filter(o => o.kind === 'list' && !o.folderId && o.projectId === p.projectId);
				return {
					...p, children: foldersUnderPt.map(f => {
						const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
						return { ...f, children: listsUnderFolder };
					}), lists: listsUnderPt
				};
			});
			const rootTeams = destinationOptions.filter(o => o.kind === 'team' && !o.spaceId).map(t => {
				const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && o.teamId === t.teamId);
				const listsUnderPt = destinationOptions.filter(o => o.kind === 'list' && !o.folderId && o.teamId === t.teamId);
				return {
					...t, children: foldersUnderPt.map(f => {
						const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
						return { ...f, children: listsUnderFolder };
					}), lists: listsUnderPt
				};
			});
			const rootFolders = destinationOptions.filter(o => o.kind === 'folder' && !o.spaceId && !o.projectId && !o.teamId).map(f => {
				const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
				return { ...f, children: listsUnderFolder };
			});
			const rootLists = destinationOptions.filter(o => o.kind === 'list' && !o.spaceId && !o.projectId && !o.teamId && !o.folderId);

			return {
				key: \`WORKSPACE:\${ws.id}\`,
				name: ws.name,
				spaces: spaceNodes,
				rootProjects,
				rootTeams,
				rootFolders,
				rootLists
			};
		});
	}, [destinationOptions, spaces, workspaces]);

  const selectedLabel = React.useMemo(() => {
    if (!value) return "Select List...";
    if (value === "personal") return "Personal List";
    for (const r of recentLists) {
      if (r.id === value) return r.name;
    }
		const allLists = listsData?.items || [];
		const list = allLists.find((l: any) => l.id === value);
		if (list) return list.name;
    return value;
  }, [value, recentLists, listsData]);

  const q = search.trim().toLowerCase();

  const filteredRecentLists = recentLists.filter((l) =>
    !q || l.name.toLowerCase().includes(q)
  );

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-5 border-none shadow-none bg-transparent hover:bg-zinc-100/50 px-1.5 py-0 text-xs font-medium text-zinc-700 focus:ring-0 gap-1 flex items-center cursor-pointer transition-colors rounded",
            hasError && "text-red-600 bg-red-50",
            !value && "text-zinc-500"
          )}
        >
          <span className="truncate max-w-[160px]">{selectedLabel}</span>
          <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-[360px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white overflow-hidden max-h-[400px] flex flex-col z-50"
      >
        <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 mx-2.5 mt-2.5 mb-1.5 shrink-0 focus-within:border-zinc-400">
          <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0 mr-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lists..."
            className="w-full bg-transparent border-0 p-0 text-xs outline-none placeholder:text-zinc-400"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 py-1 max-h-[340px] px-1">
          {(!q || "personal list".includes(q)) && (
            <>
              <button
                type="button"
                onClick={() => handleSelect("personal")}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                  value === "personal" ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="h-5 w-5 rounded bg-zinc-100 border border-zinc-200/60 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                  </div>
                  <span className="truncate">Personal List</span>
                </div>
                {value === "personal" && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
              </button>
              <Separator className="my-1" />
            </>
          )}

          {filteredRecentLists.length > 0 && (
            <div className="px-1 py-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">Recents</div>
              {filteredRecentLists.map((l: any) => {
                const isSelected = value === l.id;
                return (
                  <button
                    key={\`recent-\${l.id}\`}
                    type="button"
                    onClick={() => handleSelect(l.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                      isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ListChecks className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{l.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {l.taskCount !== undefined && l.taskCount > 0 && (
                        <span className="text-[11px] text-zinc-400">{l.taskCount}</span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                    </div>
                  </button>
                );
              })}
              <Separator className="my-1" />
            </div>
          )}

					{treeNodes.map((ws: any) => {
						const isWsCollapsed = collapsedNodes.has(ws.key);
						const wsMatches = !q || ws.name.toLowerCase().includes(q);
						const hasSpaces = ws.spaces?.length > 0;
						const hasRootChildren = ws.rootProjects?.length > 0 || ws.rootTeams?.length > 0 || ws.rootFolders?.length > 0 || ws.rootLists?.length > 0;
						const hasChildren = hasSpaces || hasRootChildren;

						if (!wsMatches && !hasChildren) return null; // Very basic filter, can be improved

						return (
							<div key={ws.key} className="relative select-none">
								<div
									className={cn(
										"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
										"text-zinc-700"
									)}
									style={{ paddingLeft: 8 }}
									onClick={(e) => { if (hasChildren) toggleNode(e, ws.key); }}
								>
									<div
										className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center"
									>
										<span className={cn("flex items-center justify-center", hasChildren && "group-hover/item:hidden")}>
											<div className="h-5 w-5 rounded bg-zinc-100 border border-zinc-200/60 flex items-center justify-center overflow-hidden">
												<WorkspaceIcon size={12} className="text-zinc-600 shrink-0" />
											</div>
										</span>
										{hasChildren && (
											<div className="hidden group-hover/item:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors absolute inset-0 m-auto">
												<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isWsCollapsed && "rotate-90")} />
											</div>
										)}
									</div>
									<span className="flex-1 truncate">{ws.name}</span>
								</div>

								{!isWsCollapsed && hasChildren && (
									<div>
										{ws.spaces?.map((space: any) => {
											const isSpaceCollapsed = collapsedNodes.has(space.key);
											const hasSpaceChildren = space.children?.length > 0 || space.folders?.length > 0 || space.lists?.length > 0;
											return (
												<div key={space.key} className="relative select-none">
													<div
														className={cn(
															"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
															"text-zinc-700"
														)}
														style={{ paddingLeft: 24 }}
														onClick={(e) => { if (hasSpaceChildren) toggleNode(e, space.key); }}
													>
														<div
															className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center"
														>
															<span
																className={cn("h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center", hasSpaceChildren && "group-hover/item:hidden")}
																style={{ backgroundColor: space.icon ? (space.color || "#6366f1") : "transparent" }}
															>
																<SpaceIcon icon={space.icon} className={cn(space.icon ? "text-white" : "text-indigo-500")} size={13} fill />
															</span>
															{hasSpaceChildren && (
																<div className="hidden group-hover/item:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors absolute inset-0 m-auto">
																	<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isSpaceCollapsed && "rotate-90")} />
																</div>
															)}
														</div>
														<span className="flex-1 truncate">{space.name}</span>
													</div>

													{!isSpaceCollapsed && (
														<div>
															{space.children?.map((pt: any) => {
																const isPtCollapsed = collapsedNodes.has(pt.key);
																const hasPtChildren = pt.children?.length > 0 || pt.lists?.length > 0;
																return (
																	<div key={pt.key} className="relative select-none">
																		<div
																			className={cn(
																				"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																				"text-zinc-700"
																			)}
																			style={{ paddingLeft: 40 }}
																			onClick={(e) => { if (hasPtChildren) toggleNode(e, pt.key); }}
																		>
																			<div
																				className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																			>
																				<span className={cn("flex items-center justify-center", hasPtChildren && "group-hover/item:hidden")}>
																					{pt.kind === 'project' ? (
																						<div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: pt.icon ? (pt.color || "#a855f7") : "transparent" }}>
																							<ProjectIcon icon={pt.icon} className={cn(pt.icon ? "text-white" : "text-purple-600")} size={11} fill />
																						</div>
																					) : (
																						<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center" style={{ backgroundColor: pt.icon ? (pt.color || "#10b981") : "#ecfdf5" }}>
																							<TeamIcon icon={pt.icon} className={cn(pt.icon ? "text-white" : "text-emerald-600")} size={11} fill />
																						</div>
																					)}
																				</span>
																				{hasPtChildren && (
																					<div className="hidden group-hover/item:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors absolute inset-0 m-auto">
																						<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isPtCollapsed && "rotate-90")} />
																					</div>
																				)}
																			</div>
																			<span className="flex-1 truncate">{pt.label}</span>
																		</div>

																		{!isPtCollapsed && pt.children?.map((folder: any) => {
																			const isFolderCollapsed = collapsedNodes.has(folder.key);
																			const hasFolderChildren = folder.children?.length > 0;
																			return (
																				<div key={folder.key} className="relative select-none">
																					<div
																						className={cn(
																							"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																							"text-zinc-700"
																						)}
																						style={{ paddingLeft: 56 }}
																						onClick={(e) => { if (hasFolderChildren) toggleNode(e, folder.key); }}
																					>
																						<div
																							className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																						>
																							<span className={cn("flex items-center justify-center", hasFolderChildren && "group-hover/item:hidden")}>
																								<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																									<FolderIcon size={12} className="text-zinc-500 fill-zinc-200" />
																								</div>
																							</span>
																							{hasFolderChildren && (
																								<div className="hidden group-hover/item:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors absolute inset-0 m-auto">
																									<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isFolderCollapsed && "rotate-90")} />
																								</div>
																							)}
																						</div>
																						<span className="flex-1 truncate">{folder.label}</span>
																					</div>
																					{!isFolderCollapsed && folder.children?.map((list: any) => {
																						const isListSelected = value === list.listId;
																						return (
																							<div
																								key={list.key}
																								className={cn(
																									"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																									isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																								)}
																								style={{ paddingLeft: 72 }}
																								onClick={() => { handleSelect(list.listId!); }}
																							>
																								<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																									<ListEntityIcon size={12} className="text-zinc-500" />
																								</div>
																								<span className="flex-1 truncate">{list.label}</span>
																								{isListSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																							</div>
																						);
																					})}
																				</div>
																			);
																		})}
																		{!isPtCollapsed && pt.lists?.map((list: any) => {
																			const isListSelected = value === list.listId;
																			return (
																				<div
																					key={list.key}
																					className={cn(
																						"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																						isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																					)}
																					style={{ paddingLeft: 56 }}
																					onClick={() => { handleSelect(list.listId!); }}
																				>
																					<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																						<ListEntityIcon size={12} className="text-zinc-500" />
																					</div>
																					<span className="flex-1 truncate">{list.label}</span>
																					{isListSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																				</div>
																			);
																		})}
																	</div>
																);
															})}
															{space.folders?.map((folder: any) => {
																const isFolderCollapsed = collapsedNodes.has(folder.key);
																const hasFolderChildren = folder.children?.length > 0;
																return (
																	<div key={folder.key} className="relative select-none">
																		<div
																			className={cn(
																				"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																				"text-zinc-700"
																			)}
																			style={{ paddingLeft: 40 }}
																			onClick={(e) => { if (hasFolderChildren) toggleNode(e, folder.key); }}
																		>
																			<div
																				className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																			>
																				<span className={cn("flex items-center justify-center", hasFolderChildren && "group-hover/item:hidden")}>
																					<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																						<FolderIcon size={12} className="text-zinc-500 fill-zinc-200" />
																					</div>
																				</span>
																				{hasFolderChildren && (
																					<div className="hidden group-hover/item:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors absolute inset-0 m-auto">
																						<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isFolderCollapsed && "rotate-90")} />
																					</div>
																				)}
																			</div>
																			<span className="flex-1 truncate">{folder.label}</span>
																		</div>
																		{!isFolderCollapsed && folder.children?.map((list: any) => {
																			const isListSelected = value === list.listId;
																			return (
																				<div
																					key={list.key}
																					className={cn(
																						"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																						isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																					)}
																					style={{ paddingLeft: 56 }}
																					onClick={() => { handleSelect(list.listId!); }}
																				>
																					<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																						<ListEntityIcon size={12} className="text-zinc-500" />
																					</div>
																					<span className="flex-1 truncate">{list.label}</span>
																					{isListSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																				</div>
																			);
																		})}
																	</div>
																);
															})}
															{space.lists?.map((list: any) => {
																const isListSelected = value === list.listId;
																return (
																	<div
																		key={list.key}
																		className={cn(
																			"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																			isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																		)}
																		style={{ paddingLeft: 40 }}
																		onClick={() => { handleSelect(list.listId!); }}
																	>
																		<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																			<ListEntityIcon size={12} className="text-zinc-500" />
																		</div>
																		<span className="flex-1 truncate">{list.label}</span>
																		{isListSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																	</div>
																);
															})}
														</div>
													)}
												</div>
											);
										})}

										{[...(ws.rootProjects || []), ...(ws.rootTeams || [])].map((pt: any) => {
											const isPtCollapsed = collapsedNodes.has(pt.key);
											const hasPtChildren = pt.children?.length > 0 || pt.lists?.length > 0;
											return (
												<div key={pt.key} className="relative select-none">
													<div
														className={cn(
															"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
															"text-zinc-700"
														)}
														style={{ paddingLeft: 24 }}
														onClick={(e) => { if (hasPtChildren) toggleNode(e, pt.key); }}
													>
														<div
															className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
														>
															<span className={cn("flex items-center justify-center", hasPtChildren && "group-hover/item:hidden")}>
																{pt.kind === 'project' ? (
																	<div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: pt.icon ? (pt.color || "#a855f7") : "transparent" }}>
																		<ProjectIcon icon={pt.icon} className={cn(pt.icon ? "text-white" : "text-purple-600")} size={11} fill />
																	</div>
																) : (
																	<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center" style={{ backgroundColor: pt.icon ? (pt.color || "#10b981") : "#ecfdf5" }}>
																		<TeamIcon icon={pt.icon} className={cn(pt.icon ? "text-white" : "text-emerald-600")} size={11} fill />
																	</div>
																)}
															</span>
															{hasPtChildren && (
																<div className="hidden group-hover/item:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors absolute inset-0 m-auto">
																	<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isPtCollapsed && "rotate-90")} />
																</div>
															)}
														</div>
														<span className="flex-1 truncate">{pt.label}</span>
													</div>

													{!isPtCollapsed && pt.children?.map((folder: any) => {
														const isFolderCollapsed = collapsedNodes.has(folder.key);
														const hasFolderChildren = folder.children?.length > 0;
														return (
															<div key={folder.key} className="relative select-none">
																<div
																	className={cn(
																		"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																		"text-zinc-700"
																	)}
																	style={{ paddingLeft: 40 }}
																	onClick={(e) => { if (hasFolderChildren) toggleNode(e, folder.key); }}
																>
																	<div
																		className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																	>
																		<span className={cn("flex items-center justify-center", hasFolderChildren && "group-hover/item:hidden")}>
																			<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																				<FolderIcon size={12} className="text-zinc-500 fill-zinc-200" />
																			</div>
																		</span>
																		{hasFolderChildren && (
																			<div className="hidden group-hover/item:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors absolute inset-0 m-auto">
																				<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isFolderCollapsed && "rotate-90")} />
																			</div>
																		)}
																	</div>
																	<span className="flex-1 truncate">{folder.label}</span>
																</div>
																{!isFolderCollapsed && folder.children?.map((list: any) => {
																	const isListSelected = value === list.listId;
																	return (
																		<div
																			key={list.key}
																			className={cn(
																				"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																				isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																			)}
																			style={{ paddingLeft: 56 }}
																			onClick={() => { handleSelect(list.listId!); }}
																		>
																			<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																				<ListEntityIcon size={12} className="text-zinc-500" />
																			</div>
																			<span className="flex-1 truncate">{list.label}</span>
																			{isListSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																		</div>
																	);
																})}
															</div>
														);
													})}
													{!isPtCollapsed && pt.lists?.map((list: any) => {
														const isListSelected = value === list.listId;
														return (
															<div
																key={list.key}
																className={cn(
																	"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																	isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																)}
																style={{ paddingLeft: 40 }}
																onClick={() => { handleSelect(list.listId!); }}
															>
																<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																	<ListEntityIcon size={12} className="text-zinc-500" />
																</div>
																<span className="flex-1 truncate">{list.label}</span>
																{isListSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
															</div>
														);
													})}
												</div>
											);
										})}

										{ws.rootFolders?.map((folder: any) => {
											const isFolderCollapsed = collapsedNodes.has(folder.key);
											const hasFolderChildren = folder.children?.length > 0;
											return (
												<div key={folder.key} className="relative select-none">
													<div
														className={cn(
															"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
															"text-zinc-700"
														)}
														style={{ paddingLeft: 24 }}
														onClick={(e) => { if (hasFolderChildren) toggleNode(e, folder.key); }}
													>
														<div
															className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
														>
															<span className={cn("flex items-center justify-center", hasFolderChildren && "group-hover/item:hidden")}>
																<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																	<FolderIcon size={12} className="text-zinc-500 fill-zinc-200" />
																</div>
															</span>
															{hasFolderChildren && (
																<div className="hidden group-hover/item:flex items-center justify-center h-4 w-4 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors absolute inset-0 m-auto">
																	<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isFolderCollapsed && "rotate-90")} />
																</div>
															)}
														</div>
														<span className="flex-1 truncate">{folder.label}</span>
													</div>
													{!isFolderCollapsed && folder.children?.map((list: any) => {
														const isListSelected = value === list.listId;
														return (
															<div
																key={list.key}
																className={cn(
																	"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																	isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																)}
																style={{ paddingLeft: 40 }}
																onClick={() => { handleSelect(list.listId!); }}
															>
																<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																	<ListEntityIcon size={12} className="text-zinc-500" />
																</div>
																<span className="flex-1 truncate">{list.label}</span>
																{isListSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
															</div>
														);
													})}
												</div>
											);
										})}

										{ws.rootLists?.map((list: any) => {
											const isListSelected = value === list.listId;
											return (
												<div
													key={list.key}
													className={cn(
														"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
														isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
													)}
													style={{ paddingLeft: 24 }}
													onClick={() => { handleSelect(list.listId!); }}
												>
													<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
														<ListEntityIcon size={12} className="text-zinc-500" />
													</div>
													<span className="flex-1 truncate">{list.label}</span>
													{isListSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
												</div>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
        </div>
      </PopoverContent>
    </Popover>
  );
}
`;

fs.writeFileSync(file, modifiedModalLogic + newPopover);
console.log('Successfully patched TaskCreationModal.tsx');
