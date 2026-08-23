import React, { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CircleDot, LayoutTemplate, Save, RefreshCw, Loader2, ChevronRight } from "lucide-react";
import { TemplateCenterModal } from "./TemplateCenterModal";
import { SaveTemplateModal } from "./SaveTemplateModal";
import { TemplateEntityType } from "@agentflox/database/src/generated/prisma/client";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface TemplateMenuPopoverProps {
    children?: React.ReactNode;
    entityType?: TemplateEntityType;
    workspaceId?: string;
    contentToSave?: any;
    triggerClassName?: string;
    triggerIconClassName?: string;
    triggerChevronClassName?: string;
    triggerLabelClassName?: string;
    targetDocHasChildren?: boolean;
}

export function TemplateMenuPopover({
    children,
    entityType,
    workspaceId,
    contentToSave,
    triggerClassName,
    triggerIconClassName,
    triggerChevronClassName,
    triggerLabelClassName,
    targetDocHasChildren,
}: TemplateMenuPopoverProps) {
    const [open, setOpen] = useState(false);
    const [centerOpen, setCenterOpen] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateModalMode, setTemplateModalMode] = useState<"save" | "update">("save");
    const [initialTemplate, setInitialTemplate] = useState<any | null>(null);
    const [initialView, setInitialView] = useState<"detail" | "useTemplate">("detail");
    const [isFetchingChildren, setIsFetchingChildren] = useState(false);
    const [dynamicContentToSave, setDynamicContentToSave] = React.useState(contentToSave);
    const utils = trpc.useUtils();

    React.useEffect(() => {
        setDynamicContentToSave(contentToSave);
    }, [contentToSave]);

    const supportedEntityTypes = [
        "SPACE",
        "FOLDER",
        "LIST",
        "TASK",
        "DOC",
        "VIEW",
        "AGENT",
        "WORKFORCE",
        "LISTING",
        "PROJECT",
    ] as const;

    const queryEntityTypes =
        entityType && supportedEntityTypes.includes(entityType as (typeof supportedEntityTypes)[number])
            ? [entityType as (typeof supportedEntityTypes)[number]]
            : undefined;

    const recentQuery = trpc.template.list.useQuery(
        {
            scope: workspaceId ? "all" : "global",
            entityTypes: queryEntityTypes,
            workspaceId: workspaceId ?? undefined,
            pageSize: 5,
        },
        { enabled: open }
    );

    const triggerNode = children ?? (
        <button
            className={cn(
                "relative w-full flex select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer text-left",
                triggerClassName
            )}
        >
            <LayoutTemplate className={cn("mr-2 h-4 w-4 text-zinc-500", triggerIconClassName)} />
            <span className={cn("truncate", triggerLabelClassName)}>Templates</span>
            <ChevronRight className={cn("ml-auto size-3.5 text-zinc-500", triggerChevronClassName)} />
        </button>
    );

    return (
        <>
            <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={200}>
                <HoverCardTrigger asChild>
                    <div onClick={(e) => {
                        // Prevent closing the parent dropdown
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(!open);
                    }}>
                        {triggerNode}
                    </div>
                </HoverCardTrigger>
                <HoverCardContent align="start" side="right" sideOffset={5} className="w-56 p-1 z-[9999] shadow-md border-muted">
                    <div className="px-2 py-1.5 text-[13px] font-medium text-zinc-500">
                        Recent Templates
                    </div>
                    {recentQuery.isLoading ? (
                        <div className="py-3 flex justify-center items-center">
                            <Loader2 className="size-4 animate-spin text-zinc-400" />
                        </div>
                    ) : recentQuery.data?.items.length === 0 ? (
                        <div className="px-2 py-1.5 text-[12.5px] italic text-zinc-400">
                            No recent templates found.
                        </div>
                    ) : (
                        recentQuery.data?.items.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setInitialTemplate(t);
                                    setInitialView("useTemplate");
                                    setCenterOpen(true);
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[13.5px] rounded-lg transition-colors text-left text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                            >
                                <CircleDot className="h-4 w-4 text-zinc-500 stroke-[2.5px]" />
                                <span className="flex-1 truncate">{t.name}</span>
                            </button>
                        ))
                    )}

                    <div className="my-1.5 h-[1px] bg-zinc-100" />

                    <button
                        onClick={() => {
                            setInitialTemplate(null);
                            setInitialView("detail");
                            setCenterOpen(true);
                            setOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[13.5px] rounded-sm transition-colors text-left text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                    >
                        <LayoutTemplate className="h-4 w-4 text-zinc-500" />
                        Apply a template
                    </button>
                    <button
                        onClick={async () => {
                            if (entityType === "DOC" && contentToSave?.id) {
                                setIsFetchingChildren(true);
                                try {
                                    const snapshot = await utils.document.getChildrenSnapshot.fetch({ id: contentToSave.id });
                                    setDynamicContentToSave({ ...contentToSave, children: snapshot });
                                } catch (e) {
                                    console.error("Failed to fetch children snapshot", e);
                                } finally {
                                    setIsFetchingChildren(false);
                                }
                            }
                            setTemplateModalMode("save");
                            setTemplateModalOpen(true);
                            setOpen(false);
                        }}
                        disabled={isFetchingChildren}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[13.5px] rounded-sm transition-colors text-left text-zinc-800 hover:bg-zinc-100 cursor-pointer disabled:opacity-50"
                    >
                        {isFetchingChildren ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : <Save className="h-4 w-4 text-zinc-500" />}
                        Save as template
                    </button>
                    <button
                        onClick={async () => {
                            if (entityType === "DOC" && contentToSave?.id) {
                                setIsFetchingChildren(true);
                                try {
                                    const snapshot = await utils.document.getChildrenSnapshot.fetch({ id: contentToSave.id });
                                    setDynamicContentToSave({ ...contentToSave, children: snapshot });
                                } catch (e) {
                                    console.error("Failed to fetch children snapshot", e);
                                } finally {
                                    setIsFetchingChildren(false);
                                }
                            }
                            setTemplateModalMode("update");
                            setTemplateModalOpen(true);
                            setOpen(false);
                        }}
                        disabled={isFetchingChildren}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[13.5px] rounded-sm transition-colors text-left text-zinc-800 hover:bg-zinc-100 cursor-pointer disabled:opacity-50"
                    >
                        {isFetchingChildren ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : <RefreshCw className="h-4 w-4 text-zinc-500" />}
                        Update existing template
                    </button>
                </HoverCardContent>
            </HoverCard>
            <TemplateCenterModal
                open={centerOpen}
                onOpenChange={(nextOpen) => {
                    setCenterOpen(nextOpen);
                    if (!nextOpen) setInitialTemplate(null);
                }}
                workspaceId={workspaceId}
                targetTaskId={entityType === "TASK" ? contentToSave?.id : undefined}
                targetContext={{
                    workspaceId: workspaceId ?? contentToSave?.workspaceId ?? undefined,
                    spaceId: contentToSave?.spaceId ?? undefined,
                    projectId: contentToSave?.projectId ?? undefined,
                    teamId: contentToSave?.teamId ?? undefined,
                    folderId: dynamicContentToSave?.folderId ?? undefined,
                    listId: dynamicContentToSave?.listId ?? undefined,
                    targetDocId: entityType === "DOC" ? dynamicContentToSave?.id : undefined,
                    targetDocHasChildren: targetDocHasChildren,
                    viewId: entityType === "VIEW" ? dynamicContentToSave?.id : undefined,
                }}
                initialTemplate={initialTemplate}
                initialView={initialView}
                initialEntityType={entityType}
            />
            <SaveTemplateModal
                open={templateModalOpen}
                onOpenChange={setTemplateModalOpen}
                initialMode={templateModalMode}
                entityType={entityType || "TASK"}
                workspaceId={workspaceId}
                contentToSave={dynamicContentToSave}
            />
        </>
    );
}
