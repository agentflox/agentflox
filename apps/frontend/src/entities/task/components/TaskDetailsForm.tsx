'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DescriptionEditor } from '@/entities/shared/components/DescriptionEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarIcon, UserIcon, FolderIcon, ListIcon, CheckCircle2, Target, FileText,
  GitBranch, Flag, Monitor, Hash, LayoutGrid, Calendar as CalendarLucide
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AssigneeSelector } from './AssigneeSelector';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TaskCalendar } from './TaskCalendar';
import { TaskTypeIcon } from './TaskTypeIcon';


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
          <Input
            id="title"
            placeholder="Task title"
            {...register('title')}
            className={cn(
              "text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-400 h-auto py-2 bg-transparent transition-all",
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
        <div className="min-h-[120px] border border-zinc-200 rounded-md overflow-hidden bg-white">
          <DescriptionEditor
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
          <Select
            value={statusId || (availableStatuses.length > 0 ? availableStatuses[0].id : '')}
            onValueChange={(val) => setValue('statusId', val, { shouldDirty: true, shouldTouch: true })}
          >
            <SelectTrigger className="h-7 w-auto min-w-[100px] border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium shadow-sm transition-all text-zinc-700">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-1.5 w-1.5 rounded-full ring-2 ring-transparent"
                  style={{ backgroundColor: selectedStatus?.color || "#94A3B8" }}
                />
                <SelectValue placeholder="Status">
                  {selectedStatus?.name || "Status"}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.length > 0 ? (
                availableStatuses.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || "#94A3B8" }} />
                      <span>{s.name}</span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled className="text-xs">No statuses available</SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* Task Type Pill */}
          {(() => {
            const selected = taskTypes?.find(t => t.id === watch('taskTypeId'));
            return (
              <Select
                value={watch('taskTypeId') || ''}
                onValueChange={(val) => {
                  setValue('taskTypeId', val, { shouldDirty: true, shouldTouch: true });
                  // Also update legacy taskType for compatibility if needed (optional)
                  const typeName = taskTypes?.find(t => t.id === val)?.name;
                  if (typeName && ['TASK', 'MILESTONE', 'FORM_RESPONSE', 'MEETING_NOTE'].includes(typeName.toUpperCase())) {
                    setValue('taskType', typeName.toUpperCase());
                  }
                }}
              >
                <SelectTrigger className="h-7 w-auto min-w-[100px] border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium shadow-sm transition-all text-zinc-700">
                  <div className="flex items-center gap-1.5">
                    <TaskTypeIcon
                      type={selected}
                      className="h-3 w-3"
                    />
                    <SelectValue placeholder="Type">
                      {selected?.name || "Type"}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {taskTypes?.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <TaskTypeIcon type={t} className="h-3 w-3" />
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}

          {/* Priority Pill */}
          <Select
            value={priority || 'NORMAL'}
            onValueChange={(val) => setValue('priority', val, { shouldDirty: true, shouldTouch: true })}
          >
            <SelectTrigger className="h-7 w-auto min-w-[90px] border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium shadow-sm transition-all text-zinc-700">
              <div className="flex items-center gap-1.5">
                <Flag className={cn("h-3 w-3",
                  priority === 'URGENT' ? "text-red-500" :
                    priority === 'HIGH' ? "text-orange-500" :
                      priority === 'LOW' ? "text-blue-400" : "text-zinc-400"
                )} />
                <SelectValue placeholder="Priority" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="URGENT" className="text-xs">Urgent</SelectItem>
              <SelectItem value="HIGH" className="text-xs">High</SelectItem>
              <SelectItem value="NORMAL" className="text-xs">Normal</SelectItem>
              <SelectItem value="LOW" className="text-xs">Low</SelectItem>
            </SelectContent>
          </Select>

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
                  "h-7 w-auto border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium shadow-sm transition-all",
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
          {workspaceId && availableParentTasks.length > 0 && (
            <Select
              value={watch('parentId') || 'none'}
              onValueChange={(val) => setValue('parentId', val === 'none' ? null : val, { shouldDirty: true, shouldTouch: true })}
            >
              <SelectTrigger className="h-7 w-auto max-w-[150px] border-zinc-200 bg-white hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium shadow-sm transition-all text-zinc-700">
                <div className="flex items-center gap-1.5 truncate">
                  <GitBranch className="h-3 w-3 text-zinc-400" />
                  <SelectValue placeholder="Parent" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">No parent</SelectItem>
                {availableParentTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id} className="text-xs">
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

        </div>
      </div>
    </div>
  );
}
