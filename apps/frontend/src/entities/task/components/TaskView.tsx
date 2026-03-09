'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlusIcon, FolderPlusIcon, LayoutGrid, Columns3, Table as TableIcon } from 'lucide-react'
import { TaskOverviewView } from './TaskOverviewView'
import { TaskKanbanView } from './TaskKanbanView'
import { TaskTableView } from './TaskTableView'
import { ListCreationModal } from './ListCreationModal'
import { TaskCreationModal } from './TaskCreationModal'
import { trpc } from '@/lib/trpc'

export type TaskContextType = 'SPACE' | 'PROJECT' | 'TEAM' | 'GENERAL'

type Option = { id: string; name: string }

type ViewMode = 'overview' | 'kanban' | 'table'

interface TaskViewProps {
  context: TaskContextType
  contextId?: string
  workspaceId?: string
}

export function TaskView({ context, contextId, workspaceId }: TaskViewProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('overview')
  const [users, setUsers] = React.useState<Option[]>([])
  const [projects, setProjects] = React.useState<Option[]>([])
  const [teams, setTeams] = React.useState<Option[]>([])
  const [lists, setLists] = React.useState<Option[]>([])
  const [spaces, setSpaces] = React.useState<Option[]>([])
  const [effectiveWorkspaceId, setEffectiveWorkspaceId] = React.useState<string | undefined>(workspaceId)

  const spaceData = trpc.space.get.useQuery({ id: context === 'SPACE' ? contextId || '' : '' }, { enabled: context === 'SPACE' && !!contextId })
  const projectParticipants = trpc.project.getParticipants.useQuery({ projectId: contextId || '' }, { enabled: context === 'PROJECT' && !!contextId })
  const teamParticipants = trpc.team.getParticipants.useQuery({ teamId: contextId || '' }, { enabled: context === 'TEAM' && !!contextId })
  const projectData = trpc.project.get.useQuery({ id: contextId || '' }, { enabled: context === 'PROJECT' && !!contextId })
  const teamData = trpc.team.get.useQuery({ id: contextId || '' }, { enabled: context === 'TEAM' && !!contextId })
  const workspaceData = trpc.workspace.get.useQuery(
    { id: effectiveWorkspaceId || '' },
    { enabled: context === 'GENERAL' && !!effectiveWorkspaceId }
  )



  const listQueryInput = React.useMemo(() => {
    if (!effectiveWorkspaceId) return undefined
    if (context === 'PROJECT') return { workspaceId: effectiveWorkspaceId, projectId: contextId }
    if (context === 'TEAM') return { workspaceId: effectiveWorkspaceId, teamId: contextId }
    if (context === 'SPACE') return { workspaceId: effectiveWorkspaceId, spaceId: contextId }
    return { workspaceId: effectiveWorkspaceId }
  }, [context, contextId, effectiveWorkspaceId])

  const { data: listQueryData } = trpc.list.byContext.useQuery(listQueryInput!, {
    enabled: !!listQueryInput,
  })

  React.useEffect(() => {
    if (spaceData.data && context === 'SPACE') {
      setUsers((spaceData.data.members || []).map((m: any) => ({ id: m.user.id, name: m.user.name || m.user.email })))
      setProjects((spaceData.data.projects || []).map((p: any) => ({ id: p.id, name: p.name })))
      setTeams((spaceData.data.teams || []).map((t: any) => ({ id: t.id, name: t.name })))
      setEffectiveWorkspaceId(spaceData.data.workspace?.id || spaceData.data.workspaceId || effectiveWorkspaceId)
    }
  }, [spaceData.data, context, effectiveWorkspaceId])

  React.useEffect(() => {
    if (projectParticipants.data && context === 'PROJECT') {
      setUsers((projectParticipants.data.users || []).map((u: any) => ({ id: u.id, name: u.name || u.email })))
      setTeams((projectParticipants.data.teams || []).map((t: any) => ({ id: t.id, name: t.name })))
    }
  }, [projectParticipants.data, context])

  React.useEffect(() => {
    if (projectData.data && context === 'PROJECT') {
      setEffectiveWorkspaceId(projectData.data.workspaceId || effectiveWorkspaceId)
    }
  }, [projectData.data, context, effectiveWorkspaceId])

  React.useEffect(() => {
    if (teamParticipants.data && context === 'TEAM') {
      setUsers((teamParticipants.data.users || []).map((u: any) => ({ id: u.id, name: u.name || u.email })))
    }
  }, [teamParticipants.data, context])

  React.useEffect(() => {
    if (teamData.data && context === 'TEAM') {
      setEffectiveWorkspaceId(teamData.data.workspaceId || effectiveWorkspaceId)
    }
  }, [teamData.data, context, effectiveWorkspaceId])

  React.useEffect(() => {
    if (workspaceData.data && context === 'GENERAL') {
      setEffectiveWorkspaceId(workspaceData.data.id || effectiveWorkspaceId)
      setSpaces((workspaceData.data.spaces || []).map((s: any) => ({ id: s.id, name: s.name })))
      setProjects((workspaceData.data.projects || []).map((p: any) => ({ id: p.id, name: p.name })))
      setTeams((workspaceData.data.teams || []).map((t: any) => ({ id: t.id, name: t.name })))
      setUsers((workspaceData.data.members || []).map((m: any) => ({ id: m.user.id, name: m.user.name || m.user.email })))
    }
  }, [workspaceData.data, context, effectiveWorkspaceId])

  React.useEffect(() => {
    if (listQueryData?.items) {
      setLists(listQueryData.items.map((l: any) => ({ id: l.id, name: l.name })))
    }
  }, [listQueryData?.items])

  const commonProps = {
    context,
    contextId,
    workspaceId: effectiveWorkspaceId,
    users,
    projects,
    teams,
    lists,
    spaces,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with actions and view switcher */}
      <div className="flex items-center justify-between">
        {/* Left side: Action buttons */}
        <div className="flex items-center gap-3">
          <ListCreationModal context={context} contextId={contextId} workspaceId={effectiveWorkspaceId} />
          <TaskCreationModal
            context={context}
            contextId={contextId}
            workspaceId={effectiveWorkspaceId}
            users={users}
            projects={projects}
            teams={teams}
            lists={lists}
            spaces={spaces}
          />
        </div>

        {/* Right side: View mode switcher */}
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {viewMode === 'overview' && <LayoutGrid className="h-4 w-4" />}
                  {viewMode === 'kanban' && <Columns3 className="h-4 w-4" />}
                  {viewMode === 'table' && <TableIcon className="h-4 w-4" />}
                  <span className="capitalize">{viewMode}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span>Overview</span>
                </div>
              </SelectItem>
              <SelectItem value="kanban">
                <div className="flex items-center gap-2">
                  <Columns3 className="h-4 w-4" />
                  <span>Kanban</span>
                </div>
              </SelectItem>
              <SelectItem value="table">
                <div className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  <span>Table</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View content */}
      {viewMode === 'overview' && <TaskOverviewView {...commonProps} />}
      {viewMode === 'kanban' && <TaskKanbanView {...commonProps} />}
      {viewMode === 'table' && <TaskTableView {...commonProps} />}
    </div>
  )
}

