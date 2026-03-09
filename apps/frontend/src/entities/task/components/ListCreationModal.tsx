'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, FolderPlusIcon, Folder } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { TaskContextType } from './TaskView'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ListCreationModalProps {
  context: TaskContextType
  contextId?: string
  workspaceId?: string
  folderId?: string;
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onListCreated?: (list: any) => void
}

export function ListCreationModal({ context, contextId, workspaceId, folderId, open: controlledOpen, onOpenChange: setControlledOpen, trigger, onListCreated }: ListCreationModalProps) {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalIsOpen
  const setIsOpen = isControlled ? setControlledOpen! : setInternalIsOpen
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isPrivate, setIsPrivate] = React.useState(false)

  const utils = trpc.useUtils()

  const projectQuery = trpc.project.get.useQuery({ id: contextId || '' }, { enabled: context === 'PROJECT' && !!contextId && !workspaceId })
  const spaceQuery = trpc.space.get.useQuery({ id: contextId || '' }, { enabled: context === 'SPACE' && !!contextId && !workspaceId })
  const teamQuery = trpc.team.get.useQuery({ id: contextId || '' }, { enabled: context === 'TEAM' && !!contextId && !workspaceId })
  const folderQuery = trpc.folder.get.useQuery({ id: folderId || '' }, { enabled: !!folderId })

  const resolvedWorkspaceId =
    workspaceId ||
    projectQuery.data?.workspaceId ||
    spaceQuery.data?.workspace?.id ||
    teamQuery.data?.workspaceId ||
    undefined

  // Get the current space name for display
  const spaceName = spaceQuery.data?.name || teamQuery.data?.name || projectQuery.data?.name || 'Space'
  const folderName = folderQuery.data?.name || undefined

  const createList = trpc.list.create.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.list.byContext.invalidate({
        workspaceId: variables.workspaceId,
        projectId: variables.projectId ?? undefined,
        teamId: variables.teamId ?? undefined,
        spaceId: variables.spaceId ?? undefined,
        folderId: variables.folderId ?? undefined,
      })
    },
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = {
      name: name.trim(),
      description: description.trim() || undefined,
    }

    // Add context IDs - at least one must be provided
    if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId
    if (context === 'PROJECT' && contextId) payload.projectId = contextId
    if (context === 'TEAM' && contextId) payload.teamId = contextId
    if (context === 'SPACE' && contextId) payload.spaceId = contextId
    if (folderId) payload.folderId = folderId

    // Ensure at least one context is provided
    if (!payload.workspaceId && !payload.projectId && !payload.teamId && !payload.spaceId) {
      return // Validation will be handled by tRPC
    }

    const newList = await createList.mutateAsync(payload)
    if (onListCreated) {
      onListCreated(newList)
    }
    setIsOpen(false)
    setName('')
    setDescription('')
    setIsPrivate(false)
  }

  const isSubmitting = createList.isPending
  const isDisabled = !name.trim() || (!resolvedWorkspaceId && !contextId)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="max-w-24" variant="outline">
              <FolderPlusIcon className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create List</DialogTitle>
          <DialogDescription>
            All Lists are located within a Space. Lists can house any type of task.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Project, List of items, Campaign"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us a bit about your List (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="space-location">Location</Label>
            <Select value={contextId} disabled>
              <SelectTrigger id="space-location" className="h-11">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={folderName ? `${spaceName} / ${folderName}` : spaceName} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={contextId || 'default'}>{folderName ? `${spaceName} / ${folderName}` : spaceName}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="make-private" className="text-base font-medium">
                Make private
              </Label>
              <p className="text-sm text-muted-foreground">
                Only you and invited members have access
              </p>
            </div>
            <Switch
              id="make-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          <div className="flex items-center justify-center pt-4">
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
