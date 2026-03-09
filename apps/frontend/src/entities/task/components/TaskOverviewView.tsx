'use client'

import * as React from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusIcon, User, Calendar, Folder, Users } from 'lucide-react'
import { TaskContextType } from './TaskView'
import { trpc } from '@/lib/trpc'
import { TaskCreationModal } from './TaskCreationModal'
import { TaskCard } from './TaskCard'
import { cn } from '@/lib/utils'

type Option = { id: string; name: string }

interface TaskOverviewViewProps {
  context: TaskContextType
  contextId?: string
  workspaceId?: string
  users: Option[]
  projects?: Option[]
  teams?: Option[]
  lists?: Option[]
  spaces?: Option[]
}

export function TaskOverviewView({
  context,
  contextId,
  workspaceId,
  users,
  projects = [],
  teams = [],
  lists = [],
  spaces = [],
}: TaskOverviewViewProps) {
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

  if (Object.keys(groups).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-sm text-muted-foreground">No tasks found</div>
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
    )
  }

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={Object.keys(groups).slice(0, 3)} className="w-full">
        {Object.entries(groups).map(([groupName, items]) => {
          const listId = getListId(groupName)
          const taskCount = items.length

          return (
            <AccordionItem key={groupName} value={groupName} className="border rounded-lg mb-4 px-4 bg-white shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pb-4 space-y-4">
                  {/* Header with create task button */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Tasks in this group</span>
                    </div>
                    <TaskCreationModal
                      context={context}
                      contextId={contextId}
                      workspaceId={workspaceId}
                      users={users}
                      projects={projects}
                      teams={teams}
                      lists={lists}
                      spaces={spaces}
                      defaultListId={listId}
                      trigger={
                        <Button variant="outline" className="h-8 px-3 text-sm w-auto">
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      }
                    />
                  </div>

                  {/* Tasks grid */}
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No tasks in this group
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((task: any) => (
                        <TaskCard key={task.id} item={task} />
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

