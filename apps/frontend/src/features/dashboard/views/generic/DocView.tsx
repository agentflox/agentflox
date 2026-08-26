"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    FileText,
    Star,
    Search,
    MoreHorizontal,
    ChevronsLeft,
    Plus,
    Link as LinkIcon,
    MessageSquare,
    Type,
    Image as ImageIcon,
    Download,
    ChevronRight,
    ChevronsRight,
    Settings,
    ArrowRightLeft,
    Wand2,
    Play,
    Loader2
} from "lucide-react";
import { Panel, Group, Separator as ResizableSeparator } from "react-resizable-panels";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DescriptionEditor } from "@/entities/shared/components/DescriptionEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DocumentActionsMenu } from "@/features/dashboard/components/sidebar/DocumentActionsMenu";
import { PageSettingsModal, defaultPageSettings, PageSettingsConfig } from "@/features/dashboard/components/modals/PageSettingsModal";
import { RelationshipsPanel, RelationshipsQuickMenu } from "@/features/dashboard/components/modals/RelationshipsPanel";
import { TemplatesPanel } from "@/features/dashboard/components/modals/TemplatesPanel";
import { ExportPanel } from "@/features/dashboard/components/modals/ExportPanel";
import { CoverPickerPopover } from "@/features/dashboard/components/modals/CoverPickerPopover";
import { CommentsPanel } from "@/features/dashboard/components/comments/CommentsPanel";
import { EnhancedIconPicker } from "@/components/ui/enhanced-icon-picker";
import { ResizablePanelContainer } from "@/components/ui/resizable-panel-container";
import { storageUtils } from "@/utils/storage/storageUtils";
import { useToast } from "@/hooks/useToast";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRef } from "react";
import { DynamicLucideIcon } from "@/lib/lucideIcon";
import { getAgentMemoryTag, isPreferencesMemoryDoc } from "@/lib/agentMemory/memoryPolicy";
import { useDashboardState } from "@/features/dashboard/utils/useDashboardState";

import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { generateKeyBetween } from 'fractional-indexing';

// ─── Module-level sortable item (must be outside DocView to keep stable identity) ───
interface SortableDocItemProps {
    page: any;
    projectedDepth: number | null;
    overId: string | null;
    activeId: string | null;
    dropPosition: 'before' | 'after' | 'child' | null;
    children: React.ReactNode;
}

function SortableDocItem({ page, projectedDepth, overId, activeId, dropPosition, children }: SortableDocItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });
    const style = { transform: CSS.Translate.toString(transform), transition };

    const depth = projectedDepth ?? page.depth;
    const INDENT = 20;
    const CONTAINER_PADDING = 12;
    const lineLeft = depth === 0 ? -CONTAINER_PADDING + 4 : (8 + depth * INDENT - CONTAINER_PADDING + 4);
    const isOver = overId === page.id && activeId !== page.id;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative">
            {children}
            {isOver && dropPosition === 'before' && (
                <div className="absolute top-0 z-20 pointer-events-none h-px bg-blue-500" style={{ left: lineLeft, right: -CONTAINER_PADDING }}>
                    <div className="absolute -left-1 w-2 h-2 rounded-full bg-white border-2 border-zinc-800" style={{ top: '-3px' }} />
                </div>
            )}
            {isOver && dropPosition === 'after' && (
                <div className="absolute bottom-0 z-20 pointer-events-none h-px bg-blue-500" style={{ left: lineLeft, right: -CONTAINER_PADDING }}>
                    <div className="absolute -left-1 w-2 h-2 rounded-full bg-white border-2 border-zinc-800" style={{ top: '-3px' }} />
                </div>
            )}
        </div>
    );
}

interface DocViewProps {
    listId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    folderId?: string;
    workspaceId?: string;
    viewId: string;
    initialConfig?: any;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    context?: string;
    isMainSidebarCollapsed?: boolean;
}

export function DocView({ listId, spaceId, projectId, viewId, teamId, folderId, workspaceId: workspaceIdProp, isMainSidebarCollapsed }: DocViewProps) {
    const params = useParams();
    const router = useRouter();
    const { searchParams, parsedState } = useDashboardState();
    const workspaceId = workspaceIdProp || (params?.workspaceId as string | undefined);

    // Derive scope from most-specific context available
    const commentsScope: "team" | "project" | "space" | "workspace" =
        teamId ? "team" : projectId ? "project" : spaceId ? "space" : "workspace";

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [pageSettings, setPageSettings] = useState<PageSettingsConfig>(defaultPageSettings);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [pageIcon, setPageIcon] = useState<string>("");
    const [pageIconColor, setPageIconColor] = useState<string>("#5e5f61ff");

    // Modal & Sidebar Panel State
    type ActivePanel = 'comments' | 'settings' | 'relationships' | 'templates' | 'export' | null;
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
    const [coverPositionY, setCoverPositionY] = useState(50);
    const [isRepositioning, setIsRepositioning] = useState(false);
    const dragStartY = useRef(0);
    const startPositionY = useRef(50);
    const oldCoverPositionY = useRef(50);

    const handleCoverUploadFile = async (file: File) => {
        setIsUploadingCover(true);
        try {
            const pathPrefix = "covers";
            const path = storageUtils.generateUniquePath(file.name, pathPrefix);
            const result = await storageUtils.upload({
                file,
                bucket: "media",
                path,
                upsert: true,
            });
            if (result.success && result.url) {
                setCoverImage(result.url);
                toast({ title: "Cover updated" });
            } else {
                toast({ title: "Failed to upload cover", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error uploading cover", variant: "destructive" });
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isRepositioning) return;
        dragStartY.current = e.clientY;
        startPositionY.current = coverPositionY;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - dragStartY.current;
            const newPositionY = Math.max(0, Math.min(100, startPositionY.current - (deltaY * 0.2)));
            setCoverPositionY(newPositionY);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Sidebar States
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const isDraggingSidebar = useRef(false);

    const startSidebarDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingSidebar.current = true;
        document.body.style.cursor = 'col-resize';
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingSidebar.current) return;
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(200, Math.min(startWidth + deltaX, 800));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            isDraggingSidebar.current = false;
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({
        "page1": true
    });
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [editingPageTitle, setEditingPageTitle] = useState("");
    // Track the doc ID whose data is currently loaded in the editor
    const loadedDocIdRef = useRef<string | null>(null);
    const isLoadingDocRef = useRef(false);
    const lastSyncedDataRef = useRef({ title: "", content: "", coverImage: null as string | null, icon: "" });

    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const { data: documentsData } = trpc.document.list.useQuery({
        workspaceId,
        viewId,
        parentId: null,
        pageSize: 50,
        includeChildren: true,
    }, { staleTime: 60_000, gcTime: 5 * 60_000, enabled: !!viewId });

    const createDocument = trpc.document.create.useMutation({
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: [['document', 'list']] });
            const previousData = queryClient.getQueriesData({ queryKey: [['document', 'list']] });

            // Optimistically insert a placeholder page
            const tempId = `temp-${Date.now()}`;
            const newTitle = variables.title || 'Untitled';

            queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                const newPage = {
                    id: tempId,
                    title: newTitle,
                    icon: variables.icon || null,
                    coverImage: null,
                    content: '',
                    position: oldData.items.length,
                    parentId: variables.parentId || null,
                    children: [],
                };
                // If it's a subpage, add it to the parent's children in-place
                if (variables.parentId) {
                    const addToParent = (items: any[]): any[] =>
                        items.map(item =>
                            item.id === variables.parentId
                                ? { ...item, children: [...(item.children || []), newPage] }
                                : { ...item, children: item.children ? addToParent(item.children) : item.children }
                        );
                    return { ...oldData, items: addToParent(oldData.items), total: oldData.total + 1 };
                }
                return { ...oldData, items: [...oldData.items, newPage], total: oldData.total + 1 };
            });

            // Immediately clear editor state so there's no flash of the previous doc's content
            loadedDocIdRef.current = tempId;
            isLoadingDocRef.current = true;
            setTitle(newTitle);
            setContent('');
            setCoverImage(null);
            setPageIcon('');
            setSelectedDocId(tempId);
            if (variables.parentId) {
                setExpandedPages(prev => ({ ...prev, [variables.parentId!]: true }));
            }

            return { previousData, tempId };
        },
        onSuccess: (newDoc, variables, context: any) => {
            // Replace the temp placeholder with the real doc
            queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                const replaceTempId = (items: any[]): any[] =>
                    items.map(item =>
                        item.id === context?.tempId
                            ? { ...item, id: newDoc.id, title: newDoc.title }
                            : { ...item, children: item.children ? replaceTempId(item.children) : item.children }
                    );
                return { ...oldData, items: replaceTempId(oldData.items) };
            });
            utils.document.list.invalidate();
            if (newDoc.parentId) {
                setExpandedPages(prev => ({ ...prev, [newDoc.parentId!]: true }));
            }
            // Switch from temp to real id; the get query will load fresh data
            loadedDocIdRef.current = null;
            isLoadingDocRef.current = false;
            handleSelectDoc(newDoc.id);
        },
        onError: (_err, _variables, context: any) => {
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]: [any, any]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            // Restore selection to first available page
            handleSelectDoc(null);
            toast({ title: "Failed to add page", variant: "destructive" });
        }
    });

    const handleSelectDoc = useCallback((id: string | null) => {
        setSelectedDocId(id);
        const pathname = typeof window !== "undefined" ? window.location.pathname : "";
        let nextPath = pathname;
        if (pathname.includes('/dv/') || pathname.includes('/dashboard/docs/')) {
            const basePath = pathname.replace(/\/dc\/[^/]+/, "");
            nextPath = id ? `${basePath}/dc/${id}` : basePath;
        }
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("doc");
        nextParams.delete("page");
        nextParams.delete("dc");
        const qs = nextParams.toString();
        if (typeof history !== "undefined") {
            router.replace(qs ? `${nextPath}?${qs}` : nextPath, { scroll: false });
        }
    }, [searchParams]);

    const handleAddPage = (e: React.MouseEvent, parentId?: string) => {
        e.stopPropagation();
        if (createDocument.isPending) return; // prevent duplicate
        createDocument.mutate({
            workspaceId,
            viewId,
            spaceId,
            projectId,
            listId,
            teamId,
            folderId,
            parentId: parentId || null,
            title: "Untitled",
        });
    };

    // Sort by fractional index position. PostgreSQL's default collation treats uppercase as 
    // coming AFTER lowercase (locale-sensitive), but fractional-indexing uses ASCII order 
    // where uppercase < lowercase (e.g. 'Zz' < 'a0'). Sort on the client to guarantee 
    // correct order regardless of DB collation.
    const sortByPosition = (items: any[]): any[] =>
        [...items]
            .sort((a, b) => {
                const pa = a.position ?? "";
                const pb = b.position ?? "";
                // Use 'C' locale equivalent: ordinal byte comparison
                return pa < pb ? -1 : pa > pb ? 1 : 0;
            })
            .map(item => ({
                ...item,
                children: item.children ? sortByPosition(item.children) : item.children,
            }));

    const actualPages = sortByPosition(documentsData?.items || []);

    const selectedDocHasChildren = useMemo(() => {
        if (!selectedDocId) return false;
        const checkChildren = (pages: any[]): boolean => {
            for (const p of pages) {
                if (p.id === selectedDocId) {
                    return p.children && p.children.length > 0;
                }
                if (p.children && checkChildren(p.children)) return true;
            }
            return false;
        };
        return checkChildren(actualPages);
    }, [selectedDocId, actualPages]);

    const urlDocId = parsedState.docItemId || searchParams.get("dc") || searchParams.get("doc") || searchParams.get("page");

    // Auto-select first doc or sync with URL
    useEffect(() => {
        if (urlDocId && urlDocId !== selectedDocId) {
            setSelectedDocId(urlDocId);
        } else if (actualPages.length > 0 && !selectedDocId && !urlDocId) {
            handleSelectDoc(actualPages[0].id);
        }
    }, [actualPages, selectedDocId, urlDocId, handleSelectDoc]);

    const { data: selectedDocument } = trpc.document.get.useQuery(
        { id: selectedDocId as string },
        { enabled: !!selectedDocId && !selectedDocId.startsWith('temp-'), staleTime: 30_000, gcTime: 5 * 60_000 }
    );

    // Dedicated mutation for drag-and-drop reorders — does NOT cancelQueries so the optimistic
    // list update applied in handleDragEnd is not wiped before the server confirms.
    const reorderDocument = trpc.document.update.useMutation({
        onSuccess: () => { utils.document.list.invalidate(); },
        onError: () => { utils.document.list.invalidate(); },
    });

    const updateSelectedDoc = trpc.document.update.useMutation({
        onMutate: async (variables) => {
            // Cancel in-flight list + get queries
            await queryClient.cancelQueries({ queryKey: [['document', 'list']] });
            await queryClient.cancelQueries({ queryKey: [['document', 'get', { input: { id: variables.id } }]] });

            const previousListData = queryClient.getQueriesData({ queryKey: [['document', 'list']] });
            const previousGetData = queryClient.getQueryData([['document', 'get', { input: { id: variables.id } }]]);

            // Optimistically patch the list cache (for sidebar title)
            queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                const patchItem = (items: any[]): any[] =>
                    items.map(item =>
                        item.id === variables.id
                            ? {
                                ...item,
                                ...(variables.title !== undefined && { title: variables.title }),
                                ...(variables.icon !== undefined && { icon: variables.icon }),
                                ...(variables.coverImage !== undefined && { coverImage: variables.coverImage }),
                            }
                            : { ...item, children: item.children ? patchItem(item.children) : item.children }
                    );
                return { ...oldData, items: patchItem(oldData.items) };
            });

            // Optimistically patch the get cache (for editor)
            queryClient.setQueryData([['document', 'get'], { input: { id: variables.id }, type: 'query' }], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    ...(variables.title !== undefined && { title: variables.title }),
                    ...(variables.content !== undefined && { content: variables.content }),
                    ...(variables.icon !== undefined && { icon: variables.icon }),
                    ...(variables.coverImage !== undefined && { coverImage: variables.coverImage }),
                    ...(variables.settings !== undefined && { settings: variables.settings }),
                };
            });

            return { previousListData, previousGetData };
        },
        onSuccess: (_data, variables) => {
            // Re-fetch in background to align with server state
            utils.document.get.invalidate({ id: variables.id });
            utils.document.list.invalidate();
        },
        onError: (_err, variables, context: any) => {
            if (context?.previousListData) {
                context.previousListData.forEach(([queryKey, data]: [any, any]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            if (context?.previousGetData) {
                queryClient.setQueryData([['document', 'get', { input: { id: variables.id } }]], context.previousGetData);
            }
            toast({ title: "Failed to save changes", variant: "destructive" });
        }
    });

    const deleteDocument = trpc.document.delete.useMutation({
        onSuccess: () => {
            utils.document.list.invalidate();
            handleSelectDoc(null);
            toast({ title: "Page deleted" });
        },
        onError: () => {
            toast({ title: "Failed to delete page", variant: "destructive" });
        }
    });

    // Normalise nullable strings to "" for safe comparisons
    const norm = (v: string | null | undefined): string => v ?? "";

    // True when the fetched document is a *different* doc than what's currently in the editor
    const isDocChange = !!selectedDocument && selectedDocument.id !== loadedDocIdRef.current;

    // Populate local editor state when selectedDocument finishes loading
    useEffect(() => {
        if (!selectedDocument) return;
        const titleExternal = norm(selectedDocument.title) !== norm(lastSyncedDataRef.current.title) && norm(selectedDocument.title) !== norm(title);
        const contentExternal = norm(selectedDocument.content) !== norm(lastSyncedDataRef.current.content) && norm(selectedDocument.content) !== norm(content);
        const coverExternal = norm(selectedDocument.coverImage) !== norm(lastSyncedDataRef.current.coverImage) && norm(selectedDocument.coverImage) !== norm(coverImage);
        const iconExternal = norm(selectedDocument.icon) !== norm(lastSyncedDataRef.current.icon) && norm(selectedDocument.icon) !== norm(pageIcon);
        const isExternalUpdate = !isDocChange && (titleExternal || contentExternal || coverExternal || iconExternal);

        if (isDocChange) {
            isLoadingDocRef.current = true;
            setTitle(norm(selectedDocument.title));
            setContent(norm(selectedDocument.content));
            setCoverImage(selectedDocument.coverImage || null);
            setPageIcon(norm(selectedDocument.icon));
            setPageIconColor(
                selectedDocument.settings && typeof selectedDocument.settings === 'object' && 'iconColor' in selectedDocument.settings
                    ? (selectedDocument.settings as any).iconColor
                    : "#5e5f61ff"
            );
            if (selectedDocument.settings && typeof selectedDocument.settings === 'object' && 'pageSettings' in selectedDocument.settings) {
                setPageSettings((selectedDocument.settings as any).pageSettings);
            } else {
                setPageSettings(defaultPageSettings);
            }
            loadedDocIdRef.current = selectedDocument.id;
            lastSyncedDataRef.current = {
                title: norm(selectedDocument.title),
                content: norm(selectedDocument.content),
                coverImage: selectedDocument.coverImage || null,
                icon: norm(selectedDocument.icon)
            };
            // Allow saves after a short delay
            setTimeout(() => { isLoadingDocRef.current = false; }, 200);
        } else if (isExternalUpdate) {
            // Granular update: only reset fields that actually changed externally
            // This prevents a content/icon external update from wiping a title the user is typing
            if (titleExternal) setTitle(norm(selectedDocument.title));
            if (contentExternal) setContent(norm(selectedDocument.content));
            if (coverExternal) setCoverImage(selectedDocument.coverImage || null);
            if (iconExternal) setPageIcon(norm(selectedDocument.icon));
            lastSyncedDataRef.current = {
                title: norm(selectedDocument.title),
                content: norm(selectedDocument.content),
                coverImage: selectedDocument.coverImage || null,
                icon: norm(selectedDocument.icon)
            };
        } else {
            lastSyncedDataRef.current = {
                title: norm(selectedDocument.title),
                content: norm(selectedDocument.content),
                coverImage: selectedDocument.coverImage || null,
                icon: norm(selectedDocument.icon)
            };
        }
    }, [selectedDocument, title, content, coverImage, pageIcon]);

    // Autosave content (debounced)
    useEffect(() => {
        if (!selectedDocId || !selectedDocument || isLoadingDocRef.current) return;
        if (selectedDocId !== loadedDocIdRef.current) return;
        const timer = setTimeout(() => {
            if (title !== selectedDocument.title || content !== selectedDocument.content) {
                lastSyncedDataRef.current = { ...lastSyncedDataRef.current, title, content };
                updateSelectedDoc.mutate({ id: selectedDocId, title, content });
            }
        }, 1000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, content, selectedDocId]);

    const handleRenameSave = (id: string) => {
        if (!editingPageTitle.trim()) {
            setEditingPageId(null);
            return;
        }
        updateSelectedDoc.mutate({ id, title: editingPageTitle.trim() });
        if (id === selectedDocId) {
            setTitle(editingPageTitle.trim());
        }
        setEditingPageId(null);
    };

    // Collect all IDs in a page subtree (parent + all nested children from cache)
    const collectPageIds = (page: any): string[] => {
        const ids = [page.id];
        if (page.children) {
            for (const child of page.children) {
                ids.push(...collectPageIds(child));
            }
        }
        return ids;
    };

    const handleDocumentDelete = (deletedId: string) => {
        // Find the deleted page in the current list to get its full subtree
        const deletedPage = actualPages.find(p => p.id === deletedId);
        const deletedIds = new Set(deletedPage ? collectPageIds(deletedPage) : [deletedId]);

        // If the currently selected doc is in the deleted subtree, navigate away
        if (selectedDocId && deletedIds.has(selectedDocId)) {
            let nextId: string | null = null;
            for (const p of actualPages) {
                if (!deletedIds.has(p.id)) {
                    nextId = p.id;
                    break;
                }
            }
            setSelectedDocId(nextId);
        }
    };


    // Autosave settings/cover/icon (debounced)
    useEffect(() => {
        if (!selectedDocId || !selectedDocument || isLoadingDocRef.current) return;
        if (selectedDocId !== loadedDocIdRef.current) return;
        const timer = setTimeout(() => {
            const currentSettingsStr = JSON.stringify({ iconColor: pageIconColor, pageSettings });
            const prevSettingsStr = JSON.stringify(selectedDocument.settings || {});
            if (coverImage !== selectedDocument.coverImage || pageIcon !== (selectedDocument.icon ?? "") || currentSettingsStr !== prevSettingsStr) {
                lastSyncedDataRef.current = { ...lastSyncedDataRef.current, coverImage, icon: pageIcon };
                updateSelectedDoc.mutate({
                    id: selectedDocId,
                    coverImage,
                    icon: pageIcon,
                    settings: { iconColor: pageIconColor, pageSettings }
                });
            }
        }, 1500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coverImage, pageIcon, pageIconColor, pageSettings, selectedDocId]);

    const filteredPages = actualPages.filter(page =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.children?.some(child => child.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Flatten tree logic for dnd-kit
    const flattenTree = (nodes: any[], depth: number = 0): any[] => {
        return nodes.reduce((acc, node) => {
            acc.push({ ...node, depth });
            if (node.children && node.children.length > 0 && expandedPages[node.id]) {
                acc.push(...flattenTree(node.children, depth + 1));
            }
            return acc;
        }, []);
    };

    const flattenedPages = useMemo(() => flattenTree(filteredPages), [filteredPages, expandedPages]);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'child' | null>(null);
    const [projectedDepth, setProjectedDepth] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        setOverId(null);
        setDropPosition(null);
        setProjectedDepth(null);
    };

    const getProjection = (
        items: any[],
        activeId: string,
        overId: string,
        dragOffset: number
    ) => {
        const overItemIndex = items.findIndex((x) => x.id === overId);
        const activeItemIndex = items.findIndex((x) => x.id === activeId);
        if (activeItemIndex === -1 || overItemIndex === -1) return 0;
        const activeItem = items[activeItemIndex];
        const newItems = arrayMove(items, activeItemIndex, overItemIndex);
        const previousItem = newItems[overItemIndex - 1];
        const dragDepth = Math.round(dragOffset / 20); // 20px per indent level

        if (!previousItem) return 0;

        const maxDepth = previousItem.depth + 1;
        const minDepth = 0;
        return Math.max(minDepth, Math.min(maxDepth, activeItem.depth + dragDepth));
    };

    const handleDragMove = (event: any) => {
        const { active, over, delta } = event;
        if (active && over && active.id !== over.id) {
            const projected = getProjection(flattenedPages, active.id, over.id, delta.x);
            setProjectedDepth(projected);
            setOverId(over.id as string);

            const activeRect = active.rect.current.translated;
            const overRect = over.rect;
            if (activeRect && overRect) {
                const activeCenterY = activeRect.top + activeRect.height / 2;
                const overMidY = overRect.top + overRect.height / 2;
                const pos = activeCenterY < overMidY ? 'before' : 'after';
                setDropPosition(pos);
            }
        } else {
            setOverId(null);
            setDropPosition(null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over, delta } = event;

        // Capture last projected depth before clearing state
        const finalProjectedDepth = projectedDepth;
        const finalOverId = overId;

        setActiveId(null);
        setOverId(null);
        setDropPosition(null);
        setProjectedDepth(null);

        if (!over || active.id === over.id) {
            return;
        }

        const activeIdStr = active.id as string;
        const overIdStr = over.id as string;

        const activeIndex = flattenedPages.findIndex(p => p.id === activeIdStr);
        const overIndex = flattenedPages.findIndex(p => p.id === overIdStr);

        if (activeIndex === -1 || overIndex === -1) {
            return;
        }

        const dragged = flattenedPages[activeIndex];
        if (dragged && isPreferencesMemoryDoc(dragged.settings)) {
            // Preferences page must stay in the memory notebook tree (server also enforces)
            toast({
                title: "Can't move Preferences",
                description: "The Agent Preferences page can't be moved or deleted.",
                variant: "destructive",
            });
            return;
        }

        const newItems = arrayMove(flattenedPages, activeIndex, overIndex);
        const previousItem = newItems[overIndex - 1];

        // Use the captured projected depth — fall back to delta-based calculation
        let newDepth: number;
        let newParentId: string | null;

        if (finalProjectedDepth !== null && finalOverId) {
            newDepth = finalProjectedDepth;
        } else {
            newDepth = getProjection(flattenedPages, activeIdStr, overIdStr, delta.x);
        }

        if (!previousItem) {
            newDepth = 0;
            newParentId = null;
        } else if (newDepth === previousItem.depth) {
            newParentId = previousItem.parentId;
        } else if (newDepth > previousItem.depth) {
            newParentId = previousItem.id;
        } else {
            // Moving out — walk up the tree
            const diff = previousItem.depth - newDepth;
            let current = previousItem;
            for (let i = 0; i < diff; i++) {
                current = flattenedPages.find(p => p.id === current.parentId) || current;
            }
            newParentId = current.parentId ?? null;
        }

        // Get siblings in the new parent to calculate position
        const siblings = newItems.filter(p => p.parentId === newParentId);
        const newSiblingIndex = siblings.findIndex(p => p.id === activeIdStr);
        const itemBefore = siblings[newSiblingIndex - 1];
        const itemAfter = siblings[newSiblingIndex + 1];

        const newPos = generateKeyBetween(itemBefore?.position || null, itemAfter?.position || null);

        // Optimistic update
        await queryClient.cancelQueries({ queryKey: [['document', 'list']] });
        queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
            if (!oldData || !oldData.items) return oldData;

            // Helper to deeply remove item and its children
            let extractedItem: any = null;
            const removeNode = (nodes: any[]): any[] => {
                return nodes.filter(n => {
                    if (n.id === activeIdStr) {
                        extractedItem = n;
                        return false;
                    }
                    if (n.children) n.children = removeNode(n.children);
                    return true;
                });
            };

            const withoutItem = removeNode(oldData.items);
            if (!extractedItem) {
                return oldData;
            }

            extractedItem.parentId = newParentId;
            extractedItem.position = newPos;

            // Helper to deeply add item
            const addNode = (nodes: any[]): any[] => {
                if (!newParentId) return [...nodes, extractedItem].sort((a, b) => (a.position ?? "") < (b.position ?? "") ? -1 : (a.position ?? "") > (b.position ?? "") ? 1 : 0);

                return nodes.map(n => {
                    if (n.id === newParentId) {
                        return {
                            ...n,
                            children: [...(n.children || []), extractedItem].sort((a, b) => (a.position ?? "") < (b.position ?? "") ? -1 : (a.position ?? "") > (b.position ?? "") ? 1 : 0)
                        };
                    }
                    if (n.children) {
                        return { ...n, children: addNode(n.children) };
                    }
                    return n;
                });
            };

            const newList = addNode(withoutItem);
            return { ...oldData, items: newList };
        });

        reorderDocument.mutate({
            id: activeIdStr,
            parentId: newParentId,
            position: newPos,
        });
    };

    const togglePageExpand = (e: React.MouseEvent, pageId: string) => {
        e.stopPropagation();
        setExpandedPages(prev => ({
            ...prev,
            [pageId]: !prev[pageId]
        }));
    };

    const renderPageItem = (page: any) => {
        const isRoot = page.depth === 0;
        const isTemp = page.id.startsWith('temp-');

        // Use projected depth if dragging
        const displayDepth = activeId === page.id && projectedDepth !== null ? projectedDepth : page.depth;

        return (
            <div key={page.id} className={cn("flex flex-col", isTemp && "opacity-60 pointer-events-none")}>
                <div
                    className={cn("group flex w-full items-center gap-2 py-1.5 pr-2 rounded-md text-sm transition-colors cursor-pointer",
                        selectedDocId === page.id
                            ? "bg-sky-50 text-sky-700 font-medium"
                            : (isRoot ? "hover:bg-zinc-300/50 text-zinc-700" : "hover:bg-zinc-200/50 text-zinc-600"),
                        activeId === page.id && "opacity-40"
                    )}
                    style={{ paddingLeft: `${0.5 + displayDepth * 1.25}rem` }}
                    onClick={() => handleSelectDoc(page.id)}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingPageId(page.id);
                        setEditingPageTitle(page.title);
                    }}
                >
                    {page.children && page.children.length > 0 ? (
                        <div
                            className="p-0.5 -ml-1 rounded-sm hover:bg-zinc-300/50 transition-colors cursor-pointer"
                            onClick={(e) => togglePageExpand(e, page.id)}
                        >
                            <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", expandedPages[page.id] && "rotate-90")} />
                        </div>
                    ) : (
                        <div className="w-4 h-4 shrink-0" />
                    )}
                    <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                    {editingPageId === page.id ? (
                        <input
                            autoFocus
                            className="flex-1 min-w-0 bg-white border border-blue-400 rounded px-1 h-6 text-sm focus:outline-none text-zinc-900 font-normal"
                            value={editingPageTitle}
                            onChange={(e) => setEditingPageTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSave(page.id);
                                if (e.key === 'Escape') setEditingPageId(null);
                            }}
                            onBlur={() => handleRenameSave(page.id)}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className={cn(
                            "truncate flex-1",
                            isRoot && "font-medium",
                            (() => {
                                const tag = getAgentMemoryTag(page.settings);
                                if (tag?.expiresAt && new Date(tag.expiresAt) < new Date()) {
                                    return "text-zinc-400";
                                }
                                return undefined;
                            })()
                        )}>
                            {page.id === selectedDocId ? title : page.title}
                            {(() => {
                                const tag = getAgentMemoryTag(page.settings);
                                if (tag?.expiresAt && new Date(tag.expiresAt) < new Date()) {
                                    return (
                                        <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                            Expired
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </span>
                    )}

                    {/* Hover Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    className="h-5 w-5 inline-flex items-center justify-center rounded-sm hover:bg-zinc-300 text-zinc-600 focus-visible:ring-0 mr-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    onClick={(e) => handleAddPage(e, page.id)}
                                    disabled={createDocument.isPending}
                                >
                                    {createDocument.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Plus className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">Add new subpage</TooltipContent>
                        </Tooltip>
                        <DocumentActionsMenu
                            documentId={page.id}
                            workspaceId={workspaceId}
                            disableDelete={
                                (actualPages.length <= 1 && page.depth === 0) ||
                                isPreferencesMemoryDoc(page.settings)
                            }
                            onDelete={() => handleDocumentDelete(page.id)}
                            liveTitle={page.id === selectedDocId ? title : undefined}
                            liveContent={page.id === selectedDocId ? content : undefined}
                            liveIcon={page.id === selectedDocId ? pageIcon : undefined}
                            liveCoverImage={page.id === selectedDocId ? coverImage : undefined}
                            hasChildren={(page.children && page.children.length > 0)}
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderSortableItem = (page: any) => (
        <SortableDocItem
            key={page.id}
            page={page}
            projectedDepth={projectedDepth}
            overId={overId}
            activeId={activeId}
            dropPosition={dropPosition}
        >
            {renderPageItem(page)}
        </SortableDocItem>
    );

    return (
        <div className={cn(
            "flex h-full w-full bg-white text-zinc-900",
            pageSettings.fontStyle === 'serif' ? 'font-serif' : pageSettings.fontStyle === 'mono' ? 'font-mono' : 'font-sans',
            pageSettings.fontSize === 'small' ? 'text-sm' : pageSettings.fontSize === 'large' ? 'text-lg' : 'text-base'
        )}>
            {/* Sidebar */}
            {!(isSidebarCollapsed || pageSettings.focusModePage) ? (
                <div
                    className="flex flex-col shrink-0 bg-zinc-50/50 relative border-r border-zinc-200"
                    style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                >
                    {/* Resizer Handle */}
                    <div
                        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 active:bg-sky-500 z-10 transition-colors"
                        onMouseDown={startSidebarDrag}
                    />
                    <div className={cn(
                        "h-14 border-b border-zinc-200 flex items-center justify-between px-3 shrink-0",
                        isMainSidebarCollapsed && "pl-8"
                    )}>
                        <div className="flex items-center gap-2">
                            <div className="bg-sky-500 rounded p-1 flex items-center justify-center">
                                <FileText className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-semibold text-sm">Doc</span>
                            <Star className="h-3.5 w-3.5 text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors" />
                        </div>
                        <div className="flex items-center gap-0.5 text-zinc-400">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setIsSearchOpen(!isSearchOpen)}>
                                <Search className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setIsSidebarCollapsed(true)}>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {isSearchOpen && (
                        <div className="px-3 py-2 border-b border-zinc-200">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search pages..."
                                className="h-8 text-xs bg-white"
                            />
                        </div>
                    )}

                    <ScrollArea className="flex-1">
                        <div className="p-3">
                            <div className="text-[11px] font-semibold text-zinc-500 mb-2 px-2 uppercase tracking-wider">Pages</div>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragMove={handleDragMove}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={flattenedPages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-0.5 pb-4">
                                        {flattenedPages.map((page: any) => renderSortableItem(page))}
                                    </div>
                                </SortableContext>
                                <DragOverlay>
                                    {activeId ? (() => {
                                        const draggedPage = flattenedPages.find(p => p.id === activeId);
                                        return draggedPage ? (
                                            <div className="opacity-80 bg-white shadow-lg rounded-md pointer-events-none">
                                                {renderPageItem(draggedPage)}
                                            </div>
                                        ) : null;
                                    })() : null}
                                </DragOverlay>
                            </DndContext>

                            <button
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-200/50 rounded-md text-sm text-zinc-500 mt-1 transition-colors w-full text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={(e) => handleAddPage(e)}
                                disabled={createDocument.isPending}
                            >
                                {createDocument.isPending ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4 shrink-0" />
                                )}
                                <span>Add page</span>
                            </button>
                        </div>
                    </ScrollArea>
                </div>
            ) : (
                <div className="w-12 min-w-[48px] border-r border-zinc-200 flex flex-col shrink-0 bg-zinc-50/50 items-center py-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm mb-4" onClick={() => { setIsSidebarCollapsed(false); setPageSettings(prev => ({ ...prev, focusModePage: false })); }}>
                        <ChevronsRight className="h-4 w-4 text-zinc-500" />
                    </Button>
                </div>
            )}

            {/* FIX: Use flex with overflow-hidden so the main content + comments panel share space correctly */}
            <div className="flex flex-1 min-w-0 overflow-hidden relative">
                {/* Main content panel */}
                <div className={cn("flex flex-col min-w-0 bg-white relative", pageSettings.focusModeBlock && "focus-mode-block", "flex-1")}>

                    {/* Floating right action area — panel + toolbar share the same top-4 anchor */}
                    {actualPages.length > 0 && (
                        <div className="absolute top-4 right-4 flex items-start z-50 gap-4 hidden sm:flex">

                            {/* Modal panel — rendered to the LEFT of the toolbar */}
                            {activePanel !== null && pageSettings.toolbarDisplayStyle === 'modal' && (
                                <>
                                    {activePanel === 'comments' && selectedDocId && (
                                        <ResizablePanelContainer isSidebar={false} defaultWidth={360} maxHeight="calc(100vh - 40px)">
                                            <CommentsPanel
                                                documentId={selectedDocId}
                                                onClose={() => setActivePanel(null)}
                                                scope={commentsScope}
                                                workspaceId={workspaceId}
                                                spaceId={spaceId}
                                                projectId={projectId}
                                                teamId={teamId}
                                            />
                                        </ResizablePanelContainer>
                                    )}
                                    {activePanel === 'settings' && (
                                        <ResizablePanelContainer isSidebar={false} defaultWidth={360} maxHeight="calc(100vh - 40px)">
                                            <PageSettingsModal
                                                settings={{
                                                    ...pageSettings,
                                                    wordCount: content.split(/\s+/).filter(Boolean).length,
                                                    charCount: content.length,
                                                    readingTime: `${Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200))} min`
                                                }}
                                                onChange={setPageSettings}
                                                onClose={() => setActivePanel(null)}
                                            />
                                        </ResizablePanelContainer>
                                    )}
                                    {activePanel === 'relationships' && selectedDocId && (
                                        <ResizablePanelContainer isSidebar={false} defaultWidth={360} maxHeight="calc(100vh - 40px)">
                                            <RelationshipsPanel
                                                documentId={selectedDocId}
                                                workspaceId={params?.workspaceId as string}
                                                spaceId={spaceId}
                                                projectId={projectId}
                                                teamId={teamId}
                                                onClose={() => setActivePanel(null)}
                                            />
                                        </ResizablePanelContainer>
                                    )}
                                    {activePanel === 'templates' && (
                                        <ResizablePanelContainer isSidebar={false} defaultWidth={400} maxHeight="calc(100vh - 40px)">
                                            <TemplatesPanel
                                                onClose={() => setActivePanel(null)}
                                                workspaceId={workspaceId}
                                                spaceId={spaceId}
                                                projectId={projectId}
                                                listId={listId}
                                                viewId={viewId}
                                                parentDocId={selectedDocId ?? undefined}
                                                docId={selectedDocId ?? undefined}
                                                currentTitle={title}
                                                currentContent={content}
                                                currentIcon={pageIcon}
                                                currentCoverImage={coverImage}
                                                hasChildren={selectedDocHasChildren}
                                            />
                                        </ResizablePanelContainer>
                                    )}
                                    {activePanel === 'export' && (
                                        <ResizablePanelContainer isSidebar={false} defaultWidth={360} maxHeight="calc(100vh - 40px)">
                                            <ExportPanel
                                                onClose={() => setActivePanel(null)}
                                                title={title}
                                                content={content}
                                            />
                                        </ResizablePanelContainer>
                                    )}
                                </>
                            )}

                            {/* Toolbar — always on the right */}
                            <div className="flex flex-col items-center gap-1.5 text-zinc-500 bg-white/95 backdrop-blur-sm shadow-sm border border-zinc-200 rounded-xl p-1 shrink-0">
                                <TooltipProvider delayDuration={300}>
                                    {/* COMMENTS */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => setActivePanel(activePanel === 'comments' ? null : 'comments')} variant="ghost" size="icon" className={cn("h-8 w-8 rounded-sm cursor-pointer hover:bg-zinc-100 transition-colors", activePanel === 'comments' && "bg-zinc-100 text-zinc-900")}>
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="text-xs">Comment</TooltipContent>
                                    </Tooltip>

                                    {/* SETTINGS */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')} variant="ghost" size="icon" className={cn("h-8 w-8 rounded-sm cursor-pointer hover:bg-zinc-100 transition-colors", activePanel === 'settings' && "bg-zinc-100 text-zinc-900")}>
                                                <Type className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="text-xs">Page style</TooltipContent>
                                    </Tooltip>

                                    {/* RELATIONSHIPS */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => setActivePanel(activePanel === 'relationships' ? null : 'relationships')} variant="ghost" size="icon" className={cn("h-8 w-8 rounded-sm cursor-pointer hover:bg-zinc-100 transition-colors", activePanel === 'relationships' && "bg-zinc-100 text-zinc-900")}>
                                                <ArrowRightLeft className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="text-xs">Relationship</TooltipContent>
                                    </Tooltip>

                                    {/* TEMPLATES */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => setActivePanel(activePanel === 'templates' ? null : 'templates')} variant="ghost" size="icon" className={cn("h-8 w-8 rounded-sm cursor-pointer hover:bg-zinc-100 transition-colors", activePanel === 'templates' && "bg-zinc-100 text-zinc-900")}>
                                                <Wand2 className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="text-xs">Template</TooltipContent>
                                    </Tooltip>

                                    {/* EXPORT */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => setActivePanel(activePanel === 'export' ? null : 'export')} variant="ghost" size="icon" className={cn("h-8 w-8 rounded-sm cursor-pointer hover:bg-zinc-100 transition-colors", activePanel === 'export' && "bg-zinc-100 text-zinc-900")}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="text-xs">Download</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    )}


                    {actualPages.length === 0 ? (
                        <div className="flex flex-1 h-full items-center justify-center">
                            <div className="flex flex-col items-center text-center max-w-sm p-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 mb-4">
                                    <FileText className="h-6 w-6 text-sky-500" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                                    No pages yet
                                </h2>
                                <p className="text-sm text-slate-500 leading-relaxed mb-5">
                                    Create your first page to start writing, planning, or documenting anything.
                                </p>
                                <Button
                                    size="sm"
                                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                                    onClick={(e) => handleAddPage(e as any)}
                                    disabled={createDocument.isPending}
                                >
                                    {createDocument.isPending ? (
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-1.5 h-4 w-4" />
                                    )}
                                    Create a Page
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <ScrollArea className="flex-1 h-full w-full">
                                <div className="w-full flex flex-col relative">
                                    {/* Cover / Banner block */}
                                    {pageSettings.headerCoverImage && coverImage && (
                                        <div
                                            className="group relative w-full h-52 md:h-64 lg:h-72 overflow-hidden flex-shrink-0"
                                            style={{ backgroundColor: coverImage.startsWith('#') ? coverImage : '#f4f4f5' }}
                                            onMouseDown={handleMouseDown}
                                        >
                                            {!coverImage.startsWith('#') && (
                                                <div
                                                    className={cn(
                                                        "w-full h-full",
                                                        isRepositioning ? "cursor-ns-resize" : "object-cover"
                                                    )}
                                                    style={{
                                                        backgroundImage: `url(${coverImage})`,
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: `50% ${coverPositionY}%`,
                                                        backgroundRepeat: 'no-repeat',
                                                    }}
                                                />
                                            )}

                                            {!isRepositioning && (
                                                <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-50">
                                                    {!coverImage.startsWith('#') && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="h-7 px-3 bg-white/90 shadow-sm border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                oldCoverPositionY.current = coverPositionY;
                                                                setIsRepositioning(true);
                                                            }}
                                                        >
                                                            Reposition
                                                        </Button>
                                                    )}

                                                    <CoverPickerPopover
                                                        open={isCoverPickerOpen}
                                                        onOpenChange={setIsCoverPickerOpen}
                                                        onColorSelect={setCoverImage}
                                                        onUpload={handleCoverUploadFile}
                                                        isUploading={isUploadingCover}
                                                        onLinkSave={setCoverImage}
                                                        onRemove={() => setCoverImage(null)}
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="h-7 px-3 bg-white/90 shadow-sm border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                                                            disabled={isUploadingCover}
                                                        >
                                                            {isUploadingCover ? "Uploading..." : "Change cover"}
                                                        </Button>
                                                    </CoverPickerPopover>
                                                </div>
                                            )}

                                            {isRepositioning && (
                                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/60 flex items-center justify-center gap-4 text-white">
                                                    <span className="text-sm font-medium hidden sm:inline">Drag image to reposition</span>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-7 text-xs bg-white text-zinc-900 hover:bg-zinc-100"
                                                        onClick={() => setIsRepositioning(false)}
                                                    >
                                                        Save position
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs text-white hover:bg-white/20"
                                                        onClick={() => {
                                                            setCoverPositionY(oldCoverPositionY.current);
                                                            setIsRepositioning(false);
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Page content area */}
                                    <div className={cn(
                                        "w-full mx-auto px-6 md:px-12 pb-48",
                                        // When cover exists, remove top padding so icon's negative margin overlaps exactly half
                                        coverImage ? "pt-0" : "pt-16",
                                        pageSettings.pageWidth === 'full' ? 'max-w-[1200px]' : 'max-w-[900px]'
                                    )}>
                                        <div className="group relative">

                                            {/* Hover Actions Block — hidden once icon is set */}
                                            {!pageIcon && (
                                                <div className="absolute -top-10 left-0 flex items-center gap-3 text-zinc-400">
                                                    <RelationshipsQuickMenu
                                                        documentId={selectedDocId || undefined}
                                                        workspaceId={workspaceId}
                                                        spaceId={spaceId}
                                                        projectId={projectId}
                                                        teamId={teamId}
                                                    />
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button className="flex items-center gap-1.5 text-sm hover:bg-zinc-100 px-2 py-1 rounded-md transition-colors cursor-pointer">
                                                                    <span className="text-base">😀</span> Add icon
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent align="start" className="w-auto p-0 border-0 bg-transparent shadow-none">
                                                                <EnhancedIconPicker
                                                                    icon={pageIcon}
                                                                    color={pageIconColor}
                                                                    onIconChange={setPageIcon}
                                                                    onColorChange={setPageIconColor}
                                                                    spaceId={spaceId}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>

                                                        {!coverImage && (
                                                            <CoverPickerPopover
                                                                open={isCoverPickerOpen}
                                                                onOpenChange={setIsCoverPickerOpen}
                                                                onColorSelect={setCoverImage}
                                                                onUpload={handleCoverUploadFile}
                                                                isUploading={isUploadingCover}
                                                                onLinkSave={setCoverImage}
                                                                onRemove={() => setCoverImage(null)}
                                                            >
                                                                <button
                                                                    className="flex items-center gap-1.5 text-sm hover:bg-zinc-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                                                    disabled={isUploadingCover}
                                                                >
                                                                    <ImageIcon className="h-4 w-4" />
                                                                    {isUploadingCover ? "Uploading..." : "Add cover"}
                                                                </button>
                                                            </CoverPickerPopover>
                                                        )}

                                                        <button
                                                            className="flex items-center gap-1.5 text-sm hover:bg-zinc-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                                            onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
                                                        >
                                                            <Settings className="h-4 w-4" /> Settings
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Icon display — half overlapping cover when cover present */}
                                            {pageSettings.headerIconTitle && pageIcon && (
                                                <div className={cn(
                                                    "group/icon relative mb-2 w-fit",
                                                    // Pull icon up so half of it (48px) overlaps the bottom of the cover
                                                    coverImage ? "-mt-12" : "mt-2"
                                                )}>
                                                    <Popover>
                                                        <TooltipProvider delayDuration={300}>
                                                            <Tooltip>
                                                                <PopoverTrigger asChild>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={cn(
                                                                            "relative flex items-center justify-center w-24 h-24 rounded-xl transition-colors cursor-pointer",
                                                                            // Only show background on hover
                                                                            "hover:bg-zinc-100/80"
                                                                        )}>
                                                                            {(() => {
                                                                                if (pageIcon.startsWith('http') || pageIcon.startsWith('/')) {
                                                                                    return <img src={pageIcon} alt="Icon" className="w-full h-full object-contain rounded-xl" />;
                                                                                }
                                                                                if (/^[A-Z]/.test(pageIcon)) {
                                                                                    return <DynamicLucideIcon name={pageIcon} size={76} strokeWidth={2} style={{ color: pageIconColor }} />;
                                                                                }
                                                                                return <span className="text-[72px]" style={{ color: pageIconColor }}>{pageIcon}</span>;
                                                                            })()}
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                </PopoverTrigger>
                                                                <TooltipContent side="top" className="text-xs">
                                                                    Change icon
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <PopoverContent align="start" className="w-auto p-0 border-0 bg-transparent shadow-none z-50">
                                                            <EnhancedIconPicker
                                                                icon={pageIcon}
                                                                color={pageIconColor}
                                                                onIconChange={setPageIcon}
                                                                onColorChange={setPageIconColor}
                                                                spaceId={spaceId}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            )}

                                            {/* When icon IS set: show only Settings button and Add cover in hover bar BELOW the icon */}
                                            {pageIcon && (
                                                <div className="w-full mb-3 flex items-center gap-3 text-zinc-400 z-10">
                                                    <RelationshipsQuickMenu
                                                        documentId={selectedDocId || undefined}
                                                        workspaceId={workspaceId}
                                                        spaceId={spaceId}
                                                        projectId={projectId}
                                                        teamId={teamId}
                                                    />
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
                                                        {!coverImage && (
                                                            <CoverPickerPopover
                                                                open={isCoverPickerOpen}
                                                                onOpenChange={setIsCoverPickerOpen}
                                                                onColorSelect={setCoverImage}
                                                                onUpload={handleCoverUploadFile}
                                                                isUploading={isUploadingCover}
                                                                onLinkSave={setCoverImage}
                                                                onRemove={() => setCoverImage(null)}
                                                            >
                                                                <button
                                                                    className="flex items-center gap-1.5 text-sm hover:bg-zinc-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                                                    disabled={isUploadingCover}
                                                                >
                                                                    <ImageIcon className="h-4 w-4" />
                                                                    {isUploadingCover ? "Uploading..." : "Add cover"}
                                                                </button>
                                                            </CoverPickerPopover>
                                                        )}
                                                        <button
                                                            className="flex items-center gap-1.5 text-sm hover:bg-zinc-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                                            onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
                                                        >
                                                            <Settings className="h-4 w-4" /> Settings
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Title Input */}
                                            {pageSettings.headerIconTitle && (
                                                <Input
                                                    value={title}
                                                    onChange={e => {
                                                        setTitle(e.target.value);
                                                    }}
                                                    placeholder="Untitled"
                                                    variant="ghost"
                                                    className="text-4xl font-bold border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus:outline-none placeholder:text-zinc-300 h-auto mb-1 px-2 w-full rounded-none text-zinc-800 dark:text-zinc-100"
                                                />
                                            )}

                                            {/* Meta Information — increased gap from title */}
                                            {(pageSettings.headerOwners || pageSettings.headerLastModified) && (
                                                <div className="flex items-center gap-2 text-xs md:text-sm text-zinc-500 mt-5 mb-10 pb-6 border-b border-zinc-100 px-1">
                                                    {pageSettings.headerOwners && (
                                                        <>
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarFallback className="bg-zinc-800 text-white text-[10px]">D</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium text-zinc-700">Dat nguyen</span>
                                                        </>
                                                    )}
                                                    {pageSettings.headerOwners && pageSettings.headerLastModified && <span>•</span>}
                                                    {pageSettings.headerLastModified && <span>Last updated Today at 2:09 am</span>}
                                                </div>
                                            )}
                                        </div>

                                        {/* DescriptionEditor */}
                                        <div className="px-1 prose-blue max-w-none">
                                            <DescriptionEditor
                                                content={content}
                                                onChange={setContent}
                                                spaceId={spaceId}
                                                projectId={projectId}
                                                editable={true}
                                            />
                                        </div>

                                        {/* Sections */}
                                        {pageSettings.sectionSubpages && (
                                            <div className="mt-12 pt-6 border-t border-zinc-100">
                                                <h3 className="font-semibold mb-4">Subpages</h3>
                                                <div className="flex flex-col gap-2">
                                                    {selectedDocument?.children?.map((p: any) => (
                                                        <div key={p.id} className="flex items-center gap-2 text-zinc-600 hover:bg-zinc-50 p-2 rounded-md border border-zinc-100 cursor-pointer">
                                                            <FileText className="h-4 w-4" /> {p.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {pageSettings.sectionRelationships && (
                                            <div className="mt-6 pt-6 border-t border-zinc-100">
                                                <h3 className="font-semibold mb-4">Relationships</h3>
                                                <div className="bg-zinc-50/50 rounded-xl border border-zinc-100 p-2">
                                                    {selectedDocId && (
                                                        <RelationshipsPanel
                                                            documentId={selectedDocId}
                                                            workspaceId={params?.workspaceId as string}
                                                            spaceId={spaceId}
                                                            projectId={projectId}
                                                            teamId={teamId}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {pageSettings.sectionPageOutline && (
                                            <div className="mt-6 pt-6 border-t border-zinc-100">
                                                <h3 className="font-semibold mb-4">Page outline</h3>
                                                <p className="text-zinc-500 text-sm">Add headers to outline the page.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>

                            {pageSettings.statsShow && (
                                <div className="absolute bottom-6 right-8 bg-white border border-zinc-200 shadow-sm rounded-full px-4 py-2 text-xs text-zinc-500 flex gap-4 z-50">
                                    <span>Words: {content.split(/\s+/).filter(Boolean).length || 0}</span>
                                    <span>Chars: {content.length}</span>
                                    <span>Reading time: {Math.ceil((content.split(/\s+/).filter(Boolean).length || 0) / 200)} min</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Comments sidebar — resizable via drag handle on left edge */}
                {activePanel === 'comments' && pageSettings.toolbarDisplayStyle === 'sidebar' && selectedDocId && (
                    <ResizablePanelContainer isSidebar={true} defaultWidth={340} minWidth={260} maxWidth={560}>
                        <CommentsPanel
                            documentId={selectedDocId}
                            onClose={() => setActivePanel(null)}
                            scope={commentsScope}
                            workspaceId={workspaceId}
                            spaceId={spaceId}
                            projectId={projectId}
                            teamId={teamId}
                        />
                    </ResizablePanelContainer>
                )}
                {/* Settings sidebar */}
                {activePanel === 'settings' && pageSettings.toolbarDisplayStyle === 'sidebar' && (
                    <ResizablePanelContainer isSidebar={true} defaultWidth={340} minWidth={260} maxWidth={480}>
                        <PageSettingsModal
                            settings={{
                                ...pageSettings,
                                wordCount: content.split(/\s+/).filter(Boolean).length,
                                charCount: content.length,
                                readingTime: `${Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200))} min`
                            }}
                            onChange={setPageSettings}
                            onClose={() => setActivePanel(null)}
                        />
                    </ResizablePanelContainer>
                )}
                {/* Relationships sidebar */}
                {activePanel === 'relationships' && pageSettings.toolbarDisplayStyle === 'sidebar' && selectedDocId && (
                    <ResizablePanelContainer isSidebar={true} defaultWidth={360} minWidth={280} maxWidth={560}>
                        <RelationshipsPanel
                            documentId={selectedDocId}
                            workspaceId={workspaceId}
                            spaceId={spaceId}
                            projectId={projectId}
                            teamId={teamId}
                            onClose={() => setActivePanel(null)}
                        />
                    </ResizablePanelContainer>
                )}
                {/* Templates sidebar */}
                {activePanel === 'templates' && pageSettings.toolbarDisplayStyle === 'sidebar' && (
                    <ResizablePanelContainer isSidebar={true} defaultWidth={400} minWidth={300} maxWidth={600}>
                        <TemplatesPanel
                            onClose={() => setActivePanel(null)}
                            workspaceId={workspaceId}
                            spaceId={spaceId}
                            projectId={projectId}
                            listId={listId}
                            viewId={viewId}
                            parentDocId={selectedDocId ?? undefined}
                            docId={selectedDocId ?? undefined}
                            currentTitle={title}
                            currentContent={content}
                            currentIcon={pageIcon}
                            currentCoverImage={coverImage}
                            hasChildren={selectedDocHasChildren}
                        />
                    </ResizablePanelContainer>
                )}
                {/* Export sidebar */}
                {activePanel === 'export' && pageSettings.toolbarDisplayStyle === 'sidebar' && (
                    <ResizablePanelContainer isSidebar={true} defaultWidth={340} minWidth={260} maxWidth={480}>
                        <ExportPanel
                            onClose={() => setActivePanel(null)}
                            title={title}
                            content={content}
                        />
                    </ResizablePanelContainer>
                )}
            </div>
        </div>
    );
}

export default DocView;