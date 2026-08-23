"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Play, FolderPlusIcon, List as ListIcon, Network, Briefcase, Building2, Building, Users, Folder as FolderIconLucide, Search, Check, ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { TaskContextType } from "../../task/components/TaskView";

interface ListCreationModalProps {
  context: TaskContextType;
  contextId?: string;
  workspaceId?: string;
  folderId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onListCreated?: (list: any) => void;
}

const visibilityOptions = [
  { label: "Only Owners", value: "PRIVATE" },
  { label: "Owners & Admins", value: "ADMINS" },
  { label: "Owners, Admins & Members", value: "MEMBERS" },
  { label: "Anyone with Link", value: "PUBLIC" },
];

const INITIAL_STATE = {
  name: "",
  description: "",
  icon: "L",
  color: "#3B82F6",
  hasManualIcon: false,
  visibility: "ADMINS" as "PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE" | "PUBLIC",
  destinationKey: ""
};

type DestinationOption = {
  key: string;
  label: string;
  kind: "space" | "project" | "team" | "folder";
  depth: number;
  spaceId?: string;
  projectId?: string;
  teamId?: string;
  folderId?: string;
};

export function ListCreationModal({ context, contextId, workspaceId, folderId, open: controlledOpen, onOpenChange: setControlledOpen, trigger, onListCreated }: ListCreationModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalIsOpen;
  const setIsOpen = isControlled ? setControlledOpen! : setInternalIsOpen;

  const [form, setForm] = useState(INITIAL_STATE);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

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

  const utils = trpc.useUtils();

  const projectQuery = trpc.project.get.useQuery({ id: contextId || '' }, { enabled: context === 'PROJECT' && !!contextId && !workspaceId });
  const spaceQuery = trpc.space.get.useQuery({ id: contextId || '' }, { enabled: context === 'SPACE' && !!contextId && !workspaceId });
  const teamQuery = trpc.team.get.useQuery({ id: contextId || '' }, { enabled: context === 'TEAM' && !!contextId && !workspaceId });
  const workspaceQuery = trpc.workspace.get.useQuery({ id: contextId || '' }, { enabled: context === 'WORKSPACE' && !!contextId && !workspaceId });
  const folderQuery = trpc.folder.get.useQuery({ id: folderId || '' }, { enabled: !!folderId && !workspaceId });

  const resolvedWorkspaceId =
    workspaceId ||
    (context === 'WORKSPACE' ? contextId : undefined) ||
    projectQuery.data?.workspaceId ||
    spaceQuery.data?.workspace?.id ||
    teamQuery.data?.workspaceId ||
    folderQuery.data?.workspaceId ||
    undefined;

  const { data: spacesData } = trpc.space.list.useQuery(
    { workspaceId: resolvedWorkspaceId },
    { enabled: isOpen && !!resolvedWorkspaceId }
  );
  const { data: projectsData } = trpc.project.list.useQuery(
    { workspaceId: resolvedWorkspaceId },
    { enabled: isOpen && !!resolvedWorkspaceId }
  );
  const { data: teamsData } = trpc.team.list.useQuery(
    { workspaceId: resolvedWorkspaceId },
    { enabled: isOpen && !!resolvedWorkspaceId }
  );
  const { data: foldersData } = trpc.folder.byContext.useQuery(
    { workspaceId: resolvedWorkspaceId },
    { enabled: isOpen && !!resolvedWorkspaceId }
  );

  const spaces = spacesData?.items || [];
  const projects = projectsData?.items || [];
  const teams = teamsData?.items || [];
  const folders = foldersData?.items || [];

  const destinationOptions = useMemo<DestinationOption[]>(() => {
    const opts: DestinationOption[] = [];
    spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: 'space', label: s.name, depth: 0, spaceId: s.id }));
    projects.forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: 'project', label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined }));
    teams.forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: 'team', label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined }));
    folders.forEach((f: any) => {
      const depth = f.parentId ? 2 : (f.spaceId || f.projectId || f.teamId ? 1 : 0);
      opts.push({ key: `FOLDER:${f.id}`, kind: 'folder', label: f.name, depth, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, teamId: f.teamId || undefined, folderId: f.id });
    });
    return opts;
  }, [spaces, projects, teams, folders]);

  const treeNodes = useMemo(() => {
    const spaceNodes = spaces.map((space: any) => {
      const spaceId = space.id;
      const projectsUnderSpace = destinationOptions.filter(o => o.kind === 'project' && o.spaceId === spaceId);
      const teamsUnderSpace = destinationOptions.filter(o => o.kind === 'team' && o.spaceId === spaceId);
      const foldersUnderSpace = destinationOptions.filter(o => o.kind === 'folder' && o.spaceId === spaceId && !o.projectId && !o.teamId);

      const expandedProjectsTeams = [...projectsUnderSpace, ...teamsUnderSpace].flatMap(pt => {
        const ptId = pt.kind === 'project' ? pt.projectId : pt.teamId;
        const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && ((pt.kind === 'project' && o.projectId === ptId) || (pt.kind === 'team' && o.teamId === ptId)));

        return [
          { ...pt, depth: 1 },
          ...foldersUnderPt.map(f => ({ ...f, depth: 2 }))
        ];
      });

      return {
        key: `SPACE:${spaceId}`,
        name: space.name,
        children: [
          ...expandedProjectsTeams,
          ...foldersUnderSpace.map(f => ({ ...f, depth: 1 }))
        ]
      };
    });

    const rootProjects = destinationOptions.filter(o => o.kind === 'project' && !o.spaceId);
    const rootTeams = destinationOptions.filter(o => o.kind === 'team' && !o.spaceId);
    const rootFolders = destinationOptions.filter(o => o.kind === 'folder' && !o.spaceId && !o.projectId && !o.teamId);

    return {
      spaces: spaceNodes,
      rootChildren: [
        ...rootProjects.map(p => ({ ...p, depth: 0 })),
        ...rootTeams.map(t => ({ ...t, depth: 0 })),
        ...rootFolders.map(f => ({ ...f, depth: 0 })),
      ]
    };
  }, [destinationOptions, spaces]);

  const getDestinationPath = useCallback((opt?: DestinationOption) => {
    if (!opt) return "";
    const parts: string[] = [];
    if (opt.spaceId) parts.push(spaces.find((s: any) => s.id === opt.spaceId)?.name || "Space");
    if (opt.projectId) parts.push(projects.find((p: any) => p.id === opt.projectId)?.name || "Project");
    if (opt.teamId) parts.push(teams.find((t: any) => t.id === opt.teamId)?.name || "Team");
    if (opt.kind === 'folder') parts.push(opt.label);
    if (parts.length === 0) return opt.label;
    return parts.join(" > ");
  }, [spaces, projects, teams]);

  useEffect(() => {
    if (isOpen) {
      let initialKey = "";
      if (folderId) initialKey = `FOLDER:${folderId}`;
      else if (contextId && context !== 'WORKSPACE') initialKey = `${context}:${contextId}`;
      else if (context === 'WORKSPACE' && (workspaceId || contextId)) initialKey = `WORKSPACE:${workspaceId || contextId}`;

      setForm({
        ...INITIAL_STATE,
        destinationKey: initialKey
      });
      createList.reset();
      setDestinationSearch("");
    }
  }, [isOpen, context, contextId, folderId, workspaceId]);

  const createList = trpc.list.create.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.list.byContext.invalidate({
        workspaceId: variables.workspaceId,
        projectId: variables.projectId ?? undefined,
        teamId: variables.teamId ?? undefined,
        spaceId: variables.spaceId ?? undefined,
        folderId: variables.folderId ?? undefined,
      });
    },
  });

  const isSubmitting = createList.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Missing details", description: "Please provide a list name.", variant: "destructive" });
      return;
    }

    if (!form.destinationKey) {
      toast({ title: "Missing destination", description: "Please select a location for the list.", variant: "destructive" });
      return;
    }

    try {
      const [type, id] = form.destinationKey.split(':');
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon,
        color: form.color,
        visibility: form.visibility,
      };

      if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId;

      if (type === 'PROJECT') payload.projectId = id;
      else if (type === 'TEAM') payload.teamId = id;
      else if (type === 'SPACE') payload.spaceId = id;
      else if (type === 'FOLDER') payload.folderId = id;
      else if (type === 'WORKSPACE') payload.workspaceId = id;

      const newList = await createList.mutateAsync(payload);

      toast({ title: "List created", description: "Your list is ready." });

      if (onListCreated) onListCreated(newList);
      setIsOpen(false);
    } catch (error: any) {
      toast({ title: "Could not create the list", description: error?.message ?? "Please try again.", variant: "destructive" });
    }
  }

  const spaceName = spaceQuery.data?.name || teamQuery.data?.name || projectQuery.data?.name || workspaceQuery.data?.name || 'Workspace';
  const folderName = folderQuery.data?.name || undefined;
  const fallbackDisplay = folderName ? `${spaceName} / ${folderName}` : spaceName;
  const selectedDestination = destinationOptions.find(d => d.key === form.destinationKey);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="max-w-24" variant="outline">
              <FolderPlusIcon className="mr-2 h-4 w-4" />
              Create List
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl transition-all duration-300">
        <div className="p-6 pb-2">
          <div className="flex items-start gap-5">
            <div className={cn(
              "mt-1 p-3 rounded-2xl border transition-all duration-300",
              "bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
              "group-hover:scale-105"
            )}>
              <ListIcon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
            </div>
            <div className="pt-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
                Create a list
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                Organize your tasks into a list.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="!text-sm !font-medium text-zinc-700">Location <span className="text-destructive">*</span></Label>
                <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="h-9 w-full border border-slate-200 hover:bg-zinc-50 hover:border-slate-300 bg-white text-[14px] text-zinc-700 rounded-md px-3 flex items-center justify-between cursor-pointer focus:outline-none">
                      <span className={cn("truncate text-left", !selectedDestination && "text-zinc-400")}>
                        {selectedDestination ? getDestinationPath(selectedDestination) : (form.destinationKey ? fallbackDisplay : "Select Destination")}
                      </span>
                      <ChevronDown className="size-4 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[360px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white overflow-hidden max-h-[380px] flex flex-col z-50">
                    <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 mx-2.5 mt-2.5 mb-1.5 shrink-0 focus-within:border-zinc-400">
                      <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={destinationSearch}
                        onChange={(e) => setDestinationSearch(e.target.value)}
                        placeholder="Search locations..."
                        className="w-full bg-transparent border-0 p-0 text-xs outline-none placeholder:text-zinc-400"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 py-1 max-h-[320px] px-1">
                      {treeNodes.spaces.filter((s: any) => !destinationSearch.trim() || s.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((space: any) => {
                        const isSpaceCollapsed = collapsedNodes.has(space.key);
                        const isSelected = form.destinationKey === space.key;
                        const hasChildren = space.children && space.children.length > 0;
                        const matchedSpace = spaces.find((sp: any) => sp.id === space.spaceId);

                        return (
                          <div key={space.key} className="space-y-0.5">
                            <div
                              onClick={() => { setForm(p => ({ ...p, destinationKey: space.key })); setDestinationOpen(false); }}
                              className={cn(
                                "group/space w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer select-none",
                                isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                <div
                                  className={cn(
                                    "relative h-5 w-5 rounded shrink-0 flex items-center justify-center",
                                    hasChildren && "cursor-pointer"
                                  )}
                                  onClick={(e) => {
                                    if (hasChildren) {
                                      toggleNode(e, space.key);
                                    }
                                  }}
                                >
                                  <span
                                    className={cn(
                                      "h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center ml-0.5",
                                      hasChildren && "group-hover/space:hidden"
                                    )}
                                    style={{ backgroundColor: matchedSpace?.icon ? (matchedSpace?.color || "#6366f1") : "transparent" }}
                                  >
                                    <SpaceIcon
                                      icon={matchedSpace?.icon}
                                      className={cn(matchedSpace?.icon ? "text-white" : "text-indigo-500")}
                                      size={13}
                                      fill
                                    />
                                  </span>
                                  {hasChildren && (
                                    <div className="hidden group-hover/space:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
                                      <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isSpaceCollapsed && "rotate-90")} />
                                    </div>
                                  )}
                                </div>
                                <span className="truncate font-medium">{space.name}</span>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0 ml-2" />}
                            </div>

                            {!isSpaceCollapsed && (
                              <div className="space-y-0.5 ml-4 pl-1 border-l border-zinc-200/70">
                                {space.children.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => {
                                  const isChildSelected = form.destinationKey === child.key;
                                  return (
                                    <button
                                      type="button"
                                      key={child.key}
                                      onClick={() => { setForm(p => ({ ...p, destinationKey: child.key })); setDestinationOpen(false); }}
                                      className={cn(
                                        "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                                        isChildSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                                      )}
                                      style={{ paddingLeft: `${child.depth > 1 ? (child.depth - 1) * 12 + 8 : 8}px` }}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        {child.kind === "project" && (
                                          <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                            <Briefcase className="h-3 w-3 text-purple-600 shrink-0" />
                                          </div>
                                        )}
                                        {child.kind === "team" && (
                                          <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                            <Users className="h-3 w-3 text-emerald-600 shrink-0" />
                                          </div>
                                        )}
                                        {child.kind === "folder" && (
                                          <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                            <FolderIconLucide className="h-3 w-3 text-blue-600 shrink-0" />
                                          </div>
                                        )}
                                        <span className="truncate">{child.label}</span>
                                      </div>
                                      {isChildSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {treeNodes.rootChildren.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => {
                        const isChildSelected = form.destinationKey === child.key;
                        return (
                          <button
                            type="button"
                            key={child.key}
                            onClick={() => { setForm(p => ({ ...p, destinationKey: child.key })); setDestinationOpen(false); }}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                              isChildSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {child.kind === "project" && (
                                <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                  <Briefcase className="h-3 w-3 text-purple-600 shrink-0" />
                                </div>
                              )}
                              {child.kind === "team" && (
                                <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                  <Users className="h-3 w-3 text-emerald-600 shrink-0" />
                                </div>
                              )}
                              {child.kind === "folder" && (
                                <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                  <FolderIconLucide className="h-3 w-3 text-blue-600 shrink-0" />
                                </div>
                              )}
                              <span className="truncate">{child.label}</span>
                            </div>
                            {isChildSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700">Visibility</Label>
                <Select
                  value={form.visibility}
                  onValueChange={(value: any) => setForm(prev => ({ ...prev, visibility: value }))}
                >
                  <SelectTrigger className="w-full rounded-md shadow-none bg-white border-slate-200 hover:border-slate-300 hover:bg-zinc-50">
                    <SelectValue placeholder="Select visibility">
                      {visibilityOptions.find((o) => o.value === form.visibility)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="list-name" className="text-sm font-medium text-zinc-700">
                Icon & name <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <IconColorSelector
                  icon={form.icon}
                  color={form.color}
                  onIconChange={(icon) => setForm(prev => ({ ...prev, icon, hasManualIcon: true }))}
                  onColorChange={(color) => setForm(prev => ({ ...prev, color }))}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-lg shrink-0 overflow-hidden grid place-items-center"
                    style={{ backgroundColor: form.icon ? form.color : 'transparent' }}
                  >
                    <ProjectIcon icon={form.icon} className="text-white" size={20} fill />
                  </Button>
                </IconColorSelector>
                <Input
                  id="list-name"
                  name="name"
                  variant="ghost"
                  placeholder="Ex: Marketing Campaign"
                  value={form.name}
                  onChange={(event) => {
                    const newName = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name: newName,
                      ...(!prev.hasManualIcon && { icon: newName.trim().charAt(0).toUpperCase() || "L" })
                    }));
                  }}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal text-zinc-900 shadow-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-0">
              <div className="flex items-center justify-between">
                <Label htmlFor="list-description" className="text-sm font-medium text-zinc-700">
                  Description <span className="text-xs font-normal lowercase">(optional)</span>
                </Label>
              </div>
              <Textarea
                id="list-description"
                name="description"
                placeholder="Tell us a bit about your List..."
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-[100px] rounded-md px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus-visible:ring-none resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-muted/20 flex flex-wrap items-center justify-end gap-3 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl border border-slate-200 bg-white text-zinc-600 hover:bg-slate-50 sm:w-auto"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(
                "w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/40 sm:w-auto",
                isSubmitting && "opacity-90"
              )}
              disabled={isSubmitting || !form.name.trim() || !form.destinationKey}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  Creating...
                </span>
              ) : (
                "Create list"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ListCreationModal;
