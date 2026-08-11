"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Workflow, Home, Hammer, Play, Share2, MoreHorizontal, SaveCheck } from "lucide-react";
import { useWorkforceStore, DEFAULT_WORKFORCE_TRIGGER_NODES } from "@/entities/workforce/hooks/useWorkforceStore";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Copy, Download, History, HelpCircle, Store, Bug, Trash2, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function WorkforceLoadingState() {
    return (
        <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
                <div className="absolute h-24 w-24 animate-pulse rounded-full bg-primary/5 blur-xl" />
                <div className="absolute h-16 w-16 animate-[spin_3s_linear_infinite] rounded-full border-b-2 border-l-2 border-primary/30" />
                <div className="absolute h-12 w-12 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-t-2 border-r-2 border-primary/60" />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-background ring-1 ring-border shadow-sm backdrop-blur-sm">
                    <Workflow className="h-4 w-4 text-primary animate-pulse" />
                </div>
            </div>
            <div className="mt-8 flex flex-col items-center space-y-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium tracking-widest text-foreground uppercase">Initializing</h3>
                </div>
                <p className="text-xs text-muted-foreground animate-pulse">Loading workforce configuration...</p>
            </div>
        </div>
    );
}

const WorkforceCanvas = dynamic(() => import("@/features/dashboard/views/workforce/workflow/WorkforceCanvas"), { ssr: false, loading: () => null });
const SwarmView = dynamic(() => import("@/features/dashboard/views/workforce/swarm/SwarmView"), { ssr: false, loading: () => null });
const WorkforceSidebar = dynamic(() => import("@/features/dashboard/views/workforce/workflow/WorkforceSidebar"), { ssr: false, loading: () => null });
const WorkforceRunView = dynamic(() => import("@/features/dashboard/views/workforce/workflow/WorkforceRunView"), { ssr: false, loading: () => null });
const WorkforceRunSidebar = dynamic(() => import("@/features/dashboard/views/workforce/workflow/WorkforceRunSidebar"), { ssr: false, loading: () => null });
const SwarmRunView = dynamic(() => import("@/features/dashboard/views/workforce/swarm/SwarmRunView"), { ssr: false, loading: () => null });

function WorkforceDetailContent() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const utils = trpc.useUtils();

    const { data: workforce, isLoading } = trpc.workforce.get.useQuery(
        { id: params.id },
        { staleTime: 60_000, refetchOnWindowFocus: false },
    );
    const updateWorkforce = trpc.workforce.update.useMutation({
        onSuccess: (_data, variables) => {
            setHasChanges(false);
            // Soft-merge cache instead of invalidate — avoids remounting the canvas
            utils.workforce.get.setData({ id: variables.id }, (old) =>
                old
                    ? {
                        ...old,
                        name: variables.name ?? old.name,
                        description: variables.description ?? old.description,
                        icon: (variables as any).icon ?? (old as any).icon,
                        color: (variables as any).color ?? (old as any).color,
                    }
                    : old
            );
        }
    });

    const searchParams = useSearchParams();
    // Narrow store subscriptions — avoid re-rendering the whole page on every node drag
    const hasChanges = useWorkforceStore((s) => s.hasChanges);
    const setMode = useWorkforceStore((s) => s.setMode);
    const setSidebarOpen = useWorkforceStore((s) => s.setSidebarOpen);
    const hydrateGraph = useWorkforceStore((s) => s.hydrateGraph);
    const setHasChanges = useWorkforceStore((s) => s.setHasChanges);

    const tabParam = searchParams.get("tab");
    const conversationParam = searchParams.get("conversationId");
    const [activeTab, setActiveTab] = React.useState<"build" | "run">(
        () => (tabParam === "run" ? "run" : "build")
    );
    const [runPaneReady, setRunPaneReady] = React.useState(() => tabParam === "run");
    const [buildPaneReady, setBuildPaneReady] = React.useState(() => tabParam !== "run");
    const [activeConversationId, setActiveConversationId] = React.useState<string | null>(
        conversationParam
    );
    const hydratedWorkforceId = React.useRef<string | null>(null);
    const initConversationHandled = React.useRef<string | null>(null);

    // Workforce conversations for this workforce (for sidebar + init)
    const { data: workforceConversations, isFetched: workforceConversationsFetched } = trpc.chat.listWorkforceConversations.useQuery(
        { workforceId: params.id ?? "", mode: (workforce?.mode as "FLOW" | "SWARM") || "FLOW" },
        { enabled: !!params.id && activeTab === "run" && !!workforce, staleTime: 30_000, refetchOnWindowFocus: false }
    );
    const createWorkforceConversation = trpc.chat.createWorkforceConversation.useMutation();
    const [pendingConversation, setPendingConversation] = React.useState<{
        id: string;
        title: string | null;
        createdAt: Date;
        lastMessageAt: Date | null;
        messageCount: number;
    } | null>(null);
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
    const [workflowIcon, setWorkflowIcon] = React.useState<string>("");
    const [workflowColor, setWorkflowColor] = React.useState<string>("");
    const [workflowDescription, setWorkflowDescription] = React.useState<string>("");

    // Sync tab from URL only when it actually differs (avoids redundant setState)
    React.useEffect(() => {
        const t = tabParam === "run" ? "run" : "build";
        setActiveTab((prev) => (prev === t ? prev : t));
        if (t === "run") setRunPaneReady(true);
        if (t === "build") setBuildPaneReady(true);
    }, [tabParam]);

    // Sync conversationId from URL (Run tab only — Build strips it from the URL on purpose)
    React.useEffect(() => {
        if (tabParam === "run") {
            setActiveConversationId((prev) => (prev === conversationParam ? prev : conversationParam));
            if (!conversationParam && params.id) {
                initConversationHandled.current = null;
            }
        }
    }, [conversationParam, tabParam, params.id]);

    // When on run tab with no conversationId: use first existing or create new
    React.useEffect(() => {
        if (activeTab !== "run" || !workforce?.id || !workforceConversationsFetched) return;
        if (conversationParam) return;

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
                mode: (workforce.mode as "FLOW" | "SWARM") || "FLOW",
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
                    { workforceId: workforce.id, mode: (workforce.mode as "FLOW" | "SWARM") || "FLOW" },
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
    }, [activeTab, workforce?.id, workforce?.name, workforce?.mode, name, workforceConversationsFetched, workforceConversations, conversationParam, router, createWorkforceConversation, utils]);

    const switchTab = (tab: "build" | "run") => {
        if (tab === activeTab) return;

        if (tab === "run") setRunPaneReady(true);
        if (tab === "build") setBuildPaneReady(true);

        setActiveTab(tab);
        setSidebarOpen(false);

        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        if (tab === "run" && activeConversationId) {
            url.searchParams.set("conversationId", activeConversationId);
        } else {
            url.searchParams.delete("conversationId");
        }
        router.replace(url.pathname + url.search, { scroll: false });

        if (tab === "run" && hasChanges && workforce) {
            const { nodes, edges } = useWorkforceStore.getState();
            void updateWorkforce.mutateAsync({
                id: workforce.id,
                name: name,
                nodes,
                edges,
            }).catch((err) => {
                console.error("[Workforce] Failed to save before run", err);
            });
        }
    };

    const toggleAutosave = (enabled: boolean) => {
        setAutosaveEnabled(enabled);
        if (typeof window !== "undefined") {
            localStorage.setItem("workforce-autosave", enabled ? "true" : "false");
        }
    };

    // Autosave via store subscription — page does not re-render on node drag
    React.useEffect(() => {
        if (!autosaveEnabled || !workforce?.id) return;
        const workforceId = workforce.id;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const flush = () => {
            timer = null;
            const { nodes, edges, hasChanges: dirty } = useWorkforceStore.getState();
            if (!dirty) return;
            void updateWorkforce.mutateAsync({
                id: workforceId,
                name: nameInputRef.current?.value || name,
                nodes,
                edges,
            });
        };

        const unsub = useWorkforceStore.subscribe((state, prev) => {
            if (!state.hasChanges) return;
            // Graph or dirty flag changed
            if (
                state.hasChanges !== prev.hasChanges ||
                state.nodes !== prev.nodes ||
                state.edges !== prev.edges
            ) {
                if (timer) clearTimeout(timer);
                timer = setTimeout(flush, 800);
            }
        });

        // If already dirty when enabling, schedule once
        if (useWorkforceStore.getState().hasChanges) {
            timer = setTimeout(flush, 800);
        }

        return () => {
            unsub();
            if (timer) clearTimeout(timer);
        };
    }, [autosaveEnabled, workforce?.id, name, updateWorkforce]);

    // Hydrate canvas once per workforce id — never on every refetch
    React.useEffect(() => {
        if (!workforce) return;
        if (hydratedWorkforceId.current === workforce.id) {
            // Soft-sync metadata only (name/icon) without touching the graph
            if (workforce.name) setName((prev) => (prev === workforce.name ? prev : workforce.name));
            if ((workforce as any).description != null) {
                setWorkflowDescription((prev) =>
                    prev === (workforce as any).description ? prev : ((workforce as any).description as string)
                );
            }
            if ((workforce as any).icon != null) {
                setWorkflowIcon((prev) =>
                    prev === (workforce as any).icon ? prev : ((workforce as any).icon as string)
                );
            }
            if ((workforce as any).color != null) {
                setWorkflowColor((prev) =>
                    prev === (workforce as any).color ? prev : ((workforce as any).color as string)
                );
            }
            return;
        }

        hydratedWorkforceId.current = workforce.id;
        initConversationHandled.current = null;

        if (workforce.mode) setMode(workforce.mode as "FLOW" | "SWARM");
        if (workforce.name) setName(workforce.name);
        setWorkflowDescription(((workforce as any).description as string) || "");
        setWorkflowIcon(((workforce as any).icon as string) || "");
        setWorkflowColor(((workforce as any).color as string) || "");

        const dataObj = workforce.data as any;
        const fallbackGraph = dataObj?.react_flow_graph;
        const primaryGraph = workforce.graph as any;
        const graph = fallbackGraph || primaryGraph;

        if (graph && typeof graph === "object" && Array.isArray(graph.nodes) && graph.nodes.length > 0) {
            hydrateGraph(graph.nodes, Array.isArray(graph.edges) ? graph.edges : []);
        } else {
            hydrateGraph(
                DEFAULT_WORKFORCE_TRIGGER_NODES.map((n) => ({ ...n, data: { ...n.data } })),
                []
            );
        }
    }, [workforce, setMode, hydrateGraph]);

    // Reset hydrate guard when navigating to another workforce
    React.useEffect(() => {
        if (hydratedWorkforceId.current && hydratedWorkforceId.current !== params.id) {
            hydratedWorkforceId.current = null;
        }
        setSidebarOpen(false);
    }, [params.id, setSidebarOpen]);

    React.useEffect(() => {
        if (workforce?.mode === "SWARM") {
            setSidebarOpen(false);
        }
    }, [workforce?.mode, setSidebarOpen]);

    const handleSave = async () => {
        if (!workforce) return;
        const { nodes, edges } = useWorkforceStore.getState();
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

    if (isLoading || !workforce) {
        return <WorkforceLoadingState />;
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
                            className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                        >
                            <Home className="h-4 w-4 text-zinc-600" />
                        </button>

                        <div className="flex items-center gap-2">
                            <IconColorSelector
                                icon={workflowIcon}
                                color={workflowColor}
                                onIconChange={(newIcon) => {
                                    setWorkflowIcon(newIcon);
                                    if (workforce?.id) updateWorkforce.mutate({ id: workforce.id, icon: newIcon });
                                }}
                                onColorChange={(newColor) => {
                                    setWorkflowColor(newColor);
                                    if (workforce?.id) updateWorkforce.mutate({ id: workforce.id, color: newColor });
                                }}
                            >
                                <div
                                    className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md text-base font-semibold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: workflowIcon ? workflowColor : '#f4f4f5', color: workflowIcon ? '#ffffff' : '#27272a' }}
                                >
                                    {workflowIcon ? <EntityIcon icon={workflowIcon} size={16} fallback={Workflow} /> : <Workflow className="h-4 w-4 text-zinc-600" />}
                                </div>
                            </IconColorSelector>

                            {/* Inline editable name */}
                            <div className="flex items-center gap-3 group">
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
                                        className="h-8 text-sm font-semibold text-zinc-900 bg-zinc-100 border-none rounded px-1.5 outline-none focus:ring-1 ring-indigo-500/50 w-auto min-w-[120px] py-1"
                                    />
                                ) : (
                                    <h1
                                        onClick={() => setIsEditingName(true)}
                                        className="text-sm font-semibold text-zinc-900 cursor-pointer hover:bg-zinc-100 px-1.5 rounded-sm transition-colors py-1.5 h-8"
                                    >
                                        {name || "New workforce"}
                                    </h1>
                                )}
                            </div>

                            {/* Status pill */}
                            {!autosaveEnabled && hasChanges ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-orange-100 bg-orange-50/50 text-sm font-medium text-orange-600">
                                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                    Unsaved
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-emerald-100 bg-emerald-50/50 text-sm font-medium text-emerald-600">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {autosaveEnabled ? "Autosaved" : "Live"}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center: Build / Run Tabs */}
                    <div className="flex items-center justify-center flex-1">
                      <Tabs value={activeTab} onValueChange={(v) => switchTab(v as "build" | "run")} className="w-[200px]">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="build" className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Hammer className="w-3 h-3" />Build
                          </TabsTrigger>
                          <TabsTrigger value="run" className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Play className="w-3 h-3" />Run
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-zinc-400 h-8">
                            <Share2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Share</span>
                        </div>

                        {hasChanges ? (
                            <button
                                onClick={handleSave}
                                disabled={updateWorkforce.isPending}
                                className="h-8 px-4 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                {updateWorkforce.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        ) : (
                            <div className="flex h-8 items-center gap-1.5 text-zinc-400">
                                <div className="h-1 w-1 rounded-full bg-zinc-300" />
                                <span className="text-xs font-medium">Saved</span>
                            </div>
                        )}

                        <button className="h-8 px-4 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
                            Publish
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors cursor-pointer">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 text-zinc-700 font-normal">
                                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                                    <Settings2 className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <div
                                    className="flex items-center justify-between px-2 py-2 cursor-default"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex gap-2 items-center">
                                        <SaveCheck className="mr-2 h-4 w-4" />
                                        <span className="text-sm font-normal">Autosave</span>
                                    </div>
                                    <Switch
                                        checked={autosaveEnabled}
                                        onCheckedChange={toggleAutosave}
                                    />
                                </div>
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
                {runPaneReady && (
                <div
                    className={cn(
                        "absolute inset-0 flex",
                        activeTab === "run"
                            ? "z-10 visible"
                            : "z-0 invisible pointer-events-none"
                    )}
                    aria-hidden={activeTab !== "run"}
                >
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
                                    mode: (workforce!.mode as "FLOW" | "SWARM") || "FLOW",
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
                                    { workforceId: workforce!.id, mode: (workforce!.mode as "FLOW" | "SWARM") || "FLOW" },
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
                        {mode === "FLOW" ? (
                            <WorkforceRunView
                                key={`${workforce!.id}:${activeConversationId || "pending"}`}
                                workforceId={workforce!.id}
                                workforceName={name || workforce!.name}
                                initialConversationId={activeConversationId}
                                onConversationReady={(conversationId) => {
                                    setActiveConversationId((prev) =>
                                        prev === conversationId ? prev : conversationId
                                    );
                                    const url = new URL(window.location.href);
                                    url.searchParams.set("tab", "run");
                                    url.searchParams.set("conversationId", conversationId);
                                    router.replace(url.pathname + url.search, { scroll: false });
                                }}
                            />
                        ) : (
                            <SwarmRunView
                                key={`${workforce!.id}:${activeConversationId || "pending"}`}
                                workforceId={workforce!.id}
                                workforceName={name || workforce!.name}
                                initialConversationId={activeConversationId}
                                onConversationReady={(conversationId) => {
                                    setActiveConversationId((prev) =>
                                        prev === conversationId ? prev : conversationId
                                    );
                                    const url = new URL(window.location.href);
                                    url.searchParams.set("tab", "run");
                                    url.searchParams.set("conversationId", conversationId);
                                    router.replace(url.pathname + url.search, { scroll: false });
                                }}
                            />
                        )}
                    </div>
                </div>
                )}

                {buildPaneReady && (
                <div
                    className={cn(
                        "absolute inset-0 flex",
                        activeTab === "build"
                            ? "z-10 visible"
                            : "z-0 invisible pointer-events-none"
                    )}
                    aria-hidden={activeTab !== "build"}
                >
                    {mode === "FLOW" ? (
                        <div className="flex-1 h-full w-full min-w-0 relative">
                            <WorkforceCanvas workforceId={workforce!.id} workforceName={name || workforce!.name} workspaceId={workforce?.workspaceId ?? undefined} />
                            <WorkforceSidebar workspaceId={workforce?.workspaceId ?? undefined} />
                        </div>
                    ) : (
                        <SwarmView
                            activeTab="build"
                            workforceId={workforce!.id}
                            workforceName={name || workforce!.name}
                            initialConversationId={activeConversationId}
                            onConversationReady={(conversationId) => {
                                setActiveConversationId((prev) =>
                                    prev === conversationId ? prev : conversationId
                                );
                                const url = new URL(window.location.href);
                                url.searchParams.set("tab", "run");
                                url.searchParams.set("conversationId", conversationId);
                                router.replace(url.pathname + url.search, { scroll: false });
                            }}
                        />
                    )}
                </div>
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
                            <IconColorSelector
                                icon={workflowIcon}
                                color={workflowColor}
                                onIconChange={(newIcon) => {
                                    setWorkflowIcon(newIcon);
                                    if (workforce?.id) updateWorkforce.mutate({ id: workforce.id, icon: newIcon });
                                }}
                                onColorChange={(newColor) => {
                                    setWorkflowColor(newColor);
                                    if (workforce?.id) updateWorkforce.mutate({ id: workforce.id, color: newColor });
                                }}
                            >
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-lg shrink-0 overflow-hidden"
                                    style={{ backgroundColor: workflowIcon ? workflowColor : '#f4f4f5', color: workflowIcon ? '#ffffff' : '#27272a', border: 'none' }}
                                >
                                    {workflowIcon ? <EntityIcon icon={workflowIcon} size={20} fallback={Workflow} /> : <Workflow className="h-5 w-5" />}
                                </Button>
                            </IconColorSelector>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-zinc-700 !mb-1.5">
                                    Title
                                </label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="New workflow"
                                    className="h-8 text-sm w-full border border-zinc-200 rounded-md px-2 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 !mb-1.5">
                                Description
                            </label>
                            <Textarea
                                value={workflowDescription}
                                onChange={(e) => setWorkflowDescription(e.target.value)}
                                placeholder="Describe what this workflow does…"
                                className="min-h-[80px] text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400 shadow-none"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                className="h-8 px-4 text-xs font-semibold rounded-md bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
                                onClick={() => setSettingsOpen(false)}
                            >
                                Save
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
        <Suspense fallback={<WorkforceLoadingState />}>
            <WorkforceDetailContent />
        </Suspense>
    );
}
