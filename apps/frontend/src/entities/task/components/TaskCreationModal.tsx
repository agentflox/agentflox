'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormProvider, useForm } from 'react-hook-form';
import { TaskDetailsForm } from './TaskDetailsForm';
import { TaskOptionsForm } from './TaskOptionsForm';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusIcon, Paperclip, Settings2, FileText, UploadCloud, ChevronDown, Search, ListChecks, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { taskFormSchema, TaskFormValues } from '@/entities/task/validations/task.schema';
import { trpc } from '@/lib/trpc';
import type { AppRouter } from '@/trpc/root';
import type { inferRouterInputs } from '@trpc/server';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DestinationTreeRow,
  ENTITY_TREE_NEST,
} from '@/features/dashboard/components/shared/breadcrumbTreeUi';

import { ListCreationModal } from '../../lists/components/ListCreationModal';
import { cn } from '@/lib/utils';

type TaskContext = 'WORKSPACE' | 'SPACE' | 'PROJECT' | 'TEAM' | 'GENERAL'
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

export function TaskCreationModal({
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

  // Fetch statuses: list-scoped → workspace-scoped → system global
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[800px] h-[700px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit as any)} className="flex-1 flex flex-col min-h-0">

            <DialogHeader className="px-6 py-5 border-b border-zinc-100/50 flex flex-row items-center justify-between space-y-0 bg-white shrink-0 z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="bg-zinc-100 p-2 rounded-lg">
                  <PlusIcon className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex flex-col gap-3">
                  <DialogTitle className="text-sm font-medium text-zinc-900 leading-none">Create Task</DialogTitle>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">in</span>
                    <div className="h-4 flex items-center">
                      <TaskListSelectPopover
                        value={methods.watch('listId') || ''}
                        onChange={(realId) => {
                          methods.setValue('listId', realId);
                          methods.clearErrors('listId');
                          addToRecents(realId);
                        }}
                        recentLists={recentLists}
                        hierarchy={hierarchy}
                        hasError={!!methods.formState.errors.listId}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

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

              <DialogFooter className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/30 flex justify-between items-center sm:justify-between w-full shrink-0">
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
              </DialogFooter>
            </Tabs>

          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}


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
      opts.push({ key: `WORKSPACE:${w.id}`, kind: "workspace", label: w.name, depth: 0 });
    });

    spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: "space", label: s.name, depth: 0, spaceId: s.id }));
    projects.forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: "project", label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined }));
    teams.forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: "team", label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined }));
    folders.forEach((f: any) => opts.push({ key: `FOLDER:${f.id}`, kind: "folder", label: f.name, depth: f.parentId ? 2 : (f.spaceId || f.projectId || f.teamId ? 1 : 0), folderId: f.id, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, teamId: f.teamId || undefined }));
    lists.forEach((l: any) => opts.push({ key: `LIST:${l.id}`, kind: "list", label: l.name, depth: l.folderId ? 2 : (l.spaceId || l.projectId || l.teamId ? 1 : 0), listId: l.id, folderId: l.folderId || undefined, spaceId: l.spaceId || undefined, projectId: l.projectId || undefined, teamId: l.teamId || undefined }));

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
          key: `SPACE:${spaceId}`,
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
        key: `WORKSPACE:${ws.id}`,
        name: ws.name,
        logo: ws.logo ?? ws.avatar ?? ws.avatarUrl,
        color: ws.color,
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
              <DestinationTreeRow
                selected={value === "personal"}
                kind="personal"
                label="Personal List"
                onClick={() => handleSelect("personal")}
              />
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
                    key={`recent-${l.id}`}
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
            if (!wsMatches && !hasChildren) return null;
            const flip = (id: string) => {
              setCollapsedNodes((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              });
            };
            return (
              <div key={ws.key} className="space-y-0.5">
                <DestinationTreeRow
                  selected={false}
                  kind="workspace"
                  entity={ws}
                  label={ws.name}
                  hasChildren={hasChildren}
                  expanded={!isWsCollapsed}
                  onToggle={(e) => toggleNode(e, ws.key)}
                  onClick={() => { if (hasChildren) flip(ws.key); }}
                />
                {!isWsCollapsed && hasChildren && (
                  <div className={ENTITY_TREE_NEST}>
                    {ws.spaces?.map((space: any) => {
                      const isSpaceCollapsed = collapsedNodes.has(space.key);
                      const hasSpaceChildren = space.children?.length > 0 || space.folders?.length > 0 || space.lists?.length > 0;
                      return (
                        <div key={space.key} className="space-y-0.5">
                          <DestinationTreeRow
                            selected={false}
                            kind="space"
                            entity={space}
                            label={space.name}
                            hasChildren={hasSpaceChildren}
                            expanded={!isSpaceCollapsed}
                            onToggle={(e) => toggleNode(e, space.key)}
                            onClick={() => { if (hasSpaceChildren) flip(space.key); }}
                          />
                          {!isSpaceCollapsed && hasSpaceChildren && (
                            <div className={ENTITY_TREE_NEST}>
                              {space.children?.map((pt: any) => {
                                const isPtCollapsed = collapsedNodes.has(pt.key);
                                const hasPtChildren = pt.children?.length > 0 || pt.lists?.length > 0;
                                return (
                                  <div key={pt.key} className="space-y-0.5">
                                    <DestinationTreeRow
                                      selected={false}
                                      kind={pt.kind}
                                      entity={pt}
                                      label={pt.label}
                                      hasChildren={hasPtChildren}
                                      expanded={!isPtCollapsed}
                                      onToggle={(e) => toggleNode(e, pt.key)}
                                      onClick={() => { if (hasPtChildren) flip(pt.key); }}
                                    />
                                    {!isPtCollapsed && hasPtChildren && (
                                      <div className={ENTITY_TREE_NEST}>
                                        {pt.children?.map((folder: any) => {
                                          const isFolderCollapsed = collapsedNodes.has(folder.key);
                                          const hasFolderChildren = folder.children?.length > 0;
                                          return (
                                            <div key={folder.key} className="space-y-0.5">
                                              <DestinationTreeRow
                                                selected={false}
                                                kind="folder"
                                                entity={folder}
                                                label={folder.label}
                                                hasChildren={hasFolderChildren}
                                                expanded={!isFolderCollapsed}
                                                onToggle={(e) => toggleNode(e, folder.key)}
                                                onClick={() => { if (hasFolderChildren) flip(folder.key); }}
                                              />
                                              {!isFolderCollapsed && hasFolderChildren && (
                                                <div className={ENTITY_TREE_NEST}>
                                                  {folder.children.map((list: any) => (
                                                    <DestinationTreeRow
                                                      key={list.key}
                                                      selected={value === list.listId}
                                                      kind="list"
                                                      entity={list}
                                                      label={list.label}
                                                      onClick={() => handleSelect(list.listId!)}
                                                    />
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {pt.lists?.map((list: any) => (
                                          <DestinationTreeRow
                                            key={list.key}
                                            selected={value === list.listId}
                                            kind="list"
                                            entity={list}
                                            label={list.label}
                                            onClick={() => handleSelect(list.listId!)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {space.folders?.map((folder: any) => {
                                const isFolderCollapsed = collapsedNodes.has(folder.key);
                                const hasFolderChildren = folder.children?.length > 0;
                                return (
                                  <div key={folder.key} className="space-y-0.5">
                                    <DestinationTreeRow
                                      selected={false}
                                      kind="folder"
                                      entity={folder}
                                      label={folder.label}
                                      hasChildren={hasFolderChildren}
                                      expanded={!isFolderCollapsed}
                                      onToggle={(e) => toggleNode(e, folder.key)}
                                      onClick={() => { if (hasFolderChildren) flip(folder.key); }}
                                    />
                                    {!isFolderCollapsed && hasFolderChildren && (
                                      <div className={ENTITY_TREE_NEST}>
                                        {folder.children.map((list: any) => (
                                          <DestinationTreeRow
                                            key={list.key}
                                            selected={value === list.listId}
                                            kind="list"
                                            entity={list}
                                            label={list.label}
                                            onClick={() => handleSelect(list.listId!)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {space.lists?.map((list: any) => (
                                <DestinationTreeRow
                                  key={list.key}
                                  selected={value === list.listId}
                                  kind="list"
                                  entity={list}
                                  label={list.label}
                                  onClick={() => handleSelect(list.listId!)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {[...(ws.rootProjects || []), ...(ws.rootTeams || [])].map((pt: any) => {
                      const isPtCollapsed = collapsedNodes.has(pt.key);
                      const hasPtChildren = pt.children?.length > 0 || pt.lists?.length > 0;
                      return (
                        <div key={pt.key} className="space-y-0.5">
                          <DestinationTreeRow
                            selected={false}
                            kind={pt.kind}
                            entity={pt}
                            label={pt.label}
                            hasChildren={hasPtChildren}
                            expanded={!isPtCollapsed}
                            onToggle={(e) => toggleNode(e, pt.key)}
                            onClick={() => { if (hasPtChildren) flip(pt.key); }}
                          />
                          {!isPtCollapsed && hasPtChildren && (
                            <div className={ENTITY_TREE_NEST}>
                              {pt.children?.map((folder: any) => {
                                const isFolderCollapsed = collapsedNodes.has(folder.key);
                                const hasFolderChildren = folder.children?.length > 0;
                                return (
                                  <div key={folder.key} className="space-y-0.5">
                                    <DestinationTreeRow
                                      selected={false}
                                      kind="folder"
                                      entity={folder}
                                      label={folder.label}
                                      hasChildren={hasFolderChildren}
                                      expanded={!isFolderCollapsed}
                                      onToggle={(e) => toggleNode(e, folder.key)}
                                      onClick={() => { if (hasFolderChildren) flip(folder.key); }}
                                    />
                                    {!isFolderCollapsed && hasFolderChildren && (
                                      <div className={ENTITY_TREE_NEST}>
                                        {folder.children.map((list: any) => (
                                          <DestinationTreeRow
                                            key={list.key}
                                            selected={value === list.listId}
                                            kind="list"
                                            entity={list}
                                            label={list.label}
                                            onClick={() => handleSelect(list.listId!)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {pt.lists?.map((list: any) => (
                                <DestinationTreeRow
                                  key={list.key}
                                  selected={value === list.listId}
                                  kind="list"
                                  entity={list}
                                  label={list.label}
                                  onClick={() => handleSelect(list.listId!)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {ws.rootFolders?.map((folder: any) => {
                      const isFolderCollapsed = collapsedNodes.has(folder.key);
                      const hasFolderChildren = folder.children?.length > 0;
                      return (
                        <div key={folder.key} className="space-y-0.5">
                          <DestinationTreeRow
                            selected={false}
                            kind="folder"
                            entity={folder}
                            label={folder.label}
                            hasChildren={hasFolderChildren}
                            expanded={!isFolderCollapsed}
                            onToggle={(e) => toggleNode(e, folder.key)}
                            onClick={() => { if (hasFolderChildren) flip(folder.key); }}
                          />
                          {!isFolderCollapsed && hasFolderChildren && (
                            <div className={ENTITY_TREE_NEST}>
                              {folder.children.map((list: any) => (
                                <DestinationTreeRow
                                  key={list.key}
                                  selected={value === list.listId}
                                  kind="list"
                                  entity={list}
                                  label={list.label}
                                  onClick={() => handleSelect(list.listId!)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {ws.rootLists?.map((list: any) => (
                      <DestinationTreeRow
                        key={list.key}
                        selected={value === list.listId}
                        kind="list"
                        entity={list}
                        label={list.label}
                        onClick={() => handleSelect(list.listId!)}
                      />
                    ))}
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
