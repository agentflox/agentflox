"use client";

import { X, Search, ListFilter, FileText, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TemplateCenterModal } from "@/entities/templates/components/TemplateCenterModal";
import { SaveTemplateModal } from "@/entities/templates/components/SaveTemplateModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useMemo, useCallback } from "react";
import { trpc } from '@/lib/trpc';
import { useToast } from "@/hooks/useToast";

interface TemplatesPanelProps {
    onClose?: () => void;
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    listId?: string;
    /** The current view's ID — used as viewId and parentId when creating a child doc from a template */
    parentDocId?: string;
    /** The current view's ID — passed to document.create */
    viewId?: string;
    /** The current document's ID — used to populate contentToSave when saving as template */
    docId?: string;
    /** Live title from editor */
    currentTitle?: string;
    /** Live content from editor */
    currentContent?: string;
    /** Live icon from editor */
    currentIcon?: string;
    /** Live cover image from editor */
    currentCoverImage?: string | null;
    /** Whether the current document has children */
    hasChildren?: boolean;
}

// ── Template Item ────────────────────────────────────────────────────────────

interface TemplateItemProps {
    template: any;
    byLabel?: string;
    onAdd: (template: any) => void;
    isAdding: boolean;
    onClick: () => void;
}

function TemplateItem({ template, byLabel = "Workspace", onAdd, isAdding, onClick }: TemplateItemProps) {
    return (
        <div
            className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group"
            onClick={onClick}
        >
            <div className="h-10 w-10 rounded-md border border-zinc-100 flex items-center justify-center shrink-0 bg-white group-hover:border-purple-100 transition-colors">
                <FileText className="h-5 w-5 text-blue-500 fill-blue-500" />
            </div>
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="text-sm font-semibold text-zinc-800 truncate">{template.name}</span>
                <span className="text-xs text-zinc-500">By {template.creator?.name || byLabel}</span>
            </div>
            {/* Hover Add button */}
            <button
                className={cn(
                    "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                    "opacity-0 group-hover:opacity-100",
                    "bg-white border-zinc-200 text-zinc-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700",
                    "active:scale-95 cursor-pointer"
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    onAdd(template);
                }}
                title="Add as child page using this template"
            >
                {isAdding ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <Plus className="h-3 w-3" />
                )}
                Add
            </button>
        </div>
    );
}

// ── TemplatesPanel ───────────────────────────────────────────────────────────

export function TemplatesPanel({
    onClose, workspaceId, spaceId, projectId, listId, parentDocId, viewId, docId,
    currentTitle, currentContent, currentIcon, currentCoverImage, hasChildren
}: TemplatesPanelProps) {
    const [centerOpen, setCenterOpen] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateModalMode, setTemplateModalMode] = useState<"save" | "update">("save");
    const [initialTemplate, setInitialTemplate] = useState<any | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>("All");
    const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);
    const [childrenSnapshot, setChildrenSnapshot] = useState<any[] | null>(null);
    const [isFetchingChildren, setIsFetchingChildren] = useState(false);
    const { toast } = useToast();
    const utils = trpc.useUtils();
    
    const applyDocTemplateMutation = trpc.document.applyTemplate.useMutation({
        onSuccess: () => {
            toast({ title: "Template applied to current document" });
            if (docId) utils.document.get.invalidate({ id: docId });
            utils.document.list.invalidate();
            setAddingTemplateId(null);
            onClose?.();
        },
        onError: (err) => {
            toast({ title: "Could not apply template", description: err.message, variant: "destructive" });
            setAddingTemplateId(null);
        }
    });

    const { data: templateData, isLoading } = trpc.template.list.useQuery({
        workspaceId,
        scope: "all",
        entityTypes: ["DOC"],
        pageSize: 100,
    });

    const createDocMutation = trpc.document.create.useMutation({
        onMutate: async (vars) => {
            // Cancel in-flight queries so they don't overwrite our optimistic update
            await utils.document.list.cancel();

            // Build an optimistic document matching the list item shape
            const optimisticDoc = {
                id: `optimistic-${Date.now()}`,
                title: vars.title,
                content: vars.content ?? "",
                description: null,
                icon: vars.icon ?? null,
                coverImage: vars.coverImage ?? null,
                parentId: vars.parentId ?? null,
                viewId: vars.viewId ?? null,
                workspaceId: vars.workspaceId ?? null,
                spaceId: vars.spaceId ?? null,
                projectId: vars.projectId ?? null,
                listId: vars.listId ?? null,
                folderId: vars.folderId ?? null,
                teamId: vars.teamId ?? null,
                isTemplate: false,
                isArchived: false,
                isFavorite: false,
                position: 9999,
                version: 1,
                settings: null,
                createdBy: "",
                updatedBy: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                creator: null,
                collaborators: [],
                children: [],
            } as any;

            // Optimistically update every matching document.list cache entry
            utils.document.list.setData(
                { workspaceId, viewId: viewId ?? undefined, parentId: vars.parentId ?? null, pageSize: 50 },
                (old: any) => {
                    if (!old) return old;
                    return { ...old, items: [...old.items, optimisticDoc], total: old.total + 1 };
                }
            );

            return { optimisticDoc };
        },
        onSuccess: (doc) => {
            toast({
                title: "Page created",
                description: `"${doc.title}" was added as a child page.`,
            });
        },
        onError: (err, _vars, context) => {
            // Roll back the optimistic update
            if (context?.optimisticDoc) {
                utils.document.list.setData(
                    { workspaceId, viewId: viewId ?? undefined, parentId: context.optimisticDoc.parentId, pageSize: 50 },
                    (old: any) => {
                        if (!old) return old;
                        return {
                            ...old,
                            items: old.items.filter((d: any) => d.id !== context.optimisticDoc.id),
                            total: old.total - 1,
                        };
                    }
                );
            }
            toast({
                title: "Failed to create page",
                description: err.message,
                variant: "destructive",
            });
        },
        onSettled: () => {
            // Always sync with server truth
            void utils.document.list.invalidate();
            setAddingTemplateId(null);
        },
    });


    // Apply a template as a new child doc — use ONLY the snapshot children stored in the template,
    // never live-fetch from sourceDocId so edits to the original doc don't bleed into applied templates.
    const handleAddTemplate = async (template: any) => {
        setAddingTemplateId(template.id);
        const tContent = (template.content ?? {}) as any;
        const content = typeof tContent === "string"
            ? tContent
            : (tContent.body ?? tContent.content ?? "");

        if (docId && !hasChildren) {
            applyDocTemplateMutation.mutate({
                templateId: template.id,
                targetDocId: docId,
            });
        } else {
            createDocMutation.mutate({
                title: tContent.title || template.name,
                content,
                coverImage: tContent.coverImage || null,
                icon: tContent.icon || null,
                // Use only the stored children snapshot — never sourceDocId live-fetch
                children: Array.isArray(tContent.children) ? tContent.children : undefined,
                workspaceId: workspaceId ?? null,
                spaceId,
                projectId,
                listId,
                viewId: viewId || "",
                parentId: parentDocId ?? null,
            });
        }
    };

    // Fetch a children snapshot from the backend when opening Save modal, so the template
    // captures the document tree as-is right now (not a live reference).
    const handleOpenSaveTemplate = useCallback(async (mode: "save" | "update") => {
        setTemplateModalMode(mode);
        if (docId) {
            setIsFetchingChildren(true);
            try {
                const snapshot = await utils.document.getChildrenSnapshot.fetch({ id: docId });
                setChildrenSnapshot(snapshot);
            } catch {
                setChildrenSnapshot(null);
            } finally {
                setIsFetchingChildren(false);
            }
        } else {
            setChildrenSnapshot(null);
        }
        setTemplateModalOpen(true);
    }, [docId, utils]);

    const items = templateData?.items || [];

    const { workspaceTemplates, otherUserTemplates, groupedCategories, categoriesList } = useMemo(() => {
        const workspaceTemplates = items.filter(t => !t.isSystem && t.workspaceId === workspaceId);
        const otherUserTemplates = items.filter(t => !t.isSystem && t.workspaceId !== workspaceId);
        const systemTemplates = items.filter(t => t.isSystem);

        const groupedCategories = systemTemplates.reduce((acc, t) => {
            const cat = t.category || "Other";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(t);
            return acc;
        }, {} as Record<string, typeof items>);

        const categoriesList = Array.from(new Set(systemTemplates.map(t => t.category || "Other"))).sort();

        return { workspaceTemplates, otherUserTemplates, groupedCategories, categoriesList };
    }, [items, workspaceId]);

    const filters = ["All", "My workspace", "Others", ...categoriesList];

    return (
        <>
            <div className="w-full h-full flex flex-col bg-white overflow-hidden">
                {/* Header */}
                <div className="flex flex-col pt-3 px-4 pb-3 border-b border-zinc-100 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">Templates</h3>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors">
                                <Search className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors">
                                <ListFilter className="h-3.5 w-3.5" />
                            </Button>
                            {onClose && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors" onClick={onClose}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Filter Chips */}
                    <ScrollArea className="w-full pb-2">
                        <div className="flex flex-wrap gap-2">
                            {filters.slice(0, 6).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap cursor-pointer select-none active:scale-95",
                                        activeFilter === filter
                                            ? "border-violet-300 text-violet-700 bg-violet-50 shadow-sm"
                                            : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-700"
                                    )}
                                >
                                    {filter}
                                </button>
                            ))}
                            {filters.length > 6 && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap cursor-pointer select-none active:scale-95",
                                                filters.slice(6).includes(activeFilter)
                                                    ? "border-violet-300 text-violet-700 bg-violet-50 shadow-sm"
                                                    : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-700"
                                            )}
                                        >
                                            +{filters.length - 6}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-1 max-h-[300px] overflow-y-auto" align="start">
                                        <div className="flex flex-col gap-1">
                                            {filters.slice(6).map((filter) => (
                                                <button
                                                    key={filter}
                                                    onClick={() => setActiveFilter(filter)}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                                                        activeFilter === filter
                                                            ? "bg-violet-50 text-violet-700 font-medium"
                                                            : "text-zinc-700 hover:bg-zinc-100"
                                                    )}
                                                >
                                                    {filter}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Content Area */}
                <ScrollArea className="flex-1 min-h-[300px]">
                    <div className="p-4 flex flex-col gap-5">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-purple-600"></div>
                            </div>
                        ) : (
                            <>
                                {/* My Workspace Section */}
                                {(activeFilter === "All" || activeFilter === "My workspace") && (
                                    <div className="flex flex-col gap-2">
                                        <h4 className="text-xs font-medium text-zinc-500">My workspace</h4>
                                        {workspaceTemplates.length === 0 ? (
                                            <div className="flex justify-center items-center py-4">
                                                <span className="text-sm text-zinc-400">No workspace templates</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3 mt-1">
                                                {workspaceTemplates.map((template) => (
                                                    <TemplateItem
                                                        key={template.id}
                                                        template={template}
                                                        byLabel="Workspace"
                                                        isAdding={addingTemplateId === template.id}
                                                        onAdd={handleAddTemplate}
                                                        onClick={() => {
                                                            setInitialTemplate(template);
                                                            setCenterOpen(true);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Others Section */}
                                {(activeFilter === "All" || activeFilter === "Others") && (
                                    <div className="flex flex-col gap-2">
                                        {(activeFilter === "Others" || otherUserTemplates.length > 0) && (
                                            <>
                                                <h4 className="text-xs font-medium text-zinc-500">Others</h4>
                                                {otherUserTemplates.length === 0 ? (
                                                    <div className="flex justify-center items-center py-4">
                                                        <span className="text-sm text-zinc-400">No other templates</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-3 mt-1">
                                                        {otherUserTemplates.map((template) => (
                                                            <TemplateItem
                                                                key={template.id}
                                                                template={template}
                                                                byLabel="Shared"
                                                                isAdding={addingTemplateId === template.id}
                                                                onAdd={handleAddTemplate}
                                                                onClick={() => {
                                                                    setInitialTemplate(template);
                                                                    setCenterOpen(true);
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Categorized Sections */}
                                {categoriesList.map((category) => {
                                    if (activeFilter !== "All" && activeFilter !== category) return null;

                                    const categoryTemplates = groupedCategories[category] || [];
                                    if (categoryTemplates.length === 0) return null;

                                    return (
                                        <div key={category} className="flex flex-col gap-3">
                                            <h4 className="text-xs font-medium text-zinc-500 mb-1">{category}</h4>
                                            {categoryTemplates.map((template) => (
                                                <TemplateItem
                                                    key={template.id}
                                                    template={template}
                                                    byLabel="ClickUp"
                                                    isAdding={addingTemplateId === template.id}
                                                    onAdd={handleAddTemplate}
                                                    onClick={() => {
                                                        setInitialTemplate(template);
                                                        setCenterOpen(true);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-3 pt-2 border-t border-zinc-100 flex flex-col gap-2 shrink-0 bg-white">
                    <button
                        className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer py-1.5 rounded-md hover:bg-zinc-100 active:bg-zinc-100"
                        onClick={() => handleOpenSaveTemplate("update")}
                    >
                        Update existing template
                    </button>
                    <Button
                        variant="outline"
                        className="text-sm w-full h-9 rounded-lg border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-100 cursor-pointer transition-colors active:bg-zinc-100"
                        disabled={isFetchingChildren}
                        onClick={() => handleOpenSaveTemplate("save")}
                    >
                        {isFetchingChildren ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                        Save as template
                    </Button>
                </div>
            </div>

            <TemplateCenterModal
                open={centerOpen}
                onOpenChange={(nextOpen) => {
                    setCenterOpen(nextOpen);
                    if (!nextOpen) setInitialTemplate(null);
                }}
                workspaceId={workspaceId}
                targetContext={{
                    workspaceId,
                    spaceId,
                    projectId,
                    listId,
                    parentDocId: parentDocId ?? undefined,
                }}
                initialTemplate={initialTemplate}
                initialView="useTemplate"
                initialEntityType="DOC"
            />
            <SaveTemplateModal
                open={templateModalOpen}
                onOpenChange={setTemplateModalOpen}
                initialMode={templateModalMode}
                entityType="DOC"
                workspaceId={workspaceId}
                contentToSave={(docId || currentTitle) ? {
                    id: docId,
                    workspaceId,
                    spaceId,
                    projectId,
                    listId,
                    docId,
                    // Root document data from live props (snapshot at save time)
                    title: currentTitle ?? "Document",
                    content: currentContent ?? "",
                    icon: currentIcon ?? null,
                    coverImage: currentCoverImage ?? null,
                    // Children snapshot fetched at save time — NOT a live reference
                    children: childrenSnapshot ?? [],
                } : { workspaceId, spaceId, projectId, listId }}
            />
        </>
    );
}
