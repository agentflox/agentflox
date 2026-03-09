'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusIcon } from 'lucide-react'
import { TaskContextType } from './TaskView'
import { trpc } from '@/lib/trpc'
import { TaskCreationModal } from './TaskCreationModal'
import { TaskCard } from './TaskCard'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type Option = { id: string; name: string }

interface TaskKanbanViewProps {
  context: TaskContextType
  contextId?: string
  workspaceId?: string
  users: Option[]
  projects?: Option[]
  teams?: Option[]
  lists?: Option[]
  spaces?: Option[]
}

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  OPEN: { label: 'To Do', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  COMPLETED: { label: 'Done', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  BLOCKED: { label: 'Blocked', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
}

export function TaskKanbanView({
  context,
  contextId,
  workspaceId,
  users,
  projects = [],
  teams = [],
  lists = [],
  spaces = [],
}: TaskKanbanViewProps) {
  const [selectedGroup, setSelectedGroup] = React.useState<string | undefined>(undefined)

  const taskQueryInput = React.useMemo(() => {
    if (context === 'PROJECT') return { projectId: contextId, includeRelations: true }
    if (context === 'TEAM') return { teamId: contextId, includeRelations: true }
    if (context === 'SPACE') return { spaceId: contextId, includeRelations: true }
    if (context === 'GENERAL') return { workspaceId, includeRelations: true }
    return { includeRelations: true }
  }, [context, contextId, workspaceId])

  const { data: tasksData, isLoading } = trpc.task.list.useQuery(taskQueryInput)

  const groups = React.useMemo(() => {
    const byList: Record<string, any[]> = {}
    const taskItems = (tasksData as any)?.items
    const items: any[] = Array.isArray(taskItems) ? taskItems : []
    items.forEach((t: any) => {
      const key = t.list?.name || t.list?.id || 'Ungrouped'
      byList[key] = byList[key] || []
      byList[key].push(t)
    })
    return byList
  }, [tasksData])

  const tasksByStatus = React.useMemo(() => {
    const tasks = selectedGroup ? (groups[selectedGroup] || []) : (tasksData as any)?.items || []
    const byStatus: Record<TaskStatus, any[]> = {
      OPEN: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      BLOCKED: [],
    }
    tasks.forEach((task: any) => {
      const status = (task.status?.name || task.statusId || task.status || 'OPEN') as TaskStatus
      if (byStatus[status]) {
        byStatus[status].push(task)
      } else {
        byStatus.OPEN.push(task)
      }
    })
    return byStatus
  }, [tasksData, selectedGroup, groups])

  const getListId = (groupName: string): string | undefined => {
    if (groupName === 'Ungrouped') return undefined
    const list = lists.find((l) => l.name === groupName || l.id === groupName)
    return list?.id
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    )
  }

  const statuses: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']

  return (
    <div className="space-y-6">
      {/* Group filter */}
      {Object.keys(groups).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Filter by group:</span>
          <Button
            variant={selectedGroup === undefined ? 'primary' : 'outline'}
            onClick={() => setSelectedGroup(undefined)}
            className="h-8 px-3 text-sm"
          >
            All Groups
          </Button>
          {Object.keys(groups).map((groupName) => (
            <Button
              key={groupName}
              variant={selectedGroup === groupName ? 'primary' : 'outline'}
              onClick={() => setSelectedGroup(groupName)}
              className="h-8 px-3 text-sm"
            >
              {groupName}
            </Button>
          ))}
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statuses.map((status) => {
          const config = STATUS_CONFIG[status]
          const tasks = tasksByStatus[status] || []
          const taskCount = tasks.length

          return (
            <div
              key={status}
              className={cn(
                'flex flex-col rounded-lg border-2 min-h-[600px] max-h-[800px]',
                config.bgColor
              )}
            >
              {/* Column header */}
              <div className="flex items-center justify-between p-4 border-b-2 border-current/20">
                <div className="flex items-center gap-2">
                  <h3 className={cn('font-semibold text-base', config.color)}>{config.label}</h3>
                  <Badge variant="secondary" className={cn('bg-white/50', config.color)}>
                    {taskCount}
                  </Badge>
                </div>
                {selectedGroup && (
                  <TaskCreationModal
                    context={context}
                    contextId={contextId}
                    workspaceId={workspaceId}
                    users={users}
                    projects={projects}
                    teams={teams}
                    lists={lists}
                    spaces={spaces}
                    defaultListId={getListId(selectedGroup)}
                    defaultStatus={status}
                    trigger={
                      <Button variant="ghost" className="h-7 w-7 p-0">
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </div>

              {/* Tasks */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className={cn('text-center py-8 text-sm', config.color)}>
                      No tasks
                    </div>
                  ) : (
                    tasks.map((task: any) => (
                      <div key={task.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                        <TaskCard item={task} />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>

      {/* Global create task button */}
      {!selectedGroup && (
        <div className="flex justify-center">
          <TaskCreationModal
            context={context}
            contextId={contextId}
            workspaceId={workspaceId}
            users={users}
            projects={projects}
            teams={teams}
            lists={lists}
            spaces={spaces}
          />
        </div>
      )}
    </div>
  )
}

