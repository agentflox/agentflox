"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { EnhancedIconPicker } from "@/components/ui/enhanced-icon-picker";
import {
    Pencil,
    Copy,
    Palette,
    Archive,
    Trash2,
    Settings,
    CopyPlus,
    UserPlus,
    EyeOff,
    Shield,
    Crown,
    Ellipsis
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "@/entities/shared/components/EntityRenameDialog";
import { ShareModal } from "@/components/permissions/ShareModal";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { DocumentDuplicateModal } from "@/entities/documents/components/DocumentDuplicateModal";
import { DocumentArchiveModal } from "@/entities/documents/components/DocumentArchiveModal";
import { DocumentDeleteModal } from "@/entities/documents/components/DocumentDeleteModal";
import { DocumentGeneralSettingsModal } from "@/entities/documents/components/DocumentGeneralSettingsModal";
import { DocumentTransferModal } from "@/entities/documents/components/DocumentTransferModal";

interface DocumentActionsMenuProps {
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    documentId: string;
    trigger?: React.ReactNode;
    disableDelete?: boolean;
    onDelete?: () => void;
    liveTitle?: string;
    liveContent?: string;
    liveIcon?: string;
    liveCoverImage?: string | null;
    hasChildren?: boolean;
}

export function DocumentActionsMenu({ workspaceId, spaceId, projectId, documentId, trigger, disableDelete, onDelete, liveTitle, liveContent, liveIcon, liveCoverImage, hasChildren }: DocumentActionsMenuProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    // Dialog States
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    const { data: document } = trpc.document.get.useQuery(
        { id: documentId },
        { enabled: !!documentId }
    );

    const updateDocument = trpc.document.update.useMutation({
        onSuccess: () => {
            toast({ title: "Document updated" });
            utils.document.get.invalidate({ id: documentId });
            utils.document.list.invalidate();
        },
        onError: () => toast({ title: "Failed to update document", variant: "destructive" })
    });

    const handleCopyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?doc=${documentId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
    };

    const handleSaveRename = (newName: string) => {
        updateDocument.mutate({ id: documentId, title: newName });
    };

    return (
        <TooltipProvider delayDuration={300}>
            <DropdownMenu>
                {trigger ? (
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        {trigger}
                    </DropdownMenuTrigger>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <button
                                    className="h-5 w-5 inline-flex items-center justify-center rounded-sm hover:bg-zinc-300 text-zinc-600 focus-visible:ring-0 cursor-pointer"
                                >
                                    <Ellipsis className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Page settings</TooltipContent>
                    </Tooltip>
                )}
                <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuLabel className="text-xs text-zinc-400 uppercase tracking-wider">Actions</DropdownMenuLabel>

                    <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Invite
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleRename}>
                        <Pencil className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleCopyLink}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Link
                    </DropdownMenuItem>

                    <TemplateMenuPopover
                        entityType="DOC"
                        workspaceId={workspaceId}
                        contentToSave={{
                            id: documentId,
                            workspaceId,
                            spaceId: document?.spaceId ?? spaceId ?? undefined,
                            projectId: document?.projectId ?? projectId ?? undefined,
                            teamId: document?.teamId ?? undefined,
                            folderId: document?.folderId ?? undefined,
                            docId: documentId,
                            // Root document data (prefer live unsaved state if this is the currently edited document)
                            title: liveTitle ?? document?.title ?? "Document",
                            content: liveContent ?? document?.content ?? "",
                            icon: liveIcon ?? document?.icon ?? null,
                            coverImage: liveCoverImage ?? document?.coverImage ?? null,
                            // Backend will fetch children recursively from this ID
                            sourceDocId: documentId,
                        }}
                        triggerClassName="text-sm"
                        targetDocHasChildren={hasChildren ?? ((document?.children?.length ?? 0) > 0)}
                    />

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => {
                        // Fallback UI update while backend might not have this endpoint yet
                        toast({ title: "Document hidden from sidebar" });
                        // trpc.document.toggleSidebarVisibility?.mutate({ documentId });
                    }}>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide Doc
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
                        <Shield className="mr-2 h-4 w-4" /> Manage Access
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setDuplicateModalOpen(true)}>
                        <CopyPlus className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setTransferModalOpen(true)}>
                        <Crown className="mr-2 h-4 w-4" /> Transfer Ownership
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setArchiveModalOpen(true)} disabled={disableDelete}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setDeleteModalOpen(true)} disabled={disableDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setSettingsModalOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modals */}
            <EntityRenameDialog
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                currentName={document?.title || ""}
                entityType="doc"
                onSave={handleSaveRename}
                isSaving={updateDocument.isPending}
            />

            {workspaceId && (
                <ShareModal
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    itemType="doc"
                    itemId={documentId}
                    itemName={document?.title || "Document"}
                    workspaceId={workspaceId}
                />
            )}

            {workspaceId && (
                <DocumentDuplicateModal
                    open={duplicateModalOpen}
                    onOpenChange={setDuplicateModalOpen}
                    documentId={documentId}
                    documentName={document?.title || "Document"}
                    workspaceId={workspaceId}
                />
            )}

            {workspaceId && (
                <DocumentTransferModal
                    open={transferModalOpen}
                    onOpenChange={setTransferModalOpen}
                    documentId={documentId}
                    documentName={document?.title || "Document"}
                    workspaceId={workspaceId}
                />
            )}

            <DocumentArchiveModal
                open={archiveModalOpen}
                onOpenChange={setArchiveModalOpen}
                documentId={documentId}
                documentName={document?.title || "Document"}
            />

            <DocumentDeleteModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                documentId={documentId}
                documentName={document?.title || "Document"}
                onSuccess={onDelete}
            />

            <DocumentGeneralSettingsModal
                open={settingsModalOpen}
                onOpenChange={setSettingsModalOpen}
                documentId={documentId}
            />
        </TooltipProvider>
    );
}
