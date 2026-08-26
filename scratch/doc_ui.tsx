										<div className="overflow-y-auto flex-1 py-1 max-h-[320px] px-1">
											<div
												className={cn(
													"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
													destinationKey === "PERSONAL" ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
												)}
												style={{ paddingLeft: 8 }}
												onClick={() => { setDestinationKey("PERSONAL"); setDestinationOpen(false); }}
											>
												<div className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center">
													<div className="h-5 w-5 rounded bg-zinc-100 border border-zinc-200/60 flex items-center justify-center overflow-hidden">
														<User className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
													</div>
												</div>
												<span className="flex-1 truncate">Personal</span>
												{destinationKey === "PERSONAL" && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
											</div>
											
											{treeNodes.map((ws: any) => {
												const isWsCollapsed = collapsedNodes.has(ws.key);
												const isWsSelected = destinationKey === ws.key;
												const wsMatches = !destinationSearch.trim() || ws.name.toLowerCase().includes(destinationSearch.toLowerCase());
												const hasSpaces = ws.spaces?.length > 0;
												const hasRootChildren = ws.rootProjects?.length > 0 || ws.rootTeams?.length > 0 || ws.rootFolders?.length > 0 || ws.rootLists?.length > 0;
												const hasChildren = hasSpaces || hasRootChildren;
												
												if (!wsMatches && !hasChildren) return null;

												return (
													<div key={ws.key} className="relative select-none">
														<div
															className={cn(
																"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																isWsSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
															)}
															style={{ paddingLeft: 8 }}
															onClick={() => { setDestinationKey(ws.key); setDestinationOpen(false); }}
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
																	const isSpaceSelected = destinationKey === space.key;
																	const hasSpaceChildren = space.children?.length > 0 || space.folders?.length > 0 || space.lists?.length > 0;
																	return (
																		<div key={space.key} className="relative select-none">
																			<div
																				className={cn(
																					"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																					isSpaceSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																				)}
																				style={{ paddingLeft: 24 }}
																				onClick={() => { setDestinationKey(space.key); setDestinationOpen(false); }}
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
																						const isPtSelected = destinationKey === pt.key;
																						const hasPtChildren = pt.children?.length > 0 || pt.lists?.length > 0;
																						return (
																							<div key={pt.key} className="relative select-none">
																								<div
																									className={cn(
																										"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																										isPtSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																									)}
																									style={{ paddingLeft: 40 }}
																									onClick={() => { setDestinationKey(pt.key); setDestinationOpen(false); }}
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
																									const isFolderCollapsed = collapsedNodes.has(folder.key);
																									const isFolderSelected = destinationKey === folder.key;
																									const hasFolderChildren = folder.children?.length > 0;
																									return (
																										<div key={folder.key} className="relative select-none">
																											<div
																												className={cn(
																													"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																													isFolderSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																												)}
																												style={{ paddingLeft: 56 }}
																												onClick={() => { setDestinationKey(folder.key); setDestinationOpen(false); }}
																											>
																												<div
																													className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																													onClick={(e) => { if (!hasFolderChildren) return; e.stopPropagation(); toggleNode(e, folder.key); }}
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
																												{isFolderSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																											</div>
																											{!isFolderCollapsed && folder.children?.map((list: any) => {
																												const isListSelected = destinationKey === list.key;
																												return (
																													<div
																														key={list.key}
																														className={cn(
																															"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																															isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																														)}
																														style={{ paddingLeft: 72 }}
																														onClick={() => { setDestinationKey(list.key); setDestinationOpen(false); }}
																													>
																														<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																															<ListIcon size={12} className="text-zinc-500" />
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
																									const isListSelected = destinationKey === list.key;
																									return (
																										<div
																											key={list.key}
																											className={cn(
																												"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																												isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																											)}
																											style={{ paddingLeft: 56 }}
																											onClick={() => { setDestinationKey(list.key); setDestinationOpen(false); }}
																										>
																											<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																												<ListIcon size={12} className="text-zinc-500" />
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
																						const isFolderSelected = destinationKey === folder.key;
																						const hasFolderChildren = folder.children?.length > 0;
																						return (
																							<div key={folder.key} className="relative select-none">
																								<div
																									className={cn(
																										"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																										isFolderSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																									)}
																									style={{ paddingLeft: 40 }}
																									onClick={() => { setDestinationKey(folder.key); setDestinationOpen(false); }}
																								>
																									<div
																										className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																										onClick={(e) => { if (!hasFolderChildren) return; e.stopPropagation(); toggleNode(e, folder.key); }}
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
																									{isFolderSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																								</div>
																								{!isFolderCollapsed && folder.children?.map((list: any) => {
																									const isListSelected = destinationKey === list.key;
																									return (
																										<div
																											key={list.key}
																											className={cn(
																												"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																												isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																											)}
																											style={{ paddingLeft: 56 }}
																											onClick={() => { setDestinationKey(list.key); setDestinationOpen(false); }}
																										>
																											<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																												<ListIcon size={12} className="text-zinc-500" />
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
																						const isListSelected = destinationKey === list.key;
																						return (
																							<div
																								key={list.key}
																								className={cn(
																									"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																									isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																								)}
																								style={{ paddingLeft: 40 }}
																								onClick={() => { setDestinationKey(list.key); setDestinationOpen(false); }}
																							>
																								<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																									<ListIcon size={12} className="text-zinc-500" />
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
																	const isPtSelected = destinationKey === pt.key;
																	const hasPtChildren = pt.children?.length > 0 || pt.lists?.length > 0;
																	return (
																		<div key={pt.key} className="relative select-none">
																			<div
																				className={cn(
																					"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																					isPtSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																				)}
																				style={{ paddingLeft: 24 }}
																				onClick={() => { setDestinationKey(pt.key); setDestinationOpen(false); }}
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
																				const isFolderCollapsed = collapsedNodes.has(folder.key);
																				const isFolderSelected = destinationKey === folder.key;
																				const hasFolderChildren = folder.children?.length > 0;
																				return (
																					<div key={folder.key} className="relative select-none">
																						<div
																							className={cn(
																								"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																								isFolderSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																							)}
																							style={{ paddingLeft: 40 }}
																							onClick={() => { setDestinationKey(folder.key); setDestinationOpen(false); }}
																						>
																							<div
																								className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																								onClick={(e) => { if (!hasFolderChildren) return; e.stopPropagation(); toggleNode(e, folder.key); }}
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
																							{isFolderSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																						</div>
																						{!isFolderCollapsed && folder.children?.map((list: any) => {
																							const isListSelected = destinationKey === list.key;
																							return (
																								<div
																									key={list.key}
																									className={cn(
																										"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																										isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																									)}
																									style={{ paddingLeft: 56 }}
																									onClick={() => { setDestinationKey(list.key); setDestinationOpen(false); }}
																								>
																									<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																										<ListIcon size={12} className="text-zinc-500" />
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
																				const isListSelected = destinationKey === list.key;
																				return (
																					<div
																						key={list.key}
																						className={cn(
																							"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																							isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																						)}
																						style={{ paddingLeft: 40 }}
																						onClick={() => { setDestinationKey(list.key); setDestinationOpen(false); }}
																					>
																						<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																							<ListIcon size={12} className="text-zinc-500" />
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
																	const isFolderSelected = destinationKey === folder.key;
																	const hasFolderChildren = folder.children?.length > 0;
																	return (
																		<div key={folder.key} className="relative select-none">
																			<div
																				className={cn(
																					"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																					isFolderSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																				)}
																				style={{ paddingLeft: 24 }}
																				onClick={() => { setDestinationKey(folder.key); setDestinationOpen(false); }}
																			>
																				<div
																					className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center"
																					onClick={(e) => { if (!hasFolderChildren) return; e.stopPropagation(); toggleNode(e, folder.key); }}
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
																				{isFolderSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
																			</div>
																			{!isFolderCollapsed && folder.children?.map((list: any) => {
																				const isListSelected = destinationKey === list.key;
																				return (
																					<div
																						key={list.key}
																						className={cn(
																							"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																							isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																						)}
																						style={{ paddingLeft: 40 }}
																						onClick={() => { setDestinationKey(list.key); setDestinationOpen(false); }}
																					>
																						<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																							<ListIcon size={12} className="text-zinc-500" />
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
																	const isListSelected = destinationKey === list.key;
																	return (
																		<div
																			key={list.key}
																			className={cn(
																				"group/item flex w-full items-center gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-zinc-100 text-sm cursor-pointer",
																				isListSelected ? "bg-violet-50 font-medium text-violet-900" : "text-zinc-700"
																			)}
																			style={{ paddingLeft: 24 }}
																			onClick={() => { setDestinationKey(list.key); setDestinationOpen(false); }}
																		>
																			<div className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center">
																				<ListIcon size={12} className="text-zinc-500" />
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
