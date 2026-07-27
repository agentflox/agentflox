'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusIcon, Paperclip, Settings2, FileText, UploadCloud, Hash, Folder as FolderIconLucide, LayoutGrid, Clock, Briefcase, Building2, Network, ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { taskFormSchema, TaskFormValues } from '@/entities/task/validations/task.schema';
import { trpc } from '@/lib/trpc';
import type { AppRouter } from '@/trpc/root';
import type { inferRouterInputs } from '@trpc/server';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormProvider, useForm } from 'react-hook-form';
import { TaskDetailsForm } from './TaskDetailsForm';
import { TaskOptionsForm } from './TaskOptionsForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListCreationModal } from './ListCreationModal';
import { cn } from '@/lib/utils';

type TaskContext = 'SPACE' | 'PROJECT' | 'TEAM' | 'GENERAL'
type Option = { id: string; name: string; image?: string | null; color?: string; type?: string }

interface CreateTaskModalProps {
  context: TaskContext;
  contextId?: string;
  workspaceId?: string;
  users?: Option[];
  projects?: Option[];
  teams?: Option[];
  lists?: Option[];
  spaces?: Option[];
  defaultListId?: string;
  defaultStatus?: string;
  defaultParentId?: string;
  defaultStartDate?: Date | null;
  defaultDueDate?: Date | null;
  availableStatuses?: Option[];
  trigger?: React.ReactNode;
  onSuccess?: (task: any) => void;
}

type RouterInputs = inferRouterInputs<AppRouter>;
type TaskCreateInput = RouterInputs['task']['create'];

export function TaskCreationPopover({
  context,
  contextId,
  workspaceId,
  users = [],
  projects = [],
  teams = [],
  lists: propLists = [],
  spaces = [],
  defaultListId,
  defaultStatus,
  defaultParentId,
  defaultStartDate,
  defaultDueDate,
  availableStatuses = [],
  trigger,
  onSuccess,
  open,
  onOpenChange
}: CreateTaskModalProps & { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const createTask = trpc.task.create.useMutation();
  const utils = trpc.useUtils();

  // Fetch lists scoped to the current context
  const listQueryInput = React.useMemo(() => {
    if (!workspaceId) return undefined;
    if (context === 'PROJECT' && contextId) return { workspaceId, projectId: contextId };
    if (context === 'TEAM' && contextId) return { workspaceId, teamId: contextId };
    if (context === 'SPACE' && contextId) return { workspaceId, spaceId: contextId };
    return { workspaceId };
  }, [context, contextId, workspaceId]);

  const { data: listsData } = trpc.list.byContext.useQuery(listQueryInput!, {
    enabled: !!listQueryInput && isOpen,
  });

  const { data: workspaceData } = trpc.workspace.get.useQuery(
    { id: workspaceId || '' },
    { enabled: !!workspaceId && (!users || users.length === 0 || !projects || projects.length === 0 || !teams || teams.length === 0) }
  );

  const lists = React.useMemo(() => {
    if (listsData?.items?.length) {
      return listsData.items.map(l => ({ id: l.id, name: l.name }));
    }
    return propLists;
  }, [listsData?.items, propLists]);

  const effectiveUsers = React.useMemo(() => {
    if (users && users.length > 0) return users;
    if (!workspaceData?.members) return [];
    return workspaceData.members.map(m => ({
      id: m.user.id,
      name: m.user.name || m.user.email || 'Unknown',
      image: m.user.image,
    }));
  }, [users, workspaceData?.members]);

  const effectiveProjects = React.useMemo(() => {
    if (projects && projects.length > 0) return projects;
    if (!workspaceData?.projects) return [];
    return workspaceData.projects.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status
    }));
  }, [projects, workspaceData?.projects]);


  const effectiveTeams = React.useMemo(() => {
    if (teams && teams.length > 0) return teams;
    if (!workspaceData?.teams) return [];
    return workspaceData.teams.map(t => ({
      id: t.id,
      name: t.name
    }));
  }, [teams, workspaceData?.teams]);

  // Handle Recent Lists
  const [recentListIds, setRecentListIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('agentflox-recent-lists');
      if (stored) {
        setRecentListIds(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const addToRecents = (listId: string) => {
    if (listId === 'CREATE_NEW_LIST') return;
    const newRecents = [listId, ...recentListIds.filter(id => id !== listId)].slice(0, 5);
    setRecentListIds(newRecents);
    localStorage.setItem('agentflox-recent-lists', JSON.stringify(newRecents));
  };

  // Group Lists Hierarchy
  const hierarchy = React.useMemo(() => {
    const rawLists = listsData?.items || [];
    const spacesMap = new Map<string, { id: string; name: string; projects: Map<string, any>; teams: Map<string, any>; folders: Map<string, any>; lists: any[] }>();
    const rootProjectsMap = new Map<string, { id: string; name: string; folders: Map<string, any>; lists: any[] }>();
    const rootTeamsMap = new Map<string, { id: string; name: string; folders: Map<string, any>; lists: any[] }>();
    const rootFoldersMap = new Map<string, { id: string; name: string; lists: any[] }>();
    const rootLists: any[] = [];

    const getTeamName = (id: string) => effectiveTeams.find(t => t.id === id)?.name || 'Team';
    const getProjectName = (id: string) => effectiveProjects.find(p => p.id === id)?.name || 'Project';

    rawLists.forEach((list: any) => {
      // Create folder container if needed
      const folderObj = list.folder ? { id: list.folder.id, name: list.folder.name, lists: [] } : null;

      if (list.spaceId) {
        if (!spacesMap.has(list.spaceId)) {
          spacesMap.set(list.spaceId, { id: list.spaceId, name: list.space?.name || 'Space', projects: new Map(), teams: new Map(), folders: new Map(), lists: [] });
        }
        const space = spacesMap.get(list.spaceId)!;

        if (list.projectId) {
          if (!space.projects.has(list.projectId)) space.projects.set(list.projectId, { id: list.projectId, name: list.project?.name || getProjectName(list.projectId), folders: new Map(), lists: [] });
          const project = space.projects.get(list.projectId)!;
          if (folderObj) {
            if (!project.folders.has(folderObj.id)) project.folders.set(folderObj.id, { ...folderObj });
            project.folders.get(folderObj.id)!.lists.push(list);
          } else {
            project.lists.push(list);
          }
        } else if (list.teamId) {
          if (!space.teams.has(list.teamId)) space.teams.set(list.teamId, { id: list.teamId, name: getTeamName(list.teamId), folders: new Map(), lists: [] });
          const team = space.teams.get(list.teamId)!;
          if (folderObj) {
            if (!team.folders.has(folderObj.id)) team.folders.set(folderObj.id, { ...folderObj });
            team.folders.get(folderObj.id)!.lists.push(list);
          } else {
            team.lists.push(list);
          }
        } else if (folderObj) {
          if (!space.folders.has(folderObj.id)) space.folders.set(folderObj.id, { ...folderObj });
          space.folders.get(folderObj.id)!.lists.push(list);
        } else {
          space.lists.push(list);
        }
      } else if (list.projectId) {
        if (!rootProjectsMap.has(list.projectId)) rootProjectsMap.set(list.projectId, { id: list.projectId, name: list.project?.name || getProjectName(list.projectId), folders: new Map(), lists: [] });
        const project = rootProjectsMap.get(list.projectId)!;
        if (folderObj) {
          if (!project.folders.has(folderObj.id)) project.folders.set(folderObj.id, { ...folderObj });
          project.folders.get(folderObj.id)!.lists.push(list);
        } else {
          project.lists.push(list);
        }
      } else if (list.teamId) {
        if (!rootTeamsMap.has(list.teamId)) rootTeamsMap.set(list.teamId, { id: list.teamId, name: getTeamName(list.teamId), folders: new Map(), lists: [] });
        const team = rootTeamsMap.get(list.teamId)!;
        if (folderObj) {
          if (!team.folders.has(folderObj.id)) team.folders.set(folderObj.id, { ...folderObj });
          team.folders.get(folderObj.id)!.lists.push(list);
        } else {
          team.lists.push(list);
        }
      } else if (folderObj) {
        if (!rootFoldersMap.has(folderObj.id)) rootFoldersMap.set(folderObj.id, { ...folderObj });
        rootFoldersMap.get(folderObj.id)!.lists.push(list);
      } else {
        rootLists.push(list);
      }
    });

    return {
      spaces: Array.from(spacesMap.values()),
      projects: Array.from(rootProjectsMap.values()),
      teams: Array.from(rootTeamsMap.values()),
      folders: Array.from(rootFoldersMap.values()),
      lists: rootLists
    };
  }, [listsData?.items, effectiveProjects, effectiveTeams]);

  const recentLists = React.useMemo(() => {
    if (!listsData?.items) return [];
    return recentListIds
      .map(id => listsData.items.find(l => l.id === id))
      .filter(Boolean) as any[];
  }, [recentListIds, listsData?.items]);

  // Expand/collapse state for tree nodes
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set());
  const toggleNode = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Create a Set of recent list IDs to exclude from hierarchy
  const recentListIdsSet = React.useMemo(() => {
    return new Set(recentLists.map(l => l.id));
  }, [recentLists]);

  const methods = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema as any),
    defaultValues: {
      title: '',
      description: '',
      visibility: 'PRIVATE',
      isPublic: false,
      workspaceId: workspaceId,
      spaceId: context === 'SPACE' ? contextId : undefined,
      projectId: context === 'PROJECT' ? contextId : undefined,
      teamId: context === 'TEAM' ? contextId : undefined,
      listId: defaultListId,
      statusId: defaultStatus,
      priority: 'NORMAL',
      dueDate: defaultDueDate ?? null,
      startDate: defaultStartDate ?? null,
      parentId: defaultParentId ?? null,
      taskType: 'TASK',
      taskTypeId: undefined,
    },
  });

  const selectedListId = methods.watch('listId');

  // Fetch statuses: list-scoped ↁEworkspace-scoped ↁEsystem global
  const { data: statusData } = trpc.taskStatus.list.useQuery(
    {
      listId: selectedListId || undefined,
      workspaceId: workspaceId || undefined,
    },
    { enabled: isOpen }
  );

  const dynamicStatuses = React.useMemo(() => {
    if (availableStatuses.length > 0) return availableStatuses;
    return statusData ?? [];
  }, [availableStatuses, statusData]);

  // Auto-select first valid status when list changes or statuses load
  React.useEffect(() => {
    if (!isOpen) return;
    const currentStatus = methods.getValues('statusId');
    if (dynamicStatuses.length > 0 && (!currentStatus || !dynamicStatuses.find((s: any) => s.id === currentStatus))) {
      methods.setValue('statusId', dynamicStatuses[0].id);
    }
  }, [dynamicStatuses, methods, isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      methods.reset({
        title: '',
        description: '',
        visibility: 'PRIVATE',
        isPublic: false,
        workspaceId: workspaceId,
        spaceId: context === 'SPACE' ? contextId : undefined,
        projectId: context === 'PROJECT' ? contextId : undefined,
        teamId: context === 'TEAM' ? contextId : undefined,
        listId: defaultListId,
        statusId: defaultStatus,
        priority: 'NORMAL',
        dueDate: defaultDueDate ?? null,
        startDate: defaultStartDate ?? null,
        parentId: defaultParentId ?? null,
        taskType: 'TASK',
        taskTypeId: undefined,
      });
    }
  }, [isOpen, defaultListId, defaultStatus, defaultParentId, defaultStartDate, defaultDueDate, context, contextId, workspaceId, methods]);

  const onSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    try {
      const assigneeIds = Array.from(new Set([
        ...((data.assigneeIds as any) ?? []),
        ...(data.assigneeId ? [data.assigneeId] : []),
      ])).filter(Boolean) as string[];

      const payload = {
        title: data.title,
        description: data.description || undefined,
        visibility: data.visibility || 'PRIVATE',
        isPublic: data.isPublic ?? false,
        workspaceId: (data.workspaceId || workspaceId || '') as string,
        spaceId: context === 'SPACE' ? contextId : data.spaceId || undefined,
        projectId: context === 'PROJECT' ? contextId : data.projectId || undefined,
        teamId: context === 'TEAM' ? contextId : data.teamId || undefined,
        // Keep legacy field for backwards compatibility
        assigneeId: (assigneeIds[0] ?? data.assigneeId) || undefined,
        assigneeIds,
        listId: data.listId || undefined,
        statusId: data.statusId || undefined,
        priority: data.priority || undefined,
        parentId: (data as any).parentId ?? undefined,
        dueDate: (data as any).dueDate ?? undefined,
        startDate: (data as any).startDate ?? undefined,
        taskType: (['TASK', 'MILESTONE', 'FORM_RESPONSE', 'MEETING_NOTE'].includes(data.taskType as any) ? data.taskType : undefined) as any,
        taskTypeId: data.taskTypeId,
      } as unknown as TaskCreateInput;
      const createdTask = await createTask.mutateAsync(payload);
      if (onSuccess) {
        onSuccess(createdTask);
      }
      await utils.task.list.invalidate();
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to create task", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button className="font-medium shadow-none bg-blue-600 hover:bg-blue-700 text-white">
      <PlusIcon className="mr-2 h-4 w-4" />
      New Task
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <PopoverTrigger asChild>
          {trigger || defaultTrigger}
        </PopoverTrigger>
      )}
      <PopoverContent className="w-[800px] h-[700px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white z-[300]" side="right" sideOffset={12} align="end" collisionPadding={16}>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit as any)} className="flex-1 flex flex-col min-h-0">

            <div className="px-6 py-5 border-b border-zinc-100/50 flex flex-row items-center justify-between space-y-0 bg-white shrink-0 z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="bg-zinc-100 p-2 rounded-lg">
                  <PlusIcon className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-medium text-zinc-900 leading-none">Create Task</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">in</span>
                    <div className="h-4 flex items-center">
                      <Select
                        value={methods.watch('listId') || ''}
                        onValueChange={(val) => {
                          if (val === 'CREATE_NEW_LIST') {
                            setIsCreateListOpen(true);
                          } else {
                            const realId = val.startsWith('recent:') ? val.substring(7) : val;
                            methods.setValue('listId', realId);
                            methods.clearErrors('listId');
                            addToRecents(realId);
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-5 border-none shadow-none bg-transparent hover:bg-zinc-100/50 px-1.5 py-0 text-xs font-medium text-zinc-700 data-[placeholder]:text-zinc-500 focus:ring-0 gap-1.5 w-auto min-w-[80px]",
                            methods.formState.errors.listId && "text-red-600 bg-red-50"
                          )}
                        >
                          <SelectValue placeholder="Select List..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {/* 1. Create New */}
                          <SelectItem value="CREATE_NEW_LIST" className="text-xs text-blue-600 font-medium focus:text-blue-700 focus:bg-blue-50">
                            <div className="flex items-center gap-2">
                              <PlusIcon className="w-3.5 h-3.5" />
                              <span>Create new list</span>
                            </div>
                          </SelectItem>
                          <Separator className="my-1" />

                          {/* 2. Recents - FIXED: Use prefixed keys */}
                          {recentLists.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-tighter flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                Recents
                              </div>
                              {recentLists.map(l => (
                                <SelectItem key={`recent-${l.id}`} value={`recent:${l.id}`} className="text-xs pl-8">
                                  <div className="flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{l.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                            </>
                          )}

                          {/* 3. Spaces Hierarchy */}
                          {hierarchy.spaces.map((space: any) => {
                            const isSpaceCollapsed = collapsedNodes.has(`space-${space.id}`);
                            return (
                              <React.Fragment key={`space-${space.id}`}>
                                <div
                                  className="px-2 py-1.5 text-[11px] font-semibold text-zinc-900 bg-zinc-50/50 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-100/50 transition-colors select-none"
                                  onClick={(e) => toggleNode(e, `space-${space.id}`)}
                                >
                                  {isSpaceCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                  <Network className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  {space.name}
                                </div>

                                {!isSpaceCollapsed && (
                                  <>
                                    {Array.from(space.projects.values()).map((project: any) => {
                                      const isProjectCollapsed = collapsedNodes.has(`project-${project.id}`);
                                      return (
                                        <React.Fragment key={`space-${space.id}-project-${project.id}`}>
                                          <div
                                            className="px-2 py-1.5 pl-3 text-[11px] font-medium text-zinc-600 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                                            onClick={(e) => toggleNode(e, `project-${project.id}`)}
                                          >
                                            {isProjectCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                            <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            {project.name}
                                          </div>
                                          {!isProjectCollapsed && (
                                            <>
                                              {Array.from(project.folders.values()).map((folder: any) => {
                                                const isFolderCollapsed = collapsedNodes.has(`folder-${folder.id}`);
                                                return (
                                                  <React.Fragment key={`space-${space.id}-project-${project.id}-folder-${folder.id}`}>
                                                    <div
                                                      className="px-2 py-1.5 pl-6 text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                                                      onClick={(e) => toggleNode(e, `folder-${folder.id}`)}
                                                    >
                                                      {isFolderCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                                      <FolderIconLucide className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                      {folder.name}
                                                    </div>
                                                    {!isFolderCollapsed && folder.lists.map((list: any) => (
                                                      <SelectItem key={`space-${space.id}-project-${project.id}-folder-${folder.id}-list-${list.id}`} value={list.id} className="text-xs pl-14">
                                                        <div className="flex items-center gap-1.5">
                                                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                          <span>{list.name}</span>
                                                        </div>
                                                      </SelectItem>
                                                    ))}
                                                  </React.Fragment>
                                                );
                                              })}
                                              {project.lists.map((list: any) => (
                                                <SelectItem key={`space-${space.id}-project-${project.id}-list-${list.id}`} value={list.id} className="text-xs pl-10">
                                                  <div className="flex items-center gap-1.5">
                                                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{list.name}</span>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}

                                    {Array.from(space.teams.values()).map((team: any) => {
                                      const isTeamCollapsed = collapsedNodes.has(`team-${team.id}`);
                                      return (
                                        <React.Fragment key={`space-${space.id}-team-${team.id}`}>
                                          <div
                                            className="px-2 py-1.5 pl-3 text-[11px] font-medium text-zinc-600 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                                            onClick={(e) => toggleNode(e, `team-${team.id}`)}
                                          >
                                            {isTeamCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                            <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                            {team.name}
                                          </div>
                                          {!isTeamCollapsed && (
                                            <>
                                              {Array.from(team.folders.values()).map((folder: any) => {
                                                const isFolderCollapsed = collapsedNodes.has(`folder-${folder.id}`);
                                                return (
                                                  <React.Fragment key={`space-${space.id}-team-${team.id}-folder-${folder.id}`}>
                                                    <div
                                                      className="px-2 py-1.5 pl-6 text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                                                      onClick={(e) => toggleNode(e, `folder-${folder.id}`)}
                                                    >
                                                      {isFolderCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                                      <FolderIconLucide className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                      {folder.name}
                                                    </div>
                                                    {!isFolderCollapsed && folder.lists.map((list: any) => (
                                                      <SelectItem key={`space-${space.id}-team-${team.id}-folder-${folder.id}-list-${list.id}`} value={list.id} className="text-xs pl-14">
                                                        <div className="flex items-center gap-1.5">
                                                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                          <span>{list.name}</span>
                                                        </div>
                                                      </SelectItem>
                                                    ))}
                                                  </React.Fragment>
                                                );
                                              })}
                                              {team.lists.map((list: any) => (
                                                <SelectItem key={`space-${space.id}-team-${team.id}-list-${list.id}`} value={list.id} className="text-xs pl-10">
                                                  <div className="flex items-center gap-1.5">
                                                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{list.name}</span>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}

                                    {Array.from(space.folders.values()).map((folder: any) => {
                                      const isFolderCollapsed = collapsedNodes.has(`folder-${folder.id}`);
                                      return (
                                        <React.Fragment key={`space-${space.id}-folder-${folder.id}`}>
                                          <div
                                            className="px-2 py-1.5 pl-3 text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                                            onClick={(e) => toggleNode(e, `folder-${folder.id}`)}
                                          >
                                            {isFolderCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                            <FolderIconLucide className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            {folder.name}
                                          </div>
                                          {!isFolderCollapsed && folder.lists.map((list: any) => (
                                            <SelectItem key={`space-${space.id}-folder-${folder.id}-list-${list.id}`} value={list.id} className="text-xs pl-10">
                                              <div className="flex items-center gap-1.5">
                                                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{list.name}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}

                                    {space.lists.map((list: any) => (
                                      <SelectItem key={`space-${space.id}-list-${list.id}`} value={list.id} className="text-xs pl-7">
                                        <div className="flex items-center gap-1.5">
                                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>{list.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}

                          {/* 4. Root Projects */}
                          {hierarchy.projects.map((project: any) => {
                            const isProjectCollapsed = collapsedNodes.has(`project-${project.id}`);
                            return (
                              <React.Fragment key={`root-project-${project.id}`}>
                                <div
                                  className="px-2 py-1.5 text-[11px] font-semibold text-zinc-900 bg-zinc-50/50 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-100/50 transition-colors select-none"
                                  onClick={(e) => toggleNode(e, `project-${project.id}`)}
                                >
                                  {isProjectCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                  <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  {project.name}
                                </div>
                                {!isProjectCollapsed && (
                                  <>
                                    {Array.from(project.folders.values()).map((folder: any) => {
                                      const isFolderCollapsed = collapsedNodes.has(`folder-${folder.id}`);
                                      return (
                                        <React.Fragment key={`root-project-${project.id}-folder-${folder.id}`}>
                                          <div
                                            className="px-2 py-1.5 pl-3 text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                                            onClick={(e) => toggleNode(e, `folder-${folder.id}`)}
                                          >
                                            {isFolderCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                            <FolderIconLucide className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            {folder.name}
                                          </div>
                                          {!isFolderCollapsed && folder.lists.map((list: any) => (
                                            <SelectItem key={`root-project-${project.id}-folder-${folder.id}-list-${list.id}`} value={list.id} className="text-xs pl-10">
                                              <div className="flex items-center gap-1.5">
                                                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{list.name}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}
                                    {project.lists.map((list: any) => (
                                      <SelectItem key={`root-project-${project.id}-list-${list.id}`} value={list.id} className="text-xs pl-7">
                                        <div className="flex items-center gap-1.5">
                                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>{list.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}

                          {/* 5. Root Teams */}
                          {hierarchy.teams.map((team: any) => {
                            const isTeamCollapsed = collapsedNodes.has(`team-${team.id}`);
                            return (
                              <React.Fragment key={`root-team-${team.id}`}>
                                <div
                                  className="px-2 py-1.5 text-[11px] font-semibold text-zinc-900 bg-zinc-50/50 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-100/50 transition-colors select-none"
                                  onClick={(e) => toggleNode(e, `team-${team.id}`)}
                                >
                                  {isTeamCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  {team.name}
                                </div>
                                {!isTeamCollapsed && (
                                  <>
                                    {Array.from(team.folders.values()).map((folder: any) => {
                                      const isFolderCollapsed = collapsedNodes.has(`folder-${folder.id}`);
                                      return (
                                        <React.Fragment key={`root-team-${team.id}-folder-${folder.id}`}>
                                          <div
                                            className="px-2 py-1.5 pl-3 text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                                            onClick={(e) => toggleNode(e, `folder-${folder.id}`)}
                                          >
                                            {isFolderCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                            <FolderIconLucide className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            {folder.name}
                                          </div>
                                          {!isFolderCollapsed && folder.lists.map((list: any) => (
                                            <SelectItem key={`root-team-${team.id}-folder-${folder.id}-list-${list.id}`} value={list.id} className="text-xs pl-10">
                                              <div className="flex items-center gap-1.5">
                                                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{list.name}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}
                                    {team.lists.map((list: any) => (
                                      <SelectItem key={`root-team-${team.id}-list-${list.id}`} value={list.id} className="text-xs pl-7">
                                        <div className="flex items-center gap-1.5">
                                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>{list.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}

                          {/* 6. Root Folders */}
                          {hierarchy.folders.map(folder => {
                            const isFolderCollapsed = collapsedNodes.has(`folder-${folder.id}`);
                            return (
                              <React.Fragment key={`root-folder-${folder.id}`}>
                                <div
                                  className="px-2 py-1.5 text-[11px] font-semibold text-zinc-900 bg-zinc-50/50 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-100/50 transition-colors select-none"
                                  onClick={(e) => toggleNode(e, `folder-${folder.id}`)}
                                >
                                  {isFolderCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                  <FolderIconLucide className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  {folder.name}
                                </div>
                                {!isFolderCollapsed && folder.lists.filter((l: any) => !recentListIdsSet.has(l.id)).map((list: any) => (
                                  <SelectItem key={`root-folder-${folder.id}-list-${list.id}`} value={list.id} className="text-xs pl-7">
                                    <div className="flex items-center gap-1.5">
                                      <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>{list.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            );
                          })}

                          {/* 7. Root Lists */}
                          {hierarchy.lists.filter((l: any) => !recentListIdsSet.has(l.id)).length > 0 && (
                            <>
                              {(hierarchy.spaces.length > 0 || hierarchy.projects.length > 0 || hierarchy.teams.length > 0 || hierarchy.folders.length > 0) && <Separator className="my-1" />}
                              <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-tighter">
                                Lists
                              </div>
                              {hierarchy.lists.filter((l: any) => !recentListIdsSet.has(l.id)).map((list: any) => (
                                <SelectItem key={`root-list-${list.id}`} value={list.id} className="text-xs pl-5">
                                  <div className="flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{list.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {/* Fallback if no rich data but propLists exist (Or if everything was empty) - FIXED: Use prefixed keys */}
                          {listsData?.items?.length === 0 && lists.length > 0 && (
                            lists.map((l) => (
                              <SelectItem key={`fallback-${l.id}`} value={l.id} className="text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{l.name}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}

                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ListCreationModal
              open={isCreateListOpen}
              onOpenChange={setIsCreateListOpen}
              context={context as any}
              contextId={contextId}
              workspaceId={workspaceId}
              trigger={<></>}
              onListCreated={(newList) => {
                if (listQueryInput) {
                  utils.list.byContext.setData(listQueryInput, (old: any) => {
                    if (!old) return { items: [newList] };
                    // Avoid duplicates if the server already returned it
                    if (old.items.some((item: any) => item.id === newList.id)) return old;
                    return { ...old, items: [...old.items, newList] };
                  });
                }
                utils.list.byContext.invalidate(listQueryInput);
                if (workspaceId) {
                  utils.list.byContext.invalidate({ workspaceId });
                }
                methods.setValue('listId', newList.id);
                methods.clearErrors('listId');
                addToRecents(newList.id);
              }}
            />

            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <div className="px-6 border-b border-zinc-200/70 bg-white shrink-0">
                <TabsList className="h-11 bg-transparent p-0 w-full justify-start gap-1">
                  <TabsTrigger
                    value="details"
                    className="group relative h-full rounded-none border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 font-medium text-[13px] text-zinc-500 data-[state=active]:text-zinc-900 transition-colors duration-150 cursor-pointer hover:text-zinc-700 after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[2px] after:rounded-full after:bg-blue-600 after:scale-x-0 after:transition-transform after:duration-200 data-[state=active]:after:scale-x-100"
                  >
                    <FileText className="h-3.5 w-3.5 mr-2 text-zinc-400 group-data-[state=active]:text-blue-600 transition-colors duration-150" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="attachments"
                    className="group relative h-full rounded-none border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 font-medium text-[13px] text-zinc-500 data-[state=active]:text-zinc-900 transition-colors duration-150 cursor-pointer hover:text-zinc-700 after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[2px] after:rounded-full after:bg-blue-600 after:scale-x-0 after:transition-transform after:duration-200 data-[state=active]:after:scale-x-100"
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-2 text-zinc-400 group-data-[state=active]:text-blue-600 transition-colors duration-150" />
                    Attachments
                  </TabsTrigger>
                  <TabsTrigger
                    value="options"
                    className="group relative h-full rounded-none border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 font-medium text-[13px] text-zinc-500 data-[state=active]:text-zinc-900 transition-colors duration-150 cursor-pointer hover:text-zinc-700 after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[2px] after:rounded-full after:bg-blue-600 after:scale-x-0 after:transition-transform after:duration-200 data-[state=active]:after:scale-x-100"
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-2 text-zinc-400 group-data-[state=active]:text-blue-600 transition-colors duration-150" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 min-h-[400px]">
                  <TabsContent value="details" className="mt-0 h-full">
                    <TaskDetailsForm
                      context={context}
                      contextId={contextId}
                      users={effectiveUsers}
                      projects={effectiveProjects}
                      teams={effectiveTeams}
                      lists={lists} /* Keeping passing lists just in case, though handled above now */
                      spaces={spaces}
                      workspaceId={workspaceId}
                      availableStatuses={dynamicStatuses}
                    />
                  </TabsContent>
                  <TabsContent value="attachments" className="mt-0 h-full">
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-xl bg-gradient-to-b from-zinc-50/80 to-white p-12 text-center transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 ring-1 ring-blue-100 flex items-center justify-center mb-5 shadow-sm">
                        <UploadCloud className="h-6 w-6 text-blue-600" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-sm font-medium text-zinc-700 mb-1.5">Upload attachments</h3>
                      <p className="text-xs text-zinc-500 max-w-xs mb-6 leading-relaxed">
                        Drag and drop files here, or browse from your computer.
                      </p>
                      <Button
                        size="sm"
                        type="button"
                        className="cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs px-4 h-8 shadow-sm hover:shadow transition-all duration-150"
                      >
                        <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                        Browse files
                      </Button>
                      <p className="text-[11px] text-zinc-400 mt-4">
                        Supports images, PDFs, and documents up to 25MB
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="options" className="mt-0 h-full">
                    <TaskOptionsForm />
                  </TabsContent>
                </div>
              </ScrollArea>

              <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 flex justify-between items-center sm:justify-between w-full shrink-0">
                <div className="text-xs text-zinc-400">
                  Press <kbd className="font-mono bg-zinc-100 border border-zinc-200 rounded px-1 min-w-[20px] inline-block text-center">Enter</kbd> to create
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" type="button" onClick={() => handleOpenChange(false)} disabled={isSubmitting} className="w-full rounded-xl hover:border hover:border-slate-200 bg-white text-slate-600 hover:text-slate-700 hover:bg-slate-200 sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-black hover:bg-gray-800 min-w-[150px] shadow-sm">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Task
                  </Button>
                </div>
              </div>
            </Tabs>

          </form>
        </FormProvider>
      </PopoverContent>
    </Popover>
  );
}
