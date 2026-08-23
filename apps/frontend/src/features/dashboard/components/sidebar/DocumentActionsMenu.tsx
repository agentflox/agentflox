"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    MoreHorizontal,
    Ellipsis,
    Pencil,
    Copy,
    Archive,
    Trash2,
    Settings,
    CopyPlus,
    UserPlus,
    EyeOff,
    Shield,
    Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "@/entities/shared/components/EntityRenameDialog";
import { ShareModal } from "@/components/permissions/ShareModal";
import { DocumentArchiveModal } from "@/entities/documents/components/DocumentArchiveModal";
import { DocumentDeleteModal } from "@/entities/documents/components/DocumentDeleteModal";
import { DocumentDuplicateModal } from "@/entities/documents/components/DocumentDuplicateModal";
import { DocumentTransferModal } from "@/entities/documents/components/DocumentTransferModal";
import { DocumentGeneralSettingsModal } from "@/entities/documents/components/DocumentGeneralSettingsModal";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


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
    className?: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
}

export function DocumentActionsMenu({
    workspaceId,
    spaceId,
    projectId,
    documentId,
    trigger,
    disableDelete,
    onDelete,
    liveTitle,
    liveContent,
    liveIcon,
    liveCoverImage,
    hasChildren,
    className,
    side = "right",
    align = "start",
    sideOffset = 6,
}: DocumentActionsMenuProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [popoverOpen, setPopoverOpen] = useState(false);

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
        setPopoverOpen(false);
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
        setPopoverOpen(false);
    };

    const handleSaveRename = (newName: string) => {
        updateDocument.mutate({ id: documentId, title: newName });
    };

    const handleHideDoc = () => {
        updateDocument.mutate({ id: documentId, isArchived: true } as any);
        toast({ title: "Document hidden from sidebar" });
        setPopoverOpen(false);
    };

    return (
        <TooltipProvider delayDuration={300}>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                {trigger ? (
                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                        {trigger}
                    </PopoverTrigger>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-zinc-200 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    <MoreHorizontal size={16} />
                                </Button>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Document settings</p>
                        </TooltipContent>
                    </Tooltip>
                )}
                <PopoverContent
                    side={side}
                    align={align}
                    sideOffset={sideOffset}
                    className={cn("w-56 p-1.5 bg-white rounded-xl shadow-xl border border-zinc-200/90 flex flex-col gap-0.5 z-50", className)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setShareModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <UserPlus className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Invite</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleRename}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Pencil className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Rename</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Copy className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Copy Link</span>
                    </button>

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
                            title: liveTitle ?? document?.title ?? "Document",
                            content: liveContent ?? document?.content ?? "",
                            icon: liveIcon ?? document?.icon ?? null,
                            coverImage: liveCoverImage ?? document?.coverImage ?? null,
                            sourceDocId: documentId,
                        }}
                        triggerClassName="text-sm font-normal"
                        targetDocHasChildren={hasChildren ?? ((document?.children?.length ?? 0) > 0)}
                    />

                    <div className="h-px bg-zinc-100 my-1 mx-1" />

                    <button
                        type="button"
                        onClick={handleHideDoc}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <EyeOff className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Hide Doc</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setShareModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Shield className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Manage Access</span>
                    </button>

                    <div className="h-px bg-zinc-100 my-1 mx-1" />

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setDuplicateModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <CopyPlus className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Duplicate</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setTransferModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Crown className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Transfer Ownership</span>
                    </button>

                    <button
                        type="button"
                        disabled={disableDelete}
                        onClick={() => { setPopoverOpen(false); setArchiveModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal disabled:opacity-50"
                    >
                        <Archive className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Archive</span>
                    </button>

                    <button
                        type="button"
                        disabled={disableDelete}
                        onClick={() => { setPopoverOpen(false); setDeleteModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer w-full text-left transition-colors font-normal disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4 shrink-0 text-red-500" />
                        <span>Delete</span>
                    </button>

                    <div className="h-px bg-zinc-100 my-1 mx-1" />

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setSettingsModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Settings className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Settings</span>
                    </button>
                </PopoverContent>
            </Popover>

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
