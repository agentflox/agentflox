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
import { Loader2, PlusIcon, Paperclip, Settings2, FileText, UploadCloud, Hash, Folder, LayoutGrid, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { taskFormSchema, TaskFormValues } from '@/entities/task/validations/task.schema';
import { trpc } from '@/lib/trpc';
import type { AppRouter } from '@/trpc/root';
import type { inferRouterInputs } from '@trpc/server';
import { Separator } from '@/components/ui/separator';
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
    const spacesMap = new Map<string, { id: string; name: string; lists: any[]; folders: Map<string, { id: string; name: string; lists: any[] }> }>();
    const orphanedLists: any[] = [];

    // Helper to get or create space bucket
    const getSpace = (s: { id: string, name: string } | null | undefined) => {
      if (!s) return null;
      if (!spacesMap.has(s.id)) {
        spacesMap.set(s.id, { id: s.id, name: s.name, lists: [], folders: new Map() });
      }
      return spacesMap.get(s.id)!;
    };

    rawLists.forEach((list: any) => {
      // If list has a space
      if (list.space) {
        const spaceGroup = getSpace(list.space);
        if (list.folder) {
          // List is in a folder in a space
          if (!spaceGroup!.folders.has(list.folder.id)) {
            spaceGroup!.folders.set(list.folder.id, { id: list.folder.id, name: list.folder.name, lists: [] });
          }
          spaceGroup!.folders.get(list.folder.id)!.lists.push(list);
        } else {
          // List is directly in space
          spaceGroup!.lists.push(list);
        }
      } else {
        // List is not in a space (e.g. workspace level or just project)
        // For simplicity, treating Project/Team contexts as flat or orphaned for now unless we add Project grouping
        // If we are in Project context, lists might belong to project.
        orphanedLists.push(list);
      }
    });

    return {
      spaces: Array.from(spacesMap.values()),
      orphaned: orphanedLists
    };
  }, [listsData?.items]);

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
      listId:      selectedListId || undefined,
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
      await createTask.mutateAsync(payload);
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
                      <Select
                        value={methods.watch('listId') || ''}
                        onValueChange={(val) => {
                          if (val === 'CREATE_NEW_LIST') {
                            setIsCreateListOpen(true);
                          } else {
                            methods.setValue('listId', val);
                            methods.clearErrors('listId');
                            addToRecents(val);
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-5 border-none shadow-none bg-transparent hover:bg-zinc-100/50 px-1.5 py-0 text-xs font-medium text-zinc-700 data-[placeholder]:text-zinc-500 focus:ring-0 gap-1.5 w-auto min-w-[80px]",
                            methods.formState.errors.listId && "text-red-600 bg-red-50"
                          )}
                        >
                          <Hash className="w-3 h-3 opacity-50" />
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
                                <SelectItem key={`recent-${l.id}`} value={l.id} className="text-xs pl-8">
                                  {l.name}
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                            </>
                          )}

                          {/* 3. Spaces Hierarchy - FIXED: Use prefixed keys */}
                          {hierarchy.spaces.map(space => (
                            <React.Fragment key={`space-${space.id}`}>
                              <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-900 bg-zinc-50/50 flex items-center gap-2">
                                <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
                                {space.name}
                              </div>

                              {/* Lists in Space */}
                              {space.lists.filter(list => !recentListIdsSet.has(list.id)).map(list => (
                                <SelectItem key={`space-${space.id}-list-${list.id}`} value={list.id} className="text-xs pl-8">
                                  {list.name}
                                </SelectItem>
                              ))}

                              {/* Folders in Space */}
                              {Array.from(space.folders.values()).map(folder => (
                                <React.Fragment key={`space-${space.id}-folder-${folder.id}`}>
                                  <div className="px-2 py-1.5 pl-8 text-[11px] font-medium text-zinc-500 flex items-center gap-2">
                                    <Folder className="w-3.5 h-3.5" />
                                    {folder.name}
                                  </div>
                                  {folder.lists.filter(list => !recentListIdsSet.has(list.id)).map(list => (
                                    <SelectItem key={`space-${space.id}-folder-${folder.id}-list-${list.id}`} value={list.id} className="text-xs pl-12 border-l-2 border-transparent hover:border-zinc-200 ml-4">
                                      {list.name}
                                    </SelectItem>
                                  ))}
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          ))}

                          {/* 4. Orphaned/Flat Lists (Projects, Teams, or Fallback) - FIXED: Use prefixed keys */}
                          {hierarchy.orphaned.filter(l => !recentListIdsSet.has(l.id)).length > 0 && (
                            <>
                              {hierarchy.spaces.length > 0 && <Separator className="my-1" />}
                              <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-tighter">
                                Lists
                              </div>
                              {hierarchy.orphaned.filter(l => !recentListIdsSet.has(l.id)).map((l) => (
                                <SelectItem key={`orphaned-${l.id}`} value={l.id} className="text-xs pl-8">
                                  {l.name}
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {/* Fallback if no rich data but propLists exist (Or if everything was empty) - FIXED: Use prefixed keys */}
                          {listsData?.items?.length === 0 && lists.length > 0 && (
                            lists.map((l) => (
                              <SelectItem key={`fallback-${l.id}`} value={l.id} className="text-xs">
                                {l.name}
                              </SelectItem>
                            ))
                          )}

                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                {/* Context Badge */}
                <div className="hidden sm:flex text-[10px] text-zinc-400 font-medium bg-zinc-50 px-2 py-1 rounded border border-zinc-100 uppercase tracking-wide">
                  {context} • {context === 'PROJECT' ? 'Project' : context === 'SPACE' ? 'Space' : 'General'}
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
                      <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">Upload attachments</h3>
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
                  <Button variant="ghost" type="button" onClick={() => handleOpenChange(false)} disabled={isSubmitting} className="text-zinc-600 hover:text-zinc-900">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 min-w-[150px] shadow-sm">
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