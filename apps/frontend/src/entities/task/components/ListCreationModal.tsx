"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { FolderPlusIcon, List as ListIcon, Network, Briefcase, Building2, Folder as FolderIconLucide, Search, Check, ChevronDown } from "lucide-react";
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
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { TaskContextType } from "./TaskView";

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

  const utils = trpc.useUtils();

  const projectQuery = trpc.project.get.useQuery({ id: contextId || '' }, { enabled: context === 'PROJECT' && !!contextId && !workspaceId });
  const spaceQuery = trpc.space.get.useQuery({ id: contextId || '' }, { enabled: context === 'SPACE' && !!contextId && !workspaceId });
  const teamQuery = trpc.team.get.useQuery({ id: contextId || '' }, { enabled: context === 'TEAM' && !!contextId && !workspaceId });
  const folderQuery = trpc.folder.get.useQuery({ id: folderId || '' }, { enabled: !!folderId && !workspaceId });

  const resolvedWorkspaceId =
    workspaceId ||
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
      else if (contextId) initialKey = `${context}:${contextId}`;

      setForm({
        ...INITIAL_STATE,
        destinationKey: initialKey
      });
      createList.reset();
      setDestinationSearch("");
    }
  }, [isOpen, context, contextId, folderId]);

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

      const newList = await createList.mutateAsync(payload);

      toast({ title: "List created", description: "Your list is ready." });

      if (onListCreated) onListCreated(newList);
      setIsOpen(false);
    } catch (error: any) {
      toast({ title: "Could not create the list", description: error?.message ?? "Please try again.", variant: "destructive" });
    }
  }

  const spaceName = spaceQuery.data?.name || teamQuery.data?.name || projectQuery.data?.name || 'Space';
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
      <DialogContent className="sm:max-w-xl gap-6">
        <div className="pb-2">
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

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Destination <span className="text-destructive">*</span></Label>
              <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="h-9 w-full border border-slate-200 bg-white text-[14px] shadow-sm text-slate-700 rounded-md px-3 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500">
                    <span className={cn("truncate text-left", !selectedDestination && "text-slate-400")}>
                      {selectedDestination ? getDestinationPath(selectedDestination) : (form.destinationKey ? fallbackDisplay : "Select Destination")}
                    </span>
                    <ChevronDown className="size-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[420px] p-0 shadow-lg">
                  <div className="p-2 border-b border-slate-100">
                    <div className="flex items-center rounded-md border border-indigo-500 px-2 h-9">
                      <Search className="size-4 text-slate-400 shrink-0" />
                      <input
                        value={destinationSearch}
                        onChange={(e) => setDestinationSearch(e.target.value)}
                        placeholder="Search locations..."
                        className="w-full bg-transparent px-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto py-1">
                    {treeNodes.spaces.filter((s: any) => !destinationSearch.trim() || s.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((space: any) => (
                      <div key={space.key}>
                        <button
                          type="button"
                          onClick={() => { setForm(p => ({ ...p, destinationKey: space.key })); setDestinationOpen(false); }}
                          className={cn(
                            "w-full flex items-center justify-between py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                            form.destinationKey === space.key && "bg-indigo-50 text-indigo-700"
                          )}
                          style={{ paddingLeft: "14px" }}
                        >
                          <span className="flex items-center gap-2">
                            <Network className="size-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium">{space.name}</span>
                          </span>
                          {form.destinationKey === space.key && <Check className="size-3.5 text-indigo-600 shrink-0 mr-3" />}
                        </button>
                        {space.children.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                          <button
                            type="button"
                            key={child.key}
                            onClick={() => { setForm(p => ({ ...p, destinationKey: child.key })); setDestinationOpen(false); }}
                            className={cn(
                              "w-full flex items-center justify-between py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                              form.destinationKey === child.key && "bg-indigo-50 text-indigo-700"
                            )}
                            style={{ paddingLeft: `${child.depth * 14 + 14}px` }}
                          >
                            <span className="flex items-center gap-2">
                              {child.kind === "project" && <Briefcase className="size-3.5 text-indigo-400 shrink-0" />}
                              {child.kind === "team" && <Building2 className="size-3.5 text-blue-400 shrink-0" />}
                              {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-slate-400 shrink-0" />}
                              <span>{child.label}</span>
                            </span>
                            {form.destinationKey === child.key && <Check className="size-3.5 text-indigo-600 shrink-0 mr-3" />}
                          </button>
                        ))}
                      </div>
                    ))}
                    {treeNodes.rootChildren.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                      <button
                        type="button"
                        key={child.key}
                        onClick={() => { setForm(p => ({ ...p, destinationKey: child.key })); setDestinationOpen(false); }}
                        className={cn(
                          "w-full flex items-center justify-between py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                          form.destinationKey === child.key && "bg-indigo-50 text-indigo-700"
                        )}
                        style={{ paddingLeft: "14px" }}
                      >
                        <span className="flex items-center gap-2">
                          {child.kind === "project" && <Briefcase className="size-3.5 text-indigo-400 shrink-0" />}
                          {child.kind === "team" && <Building2 className="size-3.5 text-blue-400 shrink-0" />}
                          {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-slate-400 shrink-0" />}
                          <span>{child.label}</span>
                        </span>
                        {form.destinationKey === child.key && <Check className="size-3.5 text-indigo-600 shrink-0 mr-3" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(value: any) => setForm(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger className="w-full rounded-md bg-white">
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
            <Label htmlFor="list-name" className="text-sm font-medium text-slate-700">
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
                className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                required
              />
            </div>
          </div>

          <div className="space-y-0">
            <div className="flex items-center justify-between">
              <Label htmlFor="list-description" className="text-sm font-medium text-slate-700">
                Description <span className="text-[10px] font-normal lowercase">(optional)</span>
              </Label>
            </div>
            <Textarea
              id="list-description"
              name="description"
              placeholder="Tell us a bit about your List..."
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-[100px] rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 resize-none"
            />
          </div>

          <DialogFooter className="gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ListCreationModal;
