'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyDescriptionEditor } from '@/entities/shared/components/LazyDescriptionEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  CalendarIcon, UserIcon, FolderIcon, ListIcon, CheckCircle2, Target, FileText,
  GitBranch, Flag, Monitor, Hash, LayoutGrid, Calendar as CalendarLucide, CircleSlash
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AssigneeSelector } from './AssigneeSelector';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TaskCalendar } from './TaskCalendar';
import { TaskTypeIcon } from './TaskTypeIcon';
import { TaskStatusPopover } from './TaskStatusPopover';
import { TaskPickerPopover } from './TaskPickerPopover';

// Utility type for common props
interface SelectOption { id: string; name: string; color?: string; type?: string; image?: string | null } // Added color/type for statuses, image for assignees

type TaskContext = 'SPACE' | 'PROJECT' | 'TEAM' | 'GENERAL'
interface TaskDetailsFormProps {
  context: TaskContext;
  contextId?: string;
  users: SelectOption[];
  projects?: SelectOption[];
  teams?: SelectOption[];
  lists?: SelectOption[];
  spaces?: SelectOption[];
  currentTaskId?: string;
  workspaceId?: string;
  availableStatuses?: SelectOption[];
  onAddStatus?: () => void;
}

export function TaskDetailsForm({
  context,
  contextId,
  users,
  projects = [],
  teams = [],
  lists = [],
  spaces = [],
  currentTaskId,
  workspaceId,
  availableStatuses = [],
  onAddStatus
}: TaskDetailsFormProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const [parentPickerOpen, setParentPickerOpen] = React.useState(false);
  // Removed isCreateListOpen state


  const statusId = watch('statusId'); // Changed from status to statusId
  const priority = watch('priority');
  const dueDate = watch('dueDate');

  // Find selected status object for color display
  const selectedStatus = availableStatuses.find(s => s.id === statusId);

  // ... (keeping existing useEffects and parentTasks query logic same as original, assuming logic is fine)
  // Fetch available parent tasks
  const { data: parentTasksData } = trpc.task.list.useQuery(
    {
      workspaceId: workspaceId || undefined,
      scope: 'all',
      pageSize: 100,
      includeRelations: false,
    },
    {
      enabled: !!workspaceId,
    }
  );

  const availableParentTasks = React.useMemo(() => {
    if (!parentTasksData?.items) return [];
    return parentTasksData.items
      .filter((task) => !task.parentId && task.id !== currentTaskId)
      .map((task) => ({ id: task.id, name: task.title }));
  }, [parentTasksData, currentTaskId]);

  // Fetch task types
  const { data: taskTypes } = trpc.task.listTaskTypes.useQuery(
    { workspaceId: workspaceId || undefined },
    { enabled: !!workspaceId }
  );

  // Set default task type if available and not set
  React.useEffect(() => {
    const currentTypeId = watch('taskTypeId');
    if (taskTypes && taskTypes.length > 0 && !currentTypeId) {
      const defaultType = taskTypes.find(t => t.isDefault) || taskTypes[0];
      if (defaultType) {
        setValue('taskTypeId', defaultType.id);
      }
    }
  }, [taskTypes, setValue, watch]);

  React.useEffect(() => {
    if (context === 'PROJECT' && contextId) setValue('projectId', contextId);
    if (context === 'TEAM' && contextId) setValue('teamId', contextId);
    if (context === 'SPACE' && contextId) setValue('spaceId', contextId);
  }, [context, contextId, setValue]);

  return (
    <div className="flex flex-col h-full">
      {/* Main Content Area */}
      <div className="flex-1 space-y-4">
        {/* Title Input - Large & Clean */}
        <div className="relative group">
          <input
            id="title"
            placeholder="Task title"
            {...register('title')}
            className={cn(
              "w-full text-lg font-semibold border border-transparent focus:border-zinc-200 outline-none shadow-none px-3 -ml-3 placeholder:text-zinc-400 h-auto py-2 bg-transparent transition-all rounded-md",
              errors.title ? 'text-red-900 placeholder:text-red-300' : 'text-zinc-900'
            )}
            autoFocus
          />
          {errors.title && (
            <p className="text-xs text-red-600 absolute bottom-0 left-0 translate-y-full">
              {errors.title.message?.toString()}
            </p>
          )}
        </div>

        {/* Description - Rich editor (ClickUp-style) */}
        <div className="min-h-[100px] overflow-hidden bg-white">
          <LazyDescriptionEditor
            minHeight={280}
            content={watch('description') || ''}
            onChange={(value) => setValue('description', value, { shouldDirty: true, shouldTouch: true })}
            editable={true}
            workspaceId={workspaceId}
            spaceId={watch('spaceId')}
            projectId={watch('projectId')}
          />
        </div>
      </div>

      {/* Properties Toolbar - Horizontal Layout */}
      <div className="mt-4 pt-4 border-t border-zinc-100">
        <div className="flex flex-wrap items-center gap-2">

          {/* Status Pill */}
          <TaskStatusPopover
            task={{
              id: currentTaskId || "new",
              statusId: statusId || (availableStatuses.length > 0 ? availableStatuses[0].id : ''),
              taskType: taskTypes?.find(t => t.id === watch('taskTypeId'))
            }}
            availableStatuses={availableStatuses}
            availableTaskTypes={taskTypes || []}
            onUpdateTask={(_, data) => {
              if (data.statusId) setValue('statusId', data.statusId, { shouldDirty: true, shouldTouch: true });
            }}
            hideTaskTypeTab={true}
          >
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 px-2.5 rounded-md text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 cursor-pointer transition-all text-zinc-700 outline-none focus:outline-none w-auto min-w-[100px]"
              title="Edit status"
            >
              <span className="h-1.5 w-1.5 rounded-full ring-2 ring-transparent" style={{ backgroundColor: selectedStatus?.color || "#94A3B8" }} />
              {selectedStatus?.name || "Status"}
            </button>
          </TaskStatusPopover>

          {/* Task Type Pill */}
          {(() => {
            const selected = taskTypes?.find(t => t.id === watch('taskTypeId'));
            return (
              <TaskStatusPopover
                task={{
                  id: currentTaskId || "new",
                  statusId: statusId || (availableStatuses.length > 0 ? availableStatuses[0].id : ''),
                  taskType: selected
                }}
                availableStatuses={availableStatuses}
                availableTaskTypes={taskTypes || []}
                onUpdateTask={(_, data) => {
                  if (data.taskTypeId) {
                    setValue('taskTypeId', data.taskTypeId, { shouldDirty: true, shouldTouch: true });
                    const typeName = taskTypes?.find(t => t.id === data.taskTypeId)?.name;
                    if (typeName && ['TASK', 'MILESTONE', 'FORM_RESPONSE', 'MEETING_NOTE'].includes(typeName.toUpperCase())) {
                      setValue('taskType', typeName.toUpperCase());
                    }
                  }
                }}
                hideStatusTab={true}
              >
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1.5 px-2.5 rounded-md text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 cursor-pointer transition-all text-zinc-700 outline-none focus:outline-none w-auto min-w-[100px]"
                  title="Edit task type"
                >
                  <TaskTypeIcon type={selected} className="h-3 w-3" />
                  {selected?.name || "Type"}
                </button>
              </TaskStatusPopover>
            );
          })()}

          {/* Priority Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-auto min-w-[90px] border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium transition-all text-zinc-700"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <div className={cn("flex items-center gap-1.5",
                    priority === 'URGENT' ? "text-red-500" :
                      priority === 'HIGH' ? "text-orange-500" :
                        priority === 'NORMAL' ? "text-blue-500" :
                          priority === 'LOW' ? "text-zinc-400" : "text-zinc-400"
                  )}>
                    <Flag className="h-3 w-3 fill-current" />
                  </div>
                  <span>{priority ? priority.charAt(0) + priority.slice(1).toLowerCase() : "Priority"}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 z-[200]">
              <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setValue('priority', 'URGENT', { shouldDirty: true, shouldTouch: true })}>
                <Flag className="h-3 w-3 mr-2 text-red-600 fill-current" /> Urgent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setValue('priority', 'HIGH', { shouldDirty: true, shouldTouch: true })}>
                <Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" /> High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setValue('priority', 'NORMAL', { shouldDirty: true, shouldTouch: true })}>
                <Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" /> Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setValue('priority', 'LOW', { shouldDirty: true, shouldTouch: true })}>
                <Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" /> Low
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setValue('priority', null, { shouldDirty: true, shouldTouch: true })}>
                <CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assignee Pill */}
          <div className="h-7 flex items-center">
            <AssigneeSelector
              users={users}
              teams={teams}
              workspaceId={workspaceId}
              variant="default"
            />
          </div>

          {/* Due Date Pill */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 w-auto border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium transition-all",
                  dueDate ? "text-zinc-700" : "text-zinc-500"
                )}
              >
                <CalendarLucide className="h-3 w-3 mr-1.5 opacity-70" />
                {dueDate ? new Date(dueDate as any).toLocaleDateString() : "Due date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
              <TaskCalendar
                startDate={watch('startDate') ? new Date(watch('startDate')) : undefined}
                endDate={dueDate ? new Date(dueDate as any) : undefined}
                onStartDateChange={(date) => setValue('startDate', date ?? null, { shouldDirty: true, shouldTouch: true })}
                onEndDateChange={(date) => setValue('dueDate', date ?? null, { shouldDirty: true, shouldTouch: true })}
              />
              {(dueDate || watch('startDate')) && (
                <div className="p-2 border-t border-zinc-100 bg-zinc-50/50">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-xs text-zinc-600 hover:text-zinc-900 h-8"
                    onClick={() => {
                      setValue('dueDate', null, { shouldDirty: true, shouldTouch: true });
                      setValue('startDate', null, { shouldDirty: true, shouldTouch: true });
                    }}
                  >
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Parent Task Pill */}
          {workspaceId && (
            <div className="flex items-center">
              <TaskPickerPopover
                open={parentPickerOpen}
                onOpenChange={setParentPickerOpen}
                taskId={currentTaskId || ""}
                workspaceId={workspaceId}
                onSelect={(id) => setValue('parentId', id, { shouldDirty: true, shouldTouch: true })}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 w-auto max-w-[200px] border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium transition-all",
                      watch('parentId') ? "text-zinc-700" : "text-zinc-500"
                    )}
                  >
                    <GitBranch className="h-3 w-3 mr-1.5 opacity-70" />
                    <span className="truncate">
                      {watch('parentId')
                        ? availableParentTasks?.find(t => t.id === watch('parentId'))?.name || "Parent"
                        : "Parent"}
                    </span>
                  </Button>
                }
              />
              {watch('parentId') && (
                <button
                  type="button"
                  onClick={() => setValue('parentId', null, { shouldDirty: true, shouldTouch: true })}
                  className="ml-1 text-zinc-400 hover:text-zinc-700 p-0.5 rounded-md hover:bg-zinc-100"
                  title="Clear parent"
                >
                  <CircleSlash className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
