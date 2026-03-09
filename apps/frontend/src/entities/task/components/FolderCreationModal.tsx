'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Folder as FolderIcon } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { TaskContextType } from './TaskView'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface FolderCreationModalProps {
    context: TaskContextType
    contextId?: string
    workspaceId?: string
    parentFolderId?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    onFolderCreated?: (folder: any) => void
}

export function FolderCreationModal({ context, contextId, workspaceId, parentFolderId, open: controlledOpen, onOpenChange: setControlledOpen, trigger, onFolderCreated }: FolderCreationModalProps) {
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
    const parentFolderQuery = trpc.folder.get.useQuery({ id: parentFolderId || '' }, { enabled: !!parentFolderId })

    const resolvedWorkspaceId =
        workspaceId ||
        projectQuery.data?.workspaceId ||
        spaceQuery.data?.workspace?.id ||
        teamQuery.data?.workspaceId ||
        undefined

    // Get the current space name for display
    const spaceName = spaceQuery.data?.name || teamQuery.data?.name || projectQuery.data?.name || 'Space'
    const parentFolderName = parentFolderQuery.data?.name || undefined

    const createFolder = trpc.folder.create.useMutation({
        onSuccess: async (_data, variables) => {
            await utils.folder.byContext.invalidate({
                workspaceId: variables.workspaceId,
                projectId: variables.projectId ?? undefined,
                teamId: variables.teamId ?? undefined,
                spaceId: variables.spaceId ?? undefined,
                parentFolderId: variables.parentFolderId ?? undefined,
            })
        },
    })

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload: any = {
            name: name.trim(),
            description: description.trim() || undefined,
            isPrivate: isPrivate,
        }

        // Add context IDs - at least one must be provided
        if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId
        if (context === 'PROJECT' && contextId) payload.projectId = contextId
        if (context === 'TEAM' && contextId) payload.teamId = contextId
        if (context === 'SPACE' && contextId) payload.spaceId = contextId
        if (parentFolderId) payload.parentFolderId = parentFolderId

        // Ensure at least one context is provided
        if (!payload.workspaceId && !payload.projectId && !payload.teamId && !payload.spaceId) {
            return // Validation will be handled by tRPC
        }

        const newFolder = await createFolder.mutateAsync(payload)
        if (onFolderCreated) {
            onFolderCreated(newFolder)
        }
        setIsOpen(false)
        setName('')
        setDescription('')
        setIsPrivate(false)
    }

    const isSubmitting = createFolder.isPending
    const isDisabled = !name.trim() || (!resolvedWorkspaceId && !contextId)

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="max-w-24" variant="outline">
                        <FolderIcon className="mr-2 h-4 w-4" />
                        Create Folder
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Create Folder</DialogTitle>
                    <DialogDescription>
                        Organize your lists into folders for better structure and management.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Q1 Projects, Marketing, Development"
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
                            placeholder="Tell us a bit about your Folder (optional)"
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
                                    <FolderIcon className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder={parentFolderName ? `${spaceName} / ${parentFolderName}` : spaceName} />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={contextId || 'default'}>{parentFolderName ? `${spaceName} / ${parentFolderName}` : spaceName}</SelectItem>
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

                    <div className="flex items-center justify-end pt-4">
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
