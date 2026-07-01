"use client";

import { useState } from "react";
import { X, Search, Plus, FileText, CheckSquare, Trash2, ArrowLeftRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { trpc } from '@/lib/trpc';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface RelationshipsPanelProps {
    documentId?: string;
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    onClose?: () => void;
}

export function RelationshipsPanel({ documentId, workspaceId, spaceId, projectId, teamId, onClose }: RelationshipsPanelProps) {
    const [activeTab, setActiveTab] = useState<"this-page" | "entire-doc">("this-page");
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [relationshipSearchQuery, setRelationshipSearchQuery] = useState("");

    const utils = trpc.useUtils();

    // Fetch existing relationships
    const { data: relationships = [] } = trpc.document.listRelationships.useQuery(
        { documentId: documentId || "" },
        { enabled: !!documentId }
    );

    // Fetch workspace tasks
    const { data: tasksData } = trpc.task.list.useQuery(
        { workspaceId, spaceId, projectId, teamId, scope: "all", includeRelations: true },
        { enabled: !!(workspaceId || spaceId || projectId || teamId) && isLinkPopoverOpen }
    );
    const tasks = tasksData?.items || [];

    // Fetch workspace docs
    const { data: documentsData } = trpc.document.list.useQuery(
        { workspaceId, spaceId, projectId, teamId },
        { enabled: !!(workspaceId || spaceId || projectId || teamId) && isLinkPopoverOpen }
    );
    const documents = documentsData?.items || [];

    const createMutation = trpc.document.createRelationship.useMutation({
        onSuccess: () => {
            if (documentId) {
                utils.document.listRelationships.invalidate({ documentId });
            }
        }
    });

    const deleteMutation = trpc.document.deleteRelationship.useMutation({
        onSuccess: () => {
            if (documentId) {
                utils.document.listRelationships.invalidate({ documentId });
            }
        }
    });

    // Filter tasks based on search query
    const filteredTasks = tasks.filter(t =>
        (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) &&
        !relationships.some(r => r.targetType === "TASK" && r.targetId === t.id)
    );

    // Filter documents based on search query
    const filteredDocs = documents.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        d.id !== documentId &&
        !relationships.some(r => r.targetType === "DOCUMENT" && r.targetId === d.id)
    );

    const handleLink = (targetType: "TASK" | "DOCUMENT", targetId: string) => {
        if (!documentId) return;
        createMutation.mutate({
            documentId,
            targetType,
            targetId,
            applyToEntireDoc: activeTab === "entire-doc"
        });
        setIsLinkPopoverOpen(false);
        setSearchQuery("");
    };

    return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="flex flex-col pt-3 px-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center justify-between mb-3 h-7">
                    {isSearching ? (
                        <div className="flex items-center w-full gap-1.5">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                                    <Search className="h-3.5 w-3.5 text-zinc-400" />
                                </div>
                                <input
                                    autoFocus
                                    className="w-full pl-8 pr-3 py-1 text-sm bg-transparent outline-none placeholder:text-zinc-500 rounded-md border border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Find..."
                                    value={relationshipSearchQuery}
                                    onChange={(e) => setRelationshipSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer transition-colors shrink-0"
                                onClick={() => {
                                    setIsSearching(false);
                                    setRelationshipSearchQuery("");
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                            {onClose && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer transition-colors shrink-0" onClick={onClose}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">Relationships</h3>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer transition-colors"
                                    onClick={() => setIsSearching(true)}
                                >
                                    <Search className="h-3.5 w-3.5" />
                                </Button>
                                {onClose && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer transition-colors" onClick={onClose}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Segmented Control */}
                <div className="flex items-center p-0.5 bg-zinc-100 rounded-lg">
                    <button
                        onClick={() => setActiveTab("this-page")}
                        className={cn(
                            "flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all cursor-pointer select-none",
                            activeTab === "this-page"
                                ? "bg-white text-zinc-900 shadow-sm font-semibold"
                                : "text-zinc-500 hover:text-zinc-700 hover:bg-white/50 active:bg-white/80"
                        )}
                    >
                        This page
                    </button>
                    <button
                        onClick={() => setActiveTab("entire-doc")}
                        className={cn(
                            "flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all cursor-pointer select-none",
                            activeTab === "entire-doc"
                                ? "bg-white text-zinc-900 shadow-sm font-semibold"
                                : "text-zinc-500 hover:text-zinc-700 hover:bg-white/50 active:bg-white/80"
                        )}
                    >
                        Entire Doc
                    </button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4">
                    <div className="mb-2 text-sm font-medium text-zinc-500">
                        Page links
                    </div>

                    {/* Existing Links List */}
                    {(() => {
                        const filteredRelationships = relationships.filter(rel => {
                            if (!relationshipSearchQuery) return true;
                            const targetName = rel.targetType === "TASK"
                                ? (rel.target as any)?.title
                                : ((rel.target as any)?.title || (rel.target as any)?.name);
                            return targetName?.toLowerCase().includes(relationshipSearchQuery.toLowerCase());
                        });

                        return filteredRelationships.length > 0 ? (
                            <div className="mb-3 flex flex-col gap-1">
                                {filteredRelationships.map(rel => (
                                    <div key={rel.id} className="flex items-center justify-between group py-1.5 px-2 rounded-md hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-colors">
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                                {rel.targetType === "TASK" ? (
                                                    (() => {
                                                        const statusName = (rel.target as any)?.status?.name?.toLowerCase() || "";
                                                        if (statusName === "done" || statusName === "completed") {
                                                            return (
                                                                <div className="w-4 h-4 rounded-full bg-[#10b981] relative shrink-0">
                                                                    <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white" strokeWidth={4} />
                                                                </div>
                                                            );
                                                        } else if (statusName === "in progress" || statusName === "doing") {
                                                            return (
                                                                <div className="w-4 h-4 rounded-full bg-[#3b82f6] relative shrink-0">
                                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                                                        );
                                                    })()
                                                ) : (
                                                    <FileText className="h-4 w-4 text-blue-500" />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-zinc-800 truncate">
                                                {rel.target?.title || rel.target?.name || 'Unknown'}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 rounded-sm shrink-0"
                                            onClick={() => deleteMutation.mutate({ relationshipId: rel.id })}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : relationshipSearchQuery ? (
                            <div className="text-xs text-center text-zinc-500 py-4 mb-3">No matching links found</div>
                        ) : null;
                    })()}

                    {/* Add Relationship Popover */}
                    <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-800 transition-colors py-1.5 px-1 w-full text-left rounded-md hover:bg-zinc-50 font-medium cursor-pointer focus-visible:outline-none">
                                <Plus className="h-4 w-4 text-zinc-400" />
                                Link Task or Doc
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[300px] p-0 rounded-xl shadow-xl border-zinc-200">
                            <div className="p-2 pb-1 relative">
                                <input
                                    className="w-full px-3 py-1.5 text-sm bg-transparent outline-none placeholder:text-zinc-400 rounded-md border border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Tabs defaultValue="tasks" className="w-full">
                                <div className="px-2 pt-2 pb-2 border-b border-zinc-100/50">
                                    <TabsList className="h-8 w-full grid grid-cols-2 bg-zinc-100/80 p-0.5 rounded-md">
                                        <TabsTrigger value="tasks" className="text-xs font-medium cursor-pointer rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all focus-visible:ring-0 focus-visible:outline-none h-full">
                                            Tasks
                                        </TabsTrigger>
                                        <TabsTrigger value="docs" className="text-xs font-medium cursor-pointer rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all focus-visible:ring-0 focus-visible:outline-none h-full">
                                            Docs
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="tasks" className="m-0 p-0 outline-none">
                                    <ScrollArea className="h-[250px]">
                                        <div className="p-2">
                                            <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1 mb-1">
                                                {searchQuery ? "Search Results" : "Recent Tasks"}
                                            </div>
                                            {filteredTasks.length === 0 ? (
                                                <div className="text-xs text-center text-zinc-500 py-4">No tasks found</div>
                                            ) : (
                                                filteredTasks.map((task: any) => {
                                                    const statusName = task.status?.name?.toLowerCase() || "";
                                                    let statusIcon = (
                                                        <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                                                    );
                                                    if (statusName === "done" || statusName === "completed") {
                                                        statusIcon = (
                                                            <div className="w-4 h-4 rounded-full bg-[#10b981] relative shrink-0">
                                                                <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white" strokeWidth={4} />
                                                            </div>
                                                        );
                                                    } else if (statusName === "in progress" || statusName === "doing") {
                                                        statusIcon = (
                                                            <div className="w-4 h-4 rounded-full bg-[#3b82f6] relative shrink-0">
                                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div
                                                            key={task.id}
                                                            className="flex items-center gap-2 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer group"
                                                            onClick={() => handleLink("TASK", task.id)}
                                                        >
                                                            {statusIcon}
                                                            <span className="text-sm text-zinc-700 truncate">{task.title}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="docs" className="m-0 p-0 outline-none">
                                    <ScrollArea className="h-[250px]">
                                        <div className="p-2">
                                            <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1 mb-1">
                                                {searchQuery ? "Search Results" : "Recent Docs"}
                                            </div>
                                            {filteredDocs.length === 0 ? (
                                                <div className="text-xs text-center text-zinc-500 py-4">No docs found</div>
                                            ) : (
                                                filteredDocs.map(doc => (
                                                    <div
                                                        key={doc.id}
                                                        className="flex items-center gap-2 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer group"
                                                        onClick={() => handleLink("DOCUMENT", doc.id)}
                                                    >
                                                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                                        <span className="text-sm text-zinc-700 truncate">{doc.title}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </PopoverContent>
                    </Popover>
                </div>
            </ScrollArea>
        </div>
    );
}

export function RelationshipsQuickMenu({ documentId, workspaceId, spaceId, projectId, teamId }: RelationshipsPanelProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTopLinkPopoverOpen, setIsTopLinkPopoverOpen] = useState(false);
    const [isBottomLinkPopoverOpen, setIsBottomLinkPopoverOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const isAnyLinkPopoverOpen = isTopLinkPopoverOpen || isBottomLinkPopoverOpen;

    const utils = trpc.useUtils();

    const { data: relationships = [] } = trpc.document.listRelationships.useQuery(
        { documentId: documentId || "" },
        { enabled: !!documentId }
    );

    const { data: tasksData } = trpc.task.list.useQuery(
        { workspaceId, spaceId, projectId, teamId, scope: "all", includeRelations: true },
        { enabled: !!(workspaceId || spaceId || projectId || teamId) && isAnyLinkPopoverOpen }
    );
    const tasks = tasksData?.items || [];

    const { data: docsData } = trpc.document.list.useQuery(
        { workspaceId, spaceId, projectId, teamId, limit: 50 },
        { enabled: !!(workspaceId || spaceId || projectId || teamId) && isAnyLinkPopoverOpen }
    );
    const documents = docsData?.items || [];

    const createMutation = trpc.document.createRelationship.useMutation({
        onSuccess: () => {
            if (documentId) {
                utils.document.listRelationships.invalidate({ documentId });
            }
        }
    });

    const deleteMutation = trpc.document.deleteRelationship.useMutation({
        onSuccess: () => {
            if (documentId) {
                utils.document.listRelationships.invalidate({ documentId });
            }
        }
    });

    const handleLink = (targetType: "TASK" | "DOCUMENT", targetId: string) => {
        if (!documentId) return;
        createMutation.mutate({
            documentId,
            targetType,
            targetId,
            applyToEntireDoc: false
        });
        setIsTopLinkPopoverOpen(false);
        setIsBottomLinkPopoverOpen(false);
        setSearchQuery("");
    };

    if (relationships.length === 0) return null;

    const filteredTasks = tasks.filter(t =>
        (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) &&
        !relationships.some(r => r.targetType === "TASK" && r.targetId === t.id)
    );

    const filteredDocs = documents.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        d.id !== documentId &&
        !relationships.some(r => r.targetType === "DOCUMENT" && r.targetId === d.id)
    );

    const LinkPopoverContentRenderer = () => (
        <PopoverContent align="start" className="w-[300px] p-0 rounded-xl shadow-xl border-zinc-200">
            <div className="p-2 pb-1 relative">
                <input
                    className="w-full px-3 py-1.5 text-sm bg-transparent outline-none placeholder:text-zinc-400 rounded-md border border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Tabs defaultValue="tasks" className="w-full">
                <div className="px-2 pt-1 border-b border-zinc-200">
                    <TabsList className="h-8 w-full grid grid-cols-2 bg-zinc-100/80 p-0.5 rounded-md">
                        <TabsTrigger value="tasks" className="text-xs font-medium cursor-pointer rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all focus-visible:ring-0 focus-visible:outline-none h-full">
                            Tasks
                        </TabsTrigger>
                        <TabsTrigger value="docs" className="text-xs font-medium cursor-pointer rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all focus-visible:ring-0 focus-visible:outline-none h-full">
                            Docs
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="tasks" className="m-0 p-0 outline-none">
                    <ScrollArea className="h-[250px]">
                        <div className="p-2">
                            <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1 mb-1">
                                {searchQuery ? "Search Results" : "Recent Tasks"}
                            </div>
                            {filteredTasks.length === 0 ? (
                                <div className="text-xs text-center text-zinc-500 py-4">No tasks found</div>
                            ) : (
                                filteredTasks.map((task: any) => {
                                    const statusName = task.status?.name?.toLowerCase() || "";
                                    let statusIcon = (
                                        <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                                    );
                                    if (statusName === "done" || statusName === "completed") {
                                        statusIcon = (
                                            <div className="w-4 h-4 rounded-full bg-[#10b981] relative shrink-0">
                                                <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white" strokeWidth={4} />
                                            </div>
                                        );
                                    } else if (statusName === "in progress" || statusName === "doing") {
                                        statusIcon = (
                                            <div className="w-4 h-4 rounded-full bg-[#3b82f6] relative shrink-0">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-2 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer group"
                                            onClick={() => handleLink("TASK", task.id)}
                                        >
                                            {statusIcon}
                                            <span className="text-sm text-zinc-700 truncate">{task.title}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="docs" className="m-0 p-0 outline-none">
                    <ScrollArea className="h-[250px]">
                        <div className="p-2">
                            <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1 mb-1">
                                {searchQuery ? "Search Results" : "Recent Docs"}
                            </div>
                            {filteredDocs.length === 0 ? (
                                <div className="text-xs text-center text-zinc-500 py-4">No docs found</div>
                            ) : (
                                filteredDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center gap-2 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer group"
                                        onClick={() => handleLink("DOCUMENT", doc.id)}
                                    >
                                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                        <span className="text-sm text-zinc-700 truncate">{doc.title}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </PopoverContent>
    );

    return (
        <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm hover:bg-zinc-100 px-2 py-1 rounded-md transition-colors cursor-pointer text-zinc-500">
                    <ArrowLeftRight className="h-4 w-4" />
                    {relationships.length} Relationships
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[300px] p-3 rounded-xl shadow-xl border-zinc-200">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-zinc-500">Page links</div>
                    <Popover open={isTopLinkPopoverOpen} onOpenChange={setIsTopLinkPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-400 hover:text-zinc-700">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <LinkPopoverContentRenderer />
                    </Popover>
                </div>

                <div className="flex flex-col gap-1 mb-2">
                    {relationships.map(rel => (
                        <div key={rel.id} className="flex items-center justify-between group py-1 px-2 rounded-md hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                    {rel.targetType === "TASK" ? (
                                        (() => {
                                            const statusName = (rel.target as any)?.status?.name?.toLowerCase() || "";
                                            if (statusName === "done" || statusName === "completed") {
                                                return (
                                                    <div className="w-4 h-4 rounded-full bg-[#10b981] relative shrink-0">
                                                        <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white" strokeWidth={4} />
                                                    </div>
                                                );
                                            } else if (statusName === "in progress" || statusName === "doing") {
                                                return (
                                                    <div className="w-4 h-4 rounded-full bg-[#3b82f6] relative shrink-0">
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                                            );
                                        })()
                                    ) : (
                                        <FileText className="h-4 w-4 text-blue-500" />
                                    )}
                                </div>
                                <span className="text-sm font-medium text-zinc-800 truncate">
                                    {rel.target?.title || rel.target?.name || 'Unknown'}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 rounded-sm shrink-0"
                                onClick={() => deleteMutation.mutate({ relationshipId: rel.id })}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>

                <Popover open={isBottomLinkPopoverOpen} onOpenChange={setIsBottomLinkPopoverOpen}>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-800 transition-colors py-1.5 px-1 w-full text-left rounded-md hover:bg-zinc-50 font-medium cursor-pointer focus-visible:outline-none">
                            <Plus className="h-4 w-4 text-zinc-400" />
                            Link Task or Doc
                        </button>
                    </PopoverTrigger>
                    {/* Radix Popover needs a content inside if there are multiple Popovers, but wait, we already rendered it. We should just have the LinkPopoverContentRenderer! But it's outside. Let's just render the PopoverContent inside! */}
                    <LinkPopoverContentRenderer />
                </Popover>
            </PopoverContent>
        </Popover>
    );
}
