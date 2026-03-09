'use client'

import * as React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { FolderPlusIcon } from 'lucide-react'
import { TaskContextType } from './TaskView'
import { trpc } from '@/lib/trpc'
import { ListCreationModal } from './ListCreationModal'

interface ListGroupViewProps {
  context: TaskContextType
  contextId?: string
  workspaceId?: string
}

export function ListGroupView({ context, contextId, workspaceId }: ListGroupViewProps) {
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
      const key = t.list?.name || 'Ungrouped'
      byList[key] = byList[key] || []
      byList[key].push(t)
    })
    return byList
  }, [tasksData])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Groups</h2>
        <ListCreationModal context={context} contextId={contextId} workspaceId={workspaceId} />
      </div>
      {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {!isLoading && Object.keys(groups).length === 0 && (
        <div className="text-sm text-muted-foreground">No groups found</div>
      )}
      {!isLoading && Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName} className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-4 py-2 border-b font-medium">{groupName}</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items as any[]).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.title}</TableCell>
                  <TableCell>{t.assignee?.name || ''}</TableCell>
                  <TableCell>{t.project?.name || ''}</TableCell>
                  <TableCell>{t.team?.name || ''}</TableCell>
                  <TableCell>{new Date(t.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}

