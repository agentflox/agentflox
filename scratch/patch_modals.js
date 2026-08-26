const fs = require('fs');

const files = [
  'c:/Users/datng/agentflox/apps/frontend/src/entities/lists/components/ListCreationModal.tsx',
  'c:/Users/datng/agentflox/apps/frontend/src/entities/folders/components/FolderCreationModal.tsx',
  'c:/Users/datng/agentflox/apps/frontend/src/entities/documents/components/DocumentCreationModal.tsx'
];

const newTreeLogic = `	const treeNodes = useMemo(() => {
		return workspaces.map((ws: any) => {
			const wsSpaces = spaces.filter((s: any) => s.workspaceId === ws.id);
			const spaceNodes = wsSpaces.map((space: any) => {
				const spaceId = space.id;
				const projectsUnderSpace = destinationOptions.filter(o => o.kind === 'project' && o.spaceId === spaceId);
				const teamsUnderSpace = destinationOptions.filter(o => o.kind === 'team' && o.spaceId === spaceId);
				const foldersUnderSpace = destinationOptions.filter(o => o.kind === 'folder' && o.spaceId === spaceId && !o.projectId && !o.teamId);

				const expandedProjectsTeams = [...projectsUnderSpace, ...teamsUnderSpace].map(pt => {
					const ptId = pt.kind === 'project' ? pt.projectId : pt.teamId;
					const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && ((pt.kind === 'project' && o.projectId === ptId) || (pt.kind === 'team' && o.teamId === ptId)));
					return {
						...pt,
						children: foldersUnderPt
					};
				});

				return {
					key: \`SPACE:\${spaceId}\`,
					name: space.name,
					icon: space.icon,
					color: space.color,
					workspaceId: ws.id,
					children: expandedProjectsTeams,
					folders: foldersUnderSpace
				};
			});

			const rootProjects = destinationOptions.filter(o => o.kind === 'project' && !o.spaceId).map(p => {
				const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && o.projectId === p.projectId);
				return { ...p, children: foldersUnderPt };
			});
			const rootTeams = destinationOptions.filter(o => o.kind === 'team' && !o.spaceId).map(t => {
				const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && o.teamId === t.teamId);
				return { ...t, children: foldersUnderPt };
			});
			const rootFolders = destinationOptions.filter(o => o.kind === 'folder' && !o.spaceId && !o.projectId && !o.teamId);

			return {
				key: \`WORKSPACE:\${ws.id}\`,
				name: ws.name,
				spaces: spaceNodes,
				rootProjects,
				rootTeams,
				rootFolders
			};
		});
	}, [destinationOptions, spaces, workspaces]);`;

const newUiLogic = `										<div className="overflow-y-auto flex-1 py-1 max-h-[320px] px-1">
											{treeNodes.map((ws: any) => {
												const isWsCollapsed = collapsedNodes.has(ws.key);
												const isWsSelected = form.destinationKey === ws.key;
												const wsMatches = !destinationSearch.trim() || ws.name.toLowerCase().includes(destinationSearch.toLowerCase());
												const hasSpaces = ws.spaces?.length > 0;
												const hasRootChildren = ws.rootProjects?.length > 0 || ws.rootTeams?.length > 0 || ws.rootFolders?.length > 0;
												const hasChildren = hasSpaces || hasRootChildren;
												
												if (!wsMatches && !hasChildren) return null; // Very basic filter, can be improved

												return (
													<div key={ws.key} className="relative select-none">
														<div
															className={cn(
																"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																isWsSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
															)}
															style={{ paddingLeft: 8 }}
															onClick={() => { setForm(p => ({ ...p, destinationKey: ws.key })); setDestinationOpen(false); }}
														>
															<div
																className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center"
																onClick={(e) => { if (!hasChildren) return; e.stopPropagation(); toggleNode(e, ws.key); }}
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
															{isWsSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
														</div>
														
														{!isWsCollapsed && hasChildren && (
															<div>
																{ws.spaces?.map((space: any) => {
																	const isSpaceCollapsed = collapsedNodes.has(space.key);
																	const isSpaceSelected = form.destinationKey === space.key;
																	const hasSpaceChildren = space.children?.length > 0 || space.folders?.length > 0;
																	return (
																		<div key={space.key} className="relative select-none">
																			<div
																				className={cn(
																					"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																					isSpaceSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																				)}
																				style={{ paddingLeft: 24 }}
																				onClick={() => { setForm(p => ({ ...p, destinationKey: space.key })); setDestinationOpen(false); }}
																			>
																				<div
																					className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center"
																					onClick={(e) => { if (!hasSpaceChildren) return; e.stopPropagation(); toggleNode(e, space.key); }}
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
																				{isSpaceSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																			</div>
																			
																			{!isSpaceCollapsed && (
																				<div>
																					{space.children?.map((pt: any) => {
																						const isPtCollapsed = collapsedNodes.has(pt.key);
																						const isPtSelected = form.destinationKey === pt.key;
																						const hasPtChildren = pt.children?.length > 0;
																						return (
																							<div key={pt.key} className="relative select-none">
																								<div
																									className={cn(
																										"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																										isPtSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																									)}
																									style={{ paddingLeft: 40 }}
																									onClick={() => { setForm(p => ({ ...p, destinationKey: pt.key })); setDestinationOpen(false); }}
																								>
																									<div
																										className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																										onClick={(e) => { if (!hasPtChildren) return; e.stopPropagation(); toggleNode(e, pt.key); }}
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
																									{isPtSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																								</div>
																								
																								{!isPtCollapsed && pt.children?.map((folder: any) => {
																									const isFolderSelected = form.destinationKey === folder.key;
																									return (
																										<div
																											key={folder.key}
																											className={cn(
																												"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																												isFolderSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																											)}
																											style={{ paddingLeft: 56 }}
																											onClick={() => { setForm(p => ({ ...p, destinationKey: folder.key })); setDestinationOpen(false); }}
																										>
																											<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																												<FolderIcon size={12} className="text-zinc-500 fill-zinc-200" />
																											</div>
																											<span className="flex-1 truncate">{folder.label}</span>
																											{isFolderSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																										</div>
																									);
																								})}
																							</div>
																						);
																					})}
																					{space.folders?.map((folder: any) => {
																						const isFolderSelected = form.destinationKey === folder.key;
																						return (
																							<div
																								key={folder.key}
																								className={cn(
																									"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																									isFolderSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																								)}
																								style={{ paddingLeft: 40 }}
																								onClick={() => { setForm(p => ({ ...p, destinationKey: folder.key })); setDestinationOpen(false); }}
																							>
																								<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																									<FolderIcon size={12} className="text-zinc-500 fill-zinc-200" />
																								</div>
																								<span className="flex-1 truncate">{folder.label}</span>
																								{isFolderSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
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
																	const isPtSelected = form.destinationKey === pt.key;
																	const hasPtChildren = pt.children?.length > 0;
																	return (
																		<div key={pt.key} className="relative select-none">
																			<div
																				className={cn(
																					"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																					isPtSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																				)}
																				style={{ paddingLeft: 24 }}
																				onClick={() => { setForm(p => ({ ...p, destinationKey: pt.key })); setDestinationOpen(false); }}
																			>
																				<div
																					className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																					onClick={(e) => { if (!hasPtChildren) return; e.stopPropagation(); toggleNode(e, pt.key); }}
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
																				{isPtSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																			</div>
																			
																			{!isPtCollapsed && pt.children?.map((folder: any) => {
																				const isFolderSelected = form.destinationKey === folder.key;
																				return (
																					<div
																						key={folder.key}
																						className={cn(
																							"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																							isFolderSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																						)}
																						style={{ paddingLeft: 40 }}
																						onClick={() => { setForm(p => ({ ...p, destinationKey: folder.key })); setDestinationOpen(false); }}
																					>
																						<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																							<FolderIcon size={12} className="text-zinc-500 fill-zinc-200" />
																						</div>
																						<span className="flex-1 truncate">{folder.label}</span>
																						{isFolderSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																					</div>
																				);
																			})}
																		</div>
																	);
																})}
																
																{ws.rootFolders?.map((folder: any) => {
																	const isFolderSelected = form.destinationKey === folder.key;
																	return (
																		<div
																			key={folder.key}
																			className={cn(
																				"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																				isFolderSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																			)}
																			style={{ paddingLeft: 24 }}
																			onClick={() => { setForm(p => ({ ...p, destinationKey: folder.key })); setDestinationOpen(false); }}
																		>
																			<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																				<FolderIcon size={12} className="text-zinc-500 fill-zinc-200" />
																			</div>
																			<span className="flex-1 truncate">{folder.label}</span>
																			{isFolderSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																		</div>
																	);
																})}
															</div>
														)}
													</div>
												);
											})}
										</div>`;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace treeNodes block
  const treeNodesMatch = content.match(/const treeNodes = useMemo\(\(\) => \{[\s\S]*?\}, \[destinationOptions, spaces, workspaces\]\);/);
  if (treeNodesMatch) {
    content = content.replace(treeNodesMatch[0], newTreeLogic);
  } else {
    // try slightly different signature
    const treeNodesMatch2 = content.match(/const treeNodes = useMemo\(\(\) => \{[\s\S]*?\}, \[[^\]]*spaces[^\]]*\]\);/);
    if (treeNodesMatch2) {
      content = content.replace(treeNodesMatch2[0], newTreeLogic);
    }
  }

  // Replace UI block
  const uiRegex = /<div className="overflow-y-auto flex-1 py-1 max-h-\[320px\] px-1">[\s\S]*?(?=<\/PopoverContent>)/;
  const uiMatch = content.match(uiRegex);
  if (uiMatch) {
    content = content.replace(uiRegex, newUiLogic + '\n\t\t\t\t\t\t\t\t\t');
  }

  // Ensure imports are added
  if (!content.includes('WorkspaceIcon')) {
    content = content.replace(/import \{ SpaceIcon \} from "(.*?)";/, 'import { SpaceIcon } from "$1";\nimport { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";\nimport { ProjectIcon } from "@/entities/projects/components/ProjectIcon";\nimport { TeamIcon } from "@/entities/teams/components/TeamIcon";\nimport { FolderIcon } from "@/entities/folders/components/FolderIcon";');
  } else {
	  if (!content.includes('FolderIcon }')) {
		content = content.replace(/import \{ WorkspaceIcon \} from "(.*?)";/, 'import { WorkspaceIcon } from "$1";\nimport { FolderIcon } from "@/entities/folders/components/FolderIcon";');
	  }
  }

  // Handle collapsedNodes state
  if (!content.includes('collapsedNodes')) {
    content = content.replace(/const \[destinationOpen, setDestinationOpen\] = useState\(false\);/, 'const [destinationOpen, setDestinationOpen] = useState(false);\n\tconst [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());\n\n\tconst toggleNode = useCallback((e: React.MouseEvent, key: string) => {\n\t\te.stopPropagation();\n\t\tsetCollapsedNodes(prev => {\n\t\t\tconst next = new Set(prev);\n\t\t\tif (next.has(key)) next.delete(key);\n\t\t\telse next.add(key);\n\t\t\treturn next;\n\t\t});\n\t}, []);');
  }

  fs.writeFileSync(file, content);
  console.log('Patched ' + file);
});
