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
}: TemplateMenuPopoverProps) {
    const [open, setOpen] = useState(false);
    const [centerOpen, setCenterOpen] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateModalMode, setTemplateModalMode] = useState<"save" | "update">("save");
    const [initialTemplate, setInitialTemplate] = useState<any | null>(null);
    const [initialView, setInitialView] = useState<"detail" | "useTemplate">("detail");
    const queryEntityTypes = entityType && [
        "SPACE",
        "FOLDER",
        "LIST",
        "TASK",
        "DOC",
        "VIEW",
        "AGENT",
        "WORKFORCE",
        "PROPOSAL",
    ].includes(entityType)
        ? [entityType as "SPACE" | "FOLDER" | "LIST" | "TASK" | "DOC" | "VIEW" | "AGENT" | "WORKFORCE" | "PROPOSAL"]
        : undefined;

    const recentQuery = trpc.template.list.useQuery(
        {
            scope: workspaceId ? "workspace" : "global",
            entityTypes: queryEntityTypes,
            workspaceId: workspaceId ?? undefined,
            pageSize: 5,
        },
        { enabled: open }
    );

    const triggerNode = children ?? (
        <button
            className={cn(
                "relative w-full flex select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer text-left",
                triggerClassName
            )}
        >
            <LayoutTemplate className={cn("mr-2 h-4 w-4", triggerIconClassName)} />
            <span className={cn("truncate", triggerLabelClassName)}>Templates</span>
            <ChevronRight className={cn("ml-auto size-4", triggerChevronClassName)} />
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
                    <div className="px-2 py-1.5 text-[13px] font-medium text-slate-500">
                        Recent Templates
                    </div>
                    {recentQuery.isLoading ? (
                        <div className="py-3 flex justify-center items-center">
                            <Loader2 className="size-4 animate-spin text-slate-400" />
                        </div>
                    ) : recentQuery.data?.items.length === 0 ? (
                        <div className="px-2 py-1.5 text-[12.5px] italic text-slate-400">
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
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[13.5px] rounded-sm transition-colors text-left text-slate-700 hover:bg-slate-100/80 cursor-pointer"
                            >
                                <CircleDot className="h-4 w-4 text-slate-500 stroke-[2.5px]" />
                                <span className="flex-1 truncate">{t.name}</span>
                            </button>
                        ))
                    )}

                    <div className="my-1.5 h-[1px] bg-slate-100" />

                    <button
                        onClick={() => {
                            setInitialTemplate(null);
                            setInitialView("detail");
                            setCenterOpen(true);
                            setOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[13.5px] rounded-sm transition-colors text-left text-slate-700 hover:bg-slate-100/80 cursor-pointer"
                    >
                        <LayoutTemplate className="h-4 w-4 text-slate-500" />
                        Apply a template
                    </button>
                    <button
                        onClick={() => {
                            setTemplateModalMode("save");
                            setTemplateModalOpen(true);
                            setOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[13.5px] rounded-sm transition-colors text-left text-slate-700 hover:bg-slate-100/80 cursor-pointer"
                    >
                        <Save className="h-4 w-4 text-slate-500" />
                        Save as template
                    </button>
                    <button
                        onClick={() => {
                            setTemplateModalMode("update");
                            setTemplateModalOpen(true);
                            setOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[13.5px] rounded-sm transition-colors text-left text-slate-700 hover:bg-slate-100/80 cursor-pointer"
                    >
                        <RefreshCw className="h-4 w-4 text-slate-500" />
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
                    folderId: contentToSave?.folderId ?? undefined,
                    listId: contentToSave?.listId ?? undefined,
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
                contentToSave={contentToSave}
            />
        </>
    );
}
