'use client'

import * as React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X, UserIcon, Bot } from 'lucide-react'
import { TaskContextType } from './TaskView'
import { trpc } from '@/lib/trpc'
import { TaskCreationModal } from './TaskCreationModal'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { TaskTypeIcon } from './TaskTypeIcon'

type Option = { id: string; name: string }

type SortField = 'title' | 'assignee' | 'project' | 'team' | 'list' | 'status' | 'updatedAt'
type SortDirection = 'asc' | 'desc'

interface TaskTableViewProps {
  context: TaskContextType
  contextId?: string
  workspaceId?: string
  users: Option[]
  projects?: Option[]
  teams?: Option[]
  lists?: Option[]
  spaces?: Option[]
}

export function TaskTableView({
  context,
  contextId,
  workspaceId,
  users,
  projects = [],
  teams = [],
  lists = [],
  spaces = [],
}: TaskTableViewProps) {
  const [sortField, setSortField] = React.useState<SortField>('updatedAt')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')
  const [filters, setFilters] = React.useState<{
    assignee?: string
    project?: string
    team?: string
    list?: string
    status?: string
    search?: string
  }>({})

  const taskQueryInput = React.useMemo(() => {
    if (context === 'PROJECT') return { projectId: contextId, includeRelations: true }
    if (context === 'TEAM') return { teamId: contextId, includeRelations: true }
    if (context === 'SPACE') return { spaceId: contextId, includeRelations: true }
    if (context === 'GENERAL') return { workspaceId, includeRelations: true }
    return { includeRelations: true }
  }, [context, contextId, workspaceId])

  const { data: tasksData, isLoading } = trpc.task.list.useQuery(taskQueryInput)

  const filteredAndSortedTasks = React.useMemo(() => {
    const tasks = (tasksData as any)?.items || []
    let filtered = [...tasks]

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (t: any) =>
          t.title?.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      )
    }
    if (filters.assignee) {
      filtered = filtered.filter((t: any) => t.assignee?.id === filters.assignee)
    }
    if (filters.project) {
      filtered = filtered.filter((t: any) => t.project?.id === filters.project)
    }
    if (filters.team) {
      filtered = filtered.filter((t: any) => t.team?.id === filters.team)
    }
    if (filters.list) {
      filtered = filtered.filter((t: any) => t.list?.id === filters.list)
    }
    if (filters.status) {
      filtered = filtered.filter((t: any) => (t.status?.name || t.statusId || t.status || 'OPEN') === filters.status)
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      let aVal: any
      let bVal: any

      switch (sortField) {
        case 'title':
          aVal = a.title || ''
          bVal = b.title || ''
          break
        case 'assignee':
          aVal = a.assignee?.name || a.assignee?.email || ''
          bVal = b.assignee?.name || b.assignee?.email || ''
          break
        case 'project':
          aVal = a.project?.name || ''
          bVal = b.project?.name || ''
          break
        case 'team':
          aVal = a.team?.name || ''
          bVal = b.team?.name || ''
          break
        case 'list':
          aVal = a.list?.name || ''
          bVal = b.list?.name || ''
          break
        case 'status':
          aVal = a.status?.name || a.statusId || a.status || 'OPEN'
          bVal = b.status?.name || b.statusId || b.status || 'OPEN'
          break
        case 'updatedAt':
          aVal = new Date(a.updatedAt || 0).getTime()
          bVal = new Date(b.updatedAt || 0).getTime()
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [tasksData, filters, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length

  const clearFilters = () => {
    setFilters({})
  }

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-500/10 text-blue-600',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-600',
    COMPLETED: 'bg-emerald-500/10 text-emerald-600',
    BLOCKED: 'bg-red-500/10 text-red-600',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search tasks..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="max-w-sm"
          />
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={clearFilters} className="gap-2 h-8 px-3 text-sm">
              <X className="h-4 w-4" />
              Clear ({activeFiltersCount})
            </Button>
          )}
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
        />
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 h-8 px-3 text-sm">
              <Filter className="h-4 w-4" />
              Assignee
              {filters.assignee && <Badge variant="secondary" className="ml-1">1</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <Select
              value={filters.assignee || ''}
              onValueChange={(value) => setFilters({ ...filters, assignee: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All assignees</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PopoverContent>
        </Popover>

        {projects.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 h-8 px-3 text-sm">
                <Filter className="h-4 w-4" />
                Project
                {filters.project && <Badge variant="secondary" className="ml-1">1</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <Select
                value={filters.project || ''}
                onValueChange={(value) => setFilters({ ...filters, project: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>
        )}

        {teams.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 h-8 px-3 text-sm">
                <Filter className="h-4 w-4" />
                Team
                {filters.team && <Badge variant="secondary" className="ml-1">1</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <Select
                value={filters.team || ''}
                onValueChange={(value) => setFilters({ ...filters, team: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All teams</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>
        )}

        {lists.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 h-8 px-3 text-sm">
                <Filter className="h-4 w-4" />
                List
                {filters.list && <Badge variant="secondary" className="ml-1">1</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <Select
                value={filters.list || ''}
                onValueChange={(value) => setFilters({ ...filters, list: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All lists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All lists</SelectItem>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 h-8 px-3 text-sm">
              <Filter className="h-4 w-4" />
              Status
              {filters.status && <Badge variant="secondary" className="ml-1">1</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <Select
              value={filters.status || ''}
              onValueChange={(value) => setFilters({ ...filters, status: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 -ml-3 px-2 text-sm font-medium"
                  onClick={() => handleSort('title')}
                >
                  Title
                  {getSortIcon('title')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 -ml-3 px-2 text-sm font-medium"
                  onClick={() => handleSort('assignee')}
                >
                  Assignee
                  {getSortIcon('assignee')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 -ml-3 px-2 text-sm font-medium"
                  onClick={() => handleSort('project')}
                >
                  Project
                  {getSortIcon('project')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 -ml-3 px-2 text-sm font-medium"
                  onClick={() => handleSort('team')}
                >
                  Team
                  {getSortIcon('team')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 -ml-3 px-2 text-sm font-medium"
                  onClick={() => handleSort('list')}
                >
                  List
                  {getSortIcon('list')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 -ml-3 px-2 text-sm font-medium"
                  onClick={() => handleSort('status')}
                >
                  Status
                  {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-8 -ml-3 px-2 text-sm font-medium"
                  onClick={() => handleSort('updatedAt')}
                >
                  Updated
                  {getSortIcon('updatedAt')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedTasks.map((task: any) => (
                <TableRow key={task.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <TaskTypeIcon
                        type={task.taskTypeId || task.taskType?.id || task.taskType}
                        className="h-4 w-4"
                      />
                      {task.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {task.assignees && task.assignees.length > 0 ? (
                        <>
                          {task.assignees.map((assignee: any) => (
                            <Badge key={assignee.id} variant="secondary" className="text-xs flex items-center gap-1">
                              {assignee.user ? (
                                <>
                                  <UserIcon className="h-3 w-3" />
                                  {assignee.user.name || assignee.user.email || 'User'}
                                </>
                              ) : assignee.agent ? (
                                <>
                                  <Bot className="h-3 w-3" />
                                  {assignee.agent.name || 'Agent'}
                                </>
                              ) : null}
                            </Badge>
                          ))}
                        </>
                      ) : task.assignee ? (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {task.assignee.name || task.assignee.email || 'User'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unassigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{task.project?.name || '-'}</TableCell>
                  <TableCell>{task.team?.name || '-'}</TableCell>
                  <TableCell>{task.list?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'text-xs',
                        statusColors[task.status?.name || task.statusId || task.status || 'OPEN'] || 'bg-muted text-muted-foreground'
                      )}
                    >
                      {task.status?.name || task.statusId || task.status || 'OPEN'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(task.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedTasks.length} of {(tasksData as any)?.items?.length || 0} tasks
      </div>
    </div>
  )
}

