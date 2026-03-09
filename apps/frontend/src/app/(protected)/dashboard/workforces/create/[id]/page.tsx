"use client";

import React, { Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { LayoutGrid, Workflow, ArrowLeft, Home, Hammer, Play, Share2, PlayCircle, MoreHorizontal } from "lucide-react";
import { useWorkforceStore } from "@/features/dashboard/views/workforce/store/useWorkforceStore";
import WorkforceCanvas from "@/features/dashboard/views/workforce/WorkforceCanvas";
import SwarmView from "@/features/dashboard/views/workforce/SwarmView";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Copy, Download, History, HelpCircle, Store, Bug, Trash2 } from "lucide-react";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";
import WorkforceSidebar from "@/features/dashboard/views/workforce/WorkforceSidebar";
import WorkforceRunView from "@/features/dashboard/views/workforce/WorkforceRunView";
import WorkforceTestSidebar from "@/features/dashboard/views/workforce/WorkforceTestSidebar";
import WorkforceRunSidebar from "@/features/dashboard/views/workforce/WorkforceRunSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function WorkforceDetailContent() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const utils = trpc.useUtils();

    const { data: workforce, isLoading } = trpc.workforce.get.useQuery({ id: params.id });
    const updateWorkforce = trpc.workforce.update.useMutation({
        onSuccess: () => {
            setHasChanges(false);
            utils.workforce.get.invalidate({ id: params.id });
        }
    });

    const searchParams = useSearchParams();
    const { nodes, edges, setMode, hasChanges, setSidebarOpen, setTestSidebarOpen, setNodes, setEdges, setHasChanges } = useWorkforceStore();

    const tabParam = searchParams.get("tab");
    const [activeTab, setActiveTab] = React.useState<"build" | "run">("build");
    const [activeConversationId, setActiveConversationId] = React.useState<string | null>(
        searchParams.get("conversationId")
    );

    // Workforce conversations for this workforce (for sidebar + init)
    const { data: workforceConversations, isFetched: workforceConversationsFetched } = trpc.chat.listWorkforceConversations.useQuery(
        { workforceId: params.id ?? "" },
        { enabled: !!params.id && activeTab === "run" }
    );
    const createWorkforceConversation = trpc.chat.createWorkforceConversation.useMutation();
    const [pendingConversation, setPendingConversation] = React.useState<{
        id: string;
        title: string | null;
        createdAt: Date;
        lastMessageAt: Date | null;
        messageCount: number;
    } | null>(null);
    const [selectedTrigger, setSelectedTrigger] = React.useState<{ id: string; label: string } | null>(null);
    const [name, setName] = React.useState("");
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [autosaveEnabled, setAutosaveEnabled] = React.useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("workforce-autosave") === "true";
        }
        return false;
    });
    const nameInputRef = React.useRef<HTMLInputElement>(null);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const [workflowIcon, setWorkflowIcon] = React.useState<string>("W");
    const [workflowDescription, setWorkflowDescription] = React.useState<string>("");

    // Sync tab from URL (handles direct nav, back/forward, ?tab=run)
    React.useEffect(() => {
        const t = tabParam === "run" ? "run" : tabParam === "build" ? "build" : "build";
        setActiveTab(t);
    }, [tabParam]);

    // Sync activeConversationId from URL (back/forward, or when user removes it)
    const initConversationHandled = React.useRef<string | null>(null);
    React.useEffect(() => {
        const fromUrl = searchParams.get("conversationId");
        setActiveConversationId(fromUrl);
        if (!fromUrl && params.id) {
            initConversationHandled.current = null; // Allow init to run again when URL has no conversationId
        }
    }, [searchParams, params.id]);

    // When on run tab with no conversationId: use first existing or create new
    React.useEffect(() => {
        if (activeTab !== "run" || !workforce?.id || !workforceConversationsFetched) return;
        if (searchParams.get("conversationId")) return; // URL already has one

        const key = `${workforce.id}`;
        if (initConversationHandled.current === key) return;
        initConversationHandled.current = key;

        const first = workforceConversations?.[0];
        if (first) {
            setActiveConversationId(first.id);
            const url = new URL(window.location.href);
            url.searchParams.set("tab", "run");
            url.searchParams.set("conversationId", first.id);
            router.replace(url.pathname + url.search, { scroll: false });
        } else {
            const title = `${name || workforce.name} – run`;
            setPendingConversation({
                id: "pending",
                title,
                createdAt: new Date(),
                lastMessageAt: null,
                messageCount: 0,
            });
            createWorkforceConversation.mutateAsync({
                workforceId: workforce.id,
                workforceName: name || workforce.name,
            }).then((conv) => {
                setPendingConversation(null);
                const newConv = {
                    id: conv.id,
                    title: conv.title,
                    createdAt: new Date(),
                    lastMessageAt: null,
                    messageCount: 0,
                };
                utils.chat.listWorkforceConversations.setData(
                    { workforceId: workforce.id },
                    (old) => (old ? [newConv, ...old] : [newConv])
                );
                setActiveConversationId(conv.id);
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "run");
                url.searchParams.set("conversationId", conv.id);
                router.replace(url.pathname + url.search, { scroll: false });
            }).catch((err) => {
                setPendingConversation(null);
                console.error("[Workforce] Failed to create conversation", err);
            });
        }
    }, [activeTab, workforce?.id, workforce?.name, name, workforceConversationsFetched, workforceConversations, searchParams, router, createWorkforceConversation, utils]);

    const switchTab = (tab: "build" | "run") => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        if (activeConversationId) {
            url.searchParams.set("conversationId", activeConversationId);
        }
        router.replace(url.pathname + url.search, { scroll: false });
    };

    const toggleAutosave = (enabled: boolean) => {
        setAutosaveEnabled(enabled);
        if (typeof window !== "undefined") {
            localStorage.setItem("workforce-autosave", enabled ? "true" : "false");
        }
    };

    // Autosave: when enabled and hasChanges, debounced save (includes node edits, duplicate, sticky-note, etc.)
    React.useEffect(() => {
        if (!autosaveEnabled || !hasChanges || !workforce) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            saveTimeoutRef.current = null;
            await updateWorkforce.mutateAsync({
                id: workforce.id,
                name: name,
                nodes,
                edges,
            });
            setHasChanges(false);
            utils.workforce.get.invalidate({ id: workforce.id });
        }, 800);
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [autosaveEnabled, hasChanges, nodes, edges, name, workforce?.id, updateWorkforce, utils, workforce, setHasChanges]);

    // Sync store with database on load
    React.useEffect(() => {
        if (workforce) {
            if (workforce.mode) {
                setMode(workforce.mode as "FLOW" | "SWARM");
            }
            if (workforce.name) {
                setName(workforce.name);
            }
            if ((workforce as any).description) {
                setWorkflowDescription((workforce as any).description as string);
            }
            // Load React Flow graph either from the dedicated column (if synced) or from the fallback JSON payload
            const dataObj = workforce.data as any;
            const fallbackGraph = dataObj?.react_flow_graph;
            const primaryGraph = workforce.graph as any;

            const graph = fallbackGraph || primaryGraph;
            if (graph && typeof graph === 'object') {
                if (graph.nodes) setNodes(graph.nodes);
                if (graph.edges) setEdges(graph.edges);
            }
            // After initial load, reset changes flag
            setHasChanges(false);
        }
    }, [workforce, setMode, setNodes, setEdges, setHasChanges]);

    // Keep activeConversationId in sync with URL changes (e.g. back/forward)
    React.useEffect(() => {
        const fromUrl = searchParams.get("conversationId");
        if (fromUrl && fromUrl !== activeConversationId) {
            setActiveConversationId(fromUrl);
        }
    }, [searchParams, activeConversationId]);

    const handleSave = async () => {
        if (!workforce) return;
        await updateWorkforce.mutateAsync({
            id: workforce.id,
            name: name,
            nodes,
            edges,
        });
    };

    // Force parent main to overflow-hidden to ensure absolute screen fit
    React.useEffect(() => {
        const main = document.querySelector('main');
        if (main) {
            const original = main.style.overflowY;
            main.style.overflowY = 'hidden';
            return () => { main.style.overflowY = original; };
        }
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-muted-foreground text-sm">
                Loading workforce configuration…
            </div>
        );
    }

    const mode = workforce?.mode;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-[#fafafa] overscroll-none">
            {/* ── Top bar ──────────────────────────────────────────────────────── */}
            <div className="flex-none border-b border-zinc-200 bg-white px-4 py-2">
                <div className="flex items-center justify-between">
                    {/* Left: Home + Title + Status */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/dashboard/workforces")}
                            className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
                        >
                            <Home className="h-4 w-4 text-zinc-600" />
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 flex items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold text-zinc-800">
                                {workflowIcon || <Workflow className="h-4 w-4 text-zinc-600" />}
                            </div>
                            <div className="flex items-center gap-2 group">
                                {isEditingName ? (
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            setHasChanges(true);
                                        }}
                                        onBlur={() => setIsEditingName(false)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') setIsEditingName(false);
                                        }}
                                        autoFocus
                                        className="text-sm font-semibold text-zinc-900 bg-zinc-100 border-none rounded px-1 outline-none focus:ring-2 ring-indigo-500/20 w-auto min-w-[120px] py-1"
                                    />
                                ) : (
                                    <h1
                                        onClick={() => setIsEditingName(true)}
                                        className="text-sm font-semibold text-zinc-900 cursor-pointer hover:bg-zinc-100 px-1 rounded transition-colors py-1"
                                    >
                                        {name || "New workforce"}
                                    </h1>
                                )}
                            </div>
                            {!autosaveEnabled && hasChanges ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-orange-100 bg-orange-50/50 text-[10px] font-medium text-orange-600">
                                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                    Unsaved
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-100 bg-emerald-50/50 text-[10px] font-medium text-emerald-600">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {autosaveEnabled ? "Autosaved" : "Live"}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center: Build / Run Tabs */}
                    <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                        <button
                            onClick={() => switchTab("build")}
                            type="button"
                            className={`flex items-center gap-2 px-6 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${activeTab === "build" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                                }`}
                        >
                            <Hammer className="h-3.5 w-3.5" />
                            Build
                        </button>
                        <button
                            onClick={() => switchTab("run")}
                            type="button"
                            className={`flex items-center gap-2 px-6 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${activeTab === "run" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                                }`}
                        >
                            <Play className="h-3.5 w-3.5" />
                            Run
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-zinc-400">
                            <Share2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Share</span>
                        </div>

                        <button
                            onClick={() => {
                                setTestSidebarOpen(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                        >
                            <PlayCircle className="h-4 w-4" />
                            Test
                        </button>

                        <div className="h-4 w-px bg-zinc-200" />

                        {hasChanges ? (
                            <button
                                onClick={handleSave}
                                disabled={updateWorkforce.isPending}
                                className="px-4 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {updateWorkforce.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <div className="h-1 w-1 rounded-full bg-zinc-300" />
                                <span className="text-xs font-medium">Saved</span>
                            </div>
                        )}

                        <button className="px-4 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                            Publish
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 text-zinc-700 font-medium">
                                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                                    <Settings2 className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <div
                                    className="flex items-center justify-between px-2 py-2 cursor-default"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span className="text-sm font-medium">Autosave</span>
                                    <Switch
                                        checked={autosaveEnabled}
                                        onCheckedChange={toggleAutosave}
                                    />
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSidebarOpen(true, 'VERSIONS')}>
                                    <History className="mr-2 h-4 w-4" />
                                    <span>Versions</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Copy className="mr-2 h-4 w-4" />
                                    <span>Copy link</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Download className="mr-2 h-4 w-4" />
                                    <span>Export</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Store className="mr-2 h-4 w-4" />
                                    <span>Update Marketplace listing</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Bug className="mr-2 h-4 w-4" />
                                    <span>Report Bug</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <HelpCircle className="mr-2 h-4 w-4" />
                                    <span>Help</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete workforce</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* ── Main canvas / swarm view / run view ───────────────────────────── */}
            <div className="flex-1 w-full relative overflow-hidden flex">
                {activeTab === "run" ? (
                    <>
                        <WorkforceRunSidebar
                            workforceName={name || workforce!.name}
                            conversations={workforceConversations ?? []}
                            pendingConversation={pendingConversation}
                            selectedConversationId={activeConversationId}
                            onSelectConversation={(id) => {
                                setActiveConversationId(id);
                                const url = new URL(window.location.href);
                                url.searchParams.set("tab", "run");
                                url.searchParams.set("conversationId", id);
                                router.replace(url.pathname + url.search, { scroll: false });
                            }}
                            onNewTask={async () => {
                                const title = `${name || workforce!.name} – run`;
                                setPendingConversation({
                                    id: "pending",
                                    title,
                                    createdAt: new Date(),
                                    lastMessageAt: null,
                                    messageCount: 0,
                                });
                                try {
                                    const conv = await createWorkforceConversation.mutateAsync({
                                        workforceId: workforce!.id,
                                        workforceName: name || workforce!.name,
                                    });
                                    setPendingConversation(null);
                                    const newConv = {
                                        id: conv.id,
                                        title: conv.title,
                                        createdAt: new Date(),
                                        lastMessageAt: null,
                                        messageCount: 0,
                                    };
                                    utils.chat.listWorkforceConversations.setData(
                                        { workforceId: workforce!.id },
                                        (old) => (old ? [newConv, ...old] : [newConv])
                                    );
                                    setActiveConversationId(conv.id);
                                    const url = new URL(window.location.href);
                                    url.searchParams.set("tab", "run");
                                    url.searchParams.set("conversationId", conv.id);
                                    router.replace(url.pathname + url.search, { scroll: false });
                                } catch (err) {
                                    setPendingConversation(null);
                                    console.error("[Workforce] Failed to create conversation", err);
                                }
                            }}
                        />
                        <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
                            <WorkforceRunView
                                workforceId={workforce!.id}
                                workforceName={name || workforce!.name}
                                initialConversationId={activeConversationId}
                                onConversationReady={(conversationId) => {
                                    setActiveConversationId(conversationId);
                                    const url = new URL(window.location.href);
                                    url.searchParams.set("tab", "run");
                                    url.searchParams.set("conversationId", conversationId);
                                    router.replace(url.pathname + url.search, { scroll: false });
                                }}
                            />
                        </div>
                    </>
                ) : mode === "FLOW" ? (
                    <div className="flex-1 h-full w-full min-w-0">
                        <WorkforceCanvas />
                    </div>
                ) : (
                    <SwarmView />
                )}
                {activeTab === "build" && <WorkforceSidebar workspaceId={workforce?.workspaceId} />}
                {activeTab === "build" && (
                    <WorkforceTestSidebar
                        workforceId={workforce!.id}
                        workforceName={name || workforce?.name ?? "Workforce"}
                        selectedTrigger={selectedTrigger}
                        onSelectTrigger={(triggerId, triggerLabel) => {
                            setSelectedTrigger({ id: triggerId, label: triggerLabel });
                        }}
                        onBackToTriggerList={() => setSelectedTrigger(null)}
                        onClose={() => setSelectedTrigger(null)}
                    />
                )}
            </div>

            {/* Settings modal for workforce icon / title / description */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Workflow settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-1">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 flex items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold text-zinc-800">
                                {workflowIcon || "W"}
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-zinc-700 mb-1">
                                    Icon (emoji or letter)
                                </label>
                                <input
                                    value={workflowIcon}
                                    onChange={(e) => setWorkflowIcon(e.target.value.slice(0, 2))}
                                    placeholder="e.g. 🔁"
                                    className="h-8 text-sm w-full border border-zinc-200 rounded-md px-2"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">
                                Title
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="New workflow"
                                className="h-8 text-sm w-full border border-zinc-200 rounded-md px-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={workflowDescription}
                                onChange={(e) => setWorkflowDescription(e.target.value)}
                                placeholder="Describe what this workflow does…"
                                className="min-h-[80px] text-sm w-full border border-zinc-200 rounded-md px-2 py-1"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                className="h-8 px-4 text-xs font-semibold rounded-md bg-zinc-900 text-white hover:bg-zinc-800"
                                onClick={() => setSettingsOpen(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function WorkforceDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center text-muted-foreground text-sm">
                Loading workforce…
            </div>
        }>
            <WorkforceDetailContent />
        </Suspense>
    );
}
