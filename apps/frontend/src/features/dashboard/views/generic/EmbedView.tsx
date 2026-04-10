"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Maximize2, RefreshCw, ExternalLink, AlertCircle, X, Pin, Lock, Home, Link as LinkIcon, Users, Settings, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface EmbedViewProps {
    spaceId?: string;
    projectId?: string;
    folderId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    initialConfig?: Record<string, any> | null;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    context?: "space" | "project" | "team" | "folder" | "list";
}

// Popular embed providers with optimized handling
const EMBED_PROVIDERS = {
    youtube: {
        pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
        transform: (url: string) => {
            const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
            return match ? `https://www.youtube.com/embed/${match[1]}` : url;
        }
    },
    vimeo: {
        pattern: /vimeo\.com\/(\d+)/,
        transform: (url: string) => {
            const match = url.match(/vimeo\.com\/(\d+)/);
            return match ? `https://player.vimeo.com/video/${match[1]}` : url;
        }
    },
    figma: {
        pattern: /figma\.com\/(file|proto|design|board|embed)/,
        transform: (url: string) => {
            // Already an official embed URL — use as-is
            if (url.includes('figma.com/embed')) return url;
            // Transform any public Figma share link into the official embed URL
            return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
        }
    },
    googleSheets: {
        pattern: /docs\.google\.com\/spreadsheets/,
        transform: (url: string) => {
            if (url.includes('/pubhtml') || url.includes('/htmlembed') || url.includes('/preview')) return url;
            return url.replace(/\/(edit|view)(.*)/, '/preview');
        }
    },
    googleDocs: {
        pattern: /docs\.google\.com\/document/,
        transform: (url: string) => {
            if (url.includes('/preview') || url.includes('/pub')) return url;
            return url.replace(/\/(edit|view)(.*)?$/, '/preview');
        }
    },
    googleSlides: {
        pattern: /docs\.google\.com\/presentation/,
        transform: (url: string) => {
            if (url.includes('/embed') || url.includes('/preview')) return url;
            // /edit → /embed?start=false&loop=false&delayms=3000
            return url.replace(/\/(edit|pub)([^?]*)(\?.*)?$/, '/embed$2?start=false&loop=false&delayms=3000');
        }
    },
    googleForms: {
        pattern: /docs\.google\.com\/forms/,
        transform: (url: string) => {
            if (url.includes('/viewform') || url.includes('/embed')) return url;
            return url.replace(/\/(edit)([^?]*)(\?.*)?$/, '/viewform$2');
        }
    },
    googleCalendar: {
        pattern: /calendar\.google\.com/,
        transform: (url: string) => {
            // Already an embed URL
            if (url.includes('/embed')) return url;
            try {
                const parsed = new URL(url);
                // Handle ?src= format (e.g. from "share this calendar" dialog)
                const src = parsed.searchParams.get('src');
                if (src) {
                    return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(src)}&ctz=UTC`;
                }
                // Handle /r/ or /u/ style URLs — swap to /embed
                return url.replace(/\/calendar\/(r|u\/\d+)(\/.*)?$/, '/calendar/embed');
            } catch {
                return url;
            }
        }
    },
    googleMaps: {
        pattern: /(?:maps\.google\.com|google\.com\/maps|goo\.gl\/maps)/,
        transform: (url: string) => {
            // Already an embed URL
            if (url.includes('/maps/embed')) return url;
            try {
                const parsed = new URL(url);
                // Standard share URL with ?q= param
                const q = parsed.searchParams.get('q');
                if (q) {
                    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
                }
                // Try to extract coordinates from /place/ URLs like /@lat,lng,zoom
                const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (coordMatch) {
                    const [, lat, lng] = coordMatch;
                    return `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=14`;
                }
                // Try to extract a place name from the URL path
                const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/);
                if (placeMatch) {
                    const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
                    return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`;
                }
                // Fallback: append output=embed
                const separator = url.includes('?') ? '&' : '?';
                return `${url}${separator}output=embed`;
            } catch {
                return url;
            }
        }
    },
    googleDrive: {
        pattern: /drive\.google\.com/,
        transform: (url: string) => {
            // Already a preview URL
            if (url.includes('/preview')) return url;
            // File: /file/d/{id}/view → /file/d/{id}/preview
            const fileMatch = url.match(/\/file\/d\/([^/]+)/);
            if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
            return url;
        }
    },
    airtable: {
        pattern: /airtable\.com/,
        transform: (url: string) => url
    },
    miro: {
        pattern: /miro\.com/,
        transform: (url: string) => url
    },
    notion: {
        pattern: /notion\.so/,
        transform: (url: string) => url
    },
    loom: {
        pattern: /loom\.com\/share/,
        transform: (url: string) => url.replace('/share/', '/embed/')
    }
};

/**
 * Wraps raw HTML embed code in a full document that centers the content.
 * This ensures embeds like Figma's <iframe> snippet don't sit top-left
 * inside the srcDoc iframe.
 */
const wrapHtmlForEmbed = (html: string): string => {
    return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    overflow: hidden;
  }
</style>
</head>
<body>${html}</body>
</html>`;
};

export function EmbedView({
    viewId,
    spaceId,
    projectId,
    folderId,
    teamId,
    listId,
    initialConfig,
}: EmbedViewProps) {
    // Derive config values from initialConfig
    const configUrl = (initialConfig as any)?.url ?? "";
    const isReadOnly = (initialConfig as any)?.isReadOnly ?? false;
    const height = (initialConfig as any)?.height ?? "100%";
    const allowFullscreen = (initialConfig as any)?.allowFullscreen ?? true;

    const [url, setUrl] = useState(configUrl);
    const [currentUrl, setCurrentUrl] = useState(configUrl);
    const [isEmbedded, setIsEmbedded] = useState(!!configUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [embedError, setEmbedError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [editSourcePanelOpen, setEditSourcePanelOpen] = useState(false);

    // Draft state — isolated to the panel, does NOT drive the iframe
    const [embedType, setEmbedType] = useState<"url" | "html">("url");
    const [urlDraft, setUrlDraft] = useState("");
    const [htmlDraft, setHtmlDraft] = useState("");

    // Track the committed source type separately from the draft
    const [committedEmbedType, setCommittedEmbedType] = useState<"url" | "html">(
        configUrl.trim().startsWith("<") ? "html" : "url"
    );

    const [viewNameDraft, setViewNameDraft] = useState("");
    const [pinView, setPinView] = useState(false);
    const [privateView, setPrivateView] = useState(false);
    const [defaultView, setDefaultView] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const updateViewMutation = trpc.view.update.useMutation();
    const { data: viewData, refetch: refetchViewData } = trpc.view.get.useQuery(
        { id: viewId as string },
        { enabled: !!viewId, staleTime: 0 }
    );
    const utils = trpc.useUtils();

    // Sync view name + settings from fetched viewData
    useEffect(() => {
        if (viewData) {
            setViewNameDraft(viewData.name || "");
            setPinView(viewData.isPinned || false);
            setPrivateView(viewData.isPrivate || false);
            setDefaultView(viewData.isDefault || false);
        }
    }, [viewData]);

    const updateViewProperty = async (property: string, value: any) => {
        if (!viewId) return;
        try {
            await updateViewMutation.mutateAsync({ id: viewId, [property]: value });
            void utils.view.get.invalidate({ id: viewId });
            void utils.view.list.invalidate();
            if (spaceId) void utils.space.get.invalidate({ id: spaceId });
            if (typeof value === 'boolean') {
                const label = property.replace('is', '');
                toast.success(`View ${label.toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
            }
        } catch (e) {
            toast.error(`Failed to update ${property}`);
        }
    };

    const updateViewName = async (newName: string) => {
        if (!viewId || !newName.trim()) return;
        const trimmed = newName.trim();
        const oldName = viewData?.name || "";
        setViewNameDraft(trimmed);

        // Optimistically patch all parent caches so the tab bar updates immediately
        const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

        // Update generic caches
        if (spaceId) utils.space?.get?.setData({ id: spaceId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (projectId) utils.project?.get?.setData({ id: projectId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (teamId) utils.team?.get?.setData({ id: teamId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (folderId) utils.folder?.get?.setData({ id: folderId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (listId) utils.list?.get?.setData({ id: listId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);

        // Use a generic approach to update list.byContext
        const updateListByContext = () => {
            try {
                // @ts-ignore
                if (utils.list?.byContext?.setData) {
                    // @ts-ignore
                    utils.list.byContext.setData(undefined, (old: any) => {
                        if (!old || !old.items) return old;
                        return {
                            ...old,
                            items: old.items.map((l: any) => l.id === listId ? { ...l, views: patchViews(l.views ?? []) } : l)
                        };
                    });
                }
            } catch (e) { }
        };
        updateListByContext();

        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: trimmed });
            if (utils.view?.get) await utils.view.get.invalidate({ id: viewId });
            if (utils.view?.list) await utils.view.list.invalidate();
            if (spaceId && utils.space?.get) void utils.space.get.invalidate({ id: spaceId });
            if (projectId && utils.project?.get) void utils.project.get.invalidate({ id: projectId });
            if (teamId && utils.team?.get) void utils.team.get.invalidate({ id: teamId });
            if (folderId && utils.folder?.get) void utils.folder.get.invalidate({ id: folderId });
            if (listId && utils.list?.get) void utils.list.get.invalidate({ id: listId });
            if (listId && utils.list?.byContext) void utils.list.byContext.invalidate();

            if (typeof refetchViewData === 'function') void refetchViewData();
        } catch (e) {
            setViewNameDraft(oldName);

            // Revert optimistic updates
            const revertViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: oldName } : v);
            if (spaceId) utils.space?.get?.setData({ id: spaceId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (projectId) utils.project?.get?.setData({ id: projectId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (teamId) utils.team?.get?.setData({ id: teamId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (folderId) utils.folder?.get?.setData({ id: folderId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (listId) utils.list?.get?.setData({ id: listId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
        }
    };

    // Reset all embed state whenever the view or its config changes.
    useEffect(() => {
        const resolved = (initialConfig as any)?.url ?? "";
        setUrl(resolved);
        setCurrentUrl(resolved);
        setIsEmbedded(!!resolved);
        setEmbedError(false);
        setIsLoading(false);
        setEditSourcePanelOpen(false);
        setCustomizePanelOpen(false);
        setUrlDraft("");
        setHtmlDraft("");
        setEmbedType("url");
        setCommittedEmbedType(resolved.trim().startsWith("<") ? "html" : "url");
    }, [viewId, initialConfig]);

    // When opening the edit source panel, populate drafts from committed state.
    // The stored currentUrl for HTML embeds is the wrapped document — extract
    // the original inner snippet so the user sees their original code.
    useEffect(() => {
        if (!editSourcePanelOpen) return;
        if (committedEmbedType === "html") {
            // Extract just the inner body content from the wrapper document
            const bodyMatch = currentUrl.match(/<body>([\s\S]*)<\/body>/);
            const innerHtml = bodyMatch ? bodyMatch[1].trim() : currentUrl;
            setEmbedType("html");
            setHtmlDraft(innerHtml);
            setUrlDraft("");
        } else if (currentUrl) {
            setEmbedType("url");
            setUrlDraft(currentUrl);
            setHtmlDraft("");
        } else {
            setEmbedType("url");
            setUrlDraft("");
            setHtmlDraft("");
        }
    }, [editSourcePanelOpen]); // intentionally excludes currentUrl / committedEmbedType

    // Refetch view data whenever the customize panel opens
    useEffect(() => {
        if (customizePanelOpen && viewId) {
            void refetchViewData();
        }
    }, [customizePanelOpen, viewId]); // eslint-disable-line react-hooks/exhaustive-deps

    const transformUrlForEmbed = (inputUrl: string): string => {
        try {
            new URL(inputUrl);
            for (const [, config] of Object.entries(EMBED_PROVIDERS)) {
                if (config.pattern.test(inputUrl)) {
                    return config.transform(inputUrl);
                }
            }
            return inputUrl;
        } catch {
            return inputUrl;
        }
    };

    const handleSaveSource = async () => {
        const newSource = embedType === "url" ? urlDraft.trim() : htmlDraft.trim();
        if (!newSource) return;

        if (embedType === "url") {
            try {
                new URL(newSource);
            } catch {
                toast.error("Please enter a valid URL.");
                return;
            }
        }

        setIsLoading(true);
        setEmbedError(false);

        // For URLs: run through provider transforms (e.g. Figma share → embed URL).
        // For HTML: wrap in a centering document so the embed sits in the middle.
        const transformedSource = embedType === "url"
            ? transformUrlForEmbed(newSource)
            : wrapHtmlForEmbed(newSource);

        // Commit — this is what drives the iframe
        setCurrentUrl(transformedSource);
        setUrl(transformedSource);
        setCommittedEmbedType(embedType);
        setIsEmbedded(true);
        setEditSourcePanelOpen(false);

        // Persist into view config
        if (viewId) {
            try {
                const raw = (initialConfig ?? {}) as Record<string, any>;
                await updateViewMutation.mutateAsync({
                    id: viewId,
                    config: { ...raw, url: transformedSource } as any,
                });
                void utils.view.get.invalidate({ id: viewId });
                void utils.view.list.invalidate();
                if (spaceId) void utils.space.get.invalidate({ id: spaceId });
                toast.success("Embed source successfully saved!");
            } catch {
                toast.error("Failed to save embed source.");
            }
        }

        setTimeout(() => setIsLoading(false), 1000);
    };

    const handleRefresh = () => {
        if (iframeRef.current) {
            setIsLoading(true);
            setEmbedError(false);
            iframeRef.current.src = currentUrl;
            setTimeout(() => setIsLoading(false), 1000);
        }
    };

    const handleFullscreen = () => {
        if (!isFullscreen && containerRef.current) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
            setIsFullscreen(true);
        } else if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleOpenExternal = () => {
        window.open(currentUrl, '_blank', 'noopener,noreferrer');
    };

    const handleIframeError = () => {
        setEmbedError(true);
        setIsLoading(false);
        toast.error("Failed to load embed. The URL may not allow embedding.");
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Determine how to drive the iframe:
    // - HTML embeds (wrapped docs) use srcDoc
    // - URLs use src directly
    const isHtmlEmbed = committedEmbedType === "html" || currentUrl.trimStart().startsWith("<!DOCTYPE");

    return (
        <TooltipProvider>
            <div ref={containerRef} className="h-full flex flex-col bg-white overflow-hidden relative" style={{ height }}>
                {!isEmbedded ? (
                    /* ── Empty state ── */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white z-0">
                        <div className="max-w-md w-full space-y-4 text-center flex flex-col items-center">
                            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4 opacity-70">
                                <path d="M30 80 L60 30 L90 80 Z" fill="#D1D5DB" />
                                <circle cx="75" cy="75" r="25" fill="#E5E7EB" />
                            </svg>
                            <h2 className="text-base font-bold text-zinc-900">No embed displayed</h2>
                            <p className="text-zinc-500 text-sm">Connect a URL or source to view content</p>
                            {!isReadOnly && (
                                <Button
                                    variant="outline"
                                    className="mt-2 text-xs h-8 px-4 font-medium text-zinc-700 bg-white"
                                    onClick={() => setEditSourcePanelOpen(true)}
                                >
                                    Edit source
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Toolbar ── */}
                        {!isReadOnly && (
                            <div className="p-2 border-b flex items-center justify-between bg-slate-50 gap-2 shrink-0">
                                <div className="text-xs text-slate-500 truncate max-w-xl pl-2 font-mono">
                                    {isHtmlEmbed ? "HTML Embed" : currentUrl}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-xs h-7 px-2" title="Refresh embed">
                                        <RefreshCw size={14} />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleOpenExternal} className="text-xs h-7 px-2" title="Open in new tab">
                                        <ExternalLink size={14} />
                                    </Button>
                                    {allowFullscreen && (
                                        <Button variant="ghost" size="sm" onClick={handleFullscreen} className="text-xs h-7 px-2" title="Fullscreen">
                                            <Maximize2 size={14} />
                                        </Button>
                                    )}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs font-medium text-zinc-700 border-zinc-200"
                                                onClick={() => setCustomizePanelOpen(true)}
                                            >
                                                <Settings className="h-3.5 w-3.5" />
                                                <span className="hidden sm:inline ml-1">Customize</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Customize view</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        )}

                        {/* ── Error alert ── */}
                        {embedError && (
                            <Alert variant="destructive" className="m-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Unable to load this embed. The site may not allow iframe embedding.
                                    <Button variant="link" size="sm" onClick={handleOpenExternal} className="ml-2 h-auto p-0">
                                        Open in new tab instead
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* ── Loading spinner ── */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                            </div>
                        )}

                        {/* ── Content area ── */}
                        <div className="flex-1 min-h-0 w-full flex flex-col">
                            <iframe
                                ref={iframeRef}
                                {...(isHtmlEmbed
                                    ? { srcDoc: currentUrl }
                                    : { src: currentUrl })}
                                className="flex-1 w-full border-0"
                                style={{ height: "100%" }}
                                title="Embedded Content"
                                allowFullScreen={allowFullscreen}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-downloads"
                                onError={handleIframeError}
                                loading="lazy"
                            />
                        </div>
                    </>
                )}

                {/* ── Edit source panel ── */}
                {editSourcePanelOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setEditSourcePanelOpen(false)} aria-hidden />
                        <div className="absolute top-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 -ml-2 cursor-pointer"
                                        onClick={() => {
                                            setEditSourcePanelOpen(false);
                                            if (isEmbedded) setCustomizePanelOpen(true);
                                        }}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <h3 className="font-semibold text-zinc-900">Edit source</h3>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditSourcePanelOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-4 space-y-6">
                                    <RadioGroup value={embedType} onValueChange={(val) => setEmbedType(val as "url" | "html")}>
                                        <div className="flex flex-col space-y-6">
                                            {/* URL option */}
                                            <div className="flex flex-col space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="url" id="r1" />
                                                    <Label htmlFor="r1" className="font-normal text-sm text-zinc-900 cursor-pointer">Website URL</Label>
                                                </div>
                                                <Input
                                                    className={`w-full text-sm transition-opacity duration-150 ${embedType !== "url" ? "opacity-40 pointer-events-none" : ""}`}
                                                    placeholder="Enter URL"
                                                    value={urlDraft}
                                                    disabled={embedType !== "url"}
                                                    onChange={e => setUrlDraft(e.target.value)}
                                                    onFocus={() => setEmbedType("url")}
                                                />
                                                <p className="text-xs text-zinc-400 leading-relaxed">
                                                    Supported: YouTube, Vimeo, Figma, Google Docs, Sheets, Slides, Forms, Calendar, Maps, Drive, Loom, Airtable, Miro, Notion, and more.
                                                </p>
                                            </div>
                                            {/* HTML option */}
                                            <div className="flex flex-col space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="html" id="r2" />
                                                    <Label htmlFor="r2" className="font-normal text-sm text-zinc-900 cursor-pointer">Embed HTML</Label>
                                                </div>
                                                <Textarea
                                                    className={`w-full text-sm resize-none transition-opacity duration-150 ${embedType !== "html" ? "opacity-40 pointer-events-none" : ""}`}
                                                    rows={8}
                                                    placeholder="Enter HTML"
                                                    value={htmlDraft}
                                                    disabled={embedType !== "html"}
                                                    onChange={e => setHtmlDraft(e.target.value)}
                                                    onFocus={() => setEmbedType("html")}
                                                />
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </ScrollArea>
                            <div className="p-4 border-t border-zinc-100 bg-white space-y-2 mt-auto">
                                <Button
                                    className="w-full"
                                    disabled={embedType === "url" ? !urlDraft.trim() : !htmlDraft.trim()}
                                    onClick={handleSaveSource}
                                >
                                    Save
                                </Button>
                                <div className="text-[13px] text-center">
                                    <a href="#" className="text-blue-500 hover:underline">Learn more</a>{" "}
                                    <span className="text-zinc-500">about app views.</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Customize view panel ── */}
                {customizePanelOpen && !editSourcePanelOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                        <div className="absolute top-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <h3 className="font-semibold text-zinc-900">Customize view</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomizePanelOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-3 space-y-2 pb-24">
                                    {/* View name */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 shrink-0">
                                            <Globe className="h-5 w-5 text-zinc-600" />
                                        </div>
                                        <Input
                                            value={viewNameDraft}
                                            onChange={(e) => setViewNameDraft(e.target.value)}
                                            onBlur={() => updateViewName(viewNameDraft)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    updateViewName(viewNameDraft);
                                                    (e.target as HTMLInputElement).blur();
                                                }
                                            }}
                                            className="h-10 text-sm font-medium border-zinc-200"
                                            placeholder="View name"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                            onClick={() => {
                                                setEditSourcePanelOpen(true);
                                                setCustomizePanelOpen(false);
                                            }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Globe className="h-4 w-4 text-zinc-400" />
                                                Edit source
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                                        </button>
                                    </div>

                                    <div className="h-px bg-zinc-100 my-2" />

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setPinView(!pinView); updateViewProperty('isPinned', !pinView); }}>
                                            <div className="flex items-center gap-2">
                                                <Pin className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Pin view</span>
                                            </div>
                                            <Switch checked={pinView} onCheckedChange={(val) => { setPinView(val); updateViewProperty('isPinned', val); }} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setPrivateView(!privateView); updateViewProperty('isPrivate', !privateView); }}>
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Private view</span>
                                            </div>
                                            <Switch checked={privateView} onCheckedChange={(val) => { setPrivateView(val); updateViewProperty('isPrivate', val); }} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setDefaultView(!defaultView); updateViewProperty('isDefault', !defaultView); }}>
                                            <div className="flex items-center gap-2">
                                                <Home className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Set as default view</span>
                                            </div>
                                            <Switch checked={defaultView} onCheckedChange={(val) => { setDefaultView(val); updateViewProperty('isDefault', val); }} />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-100 my-2" />

                                    <div className="space-y-1">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                            onClick={() => {
                                                const link = `${window.location.origin}${window.location.pathname}?v=${viewId}`;
                                                navigator.clipboard?.writeText(link);
                                                toast.success("Link copied to clipboard");
                                            }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <LinkIcon className="h-4 w-4 text-zinc-400" />
                                                Copy link to view
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                            onClick={() => setIsShareModalOpen(true)}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-zinc-400" />
                                                Sharing & Permissions
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    </>
                )}

                <ShareViewPermissionModal
                    open={isShareModalOpen}
                    onOpenChange={setIsShareModalOpen}
                    viewId={viewId}
                    spaceId={spaceId}
                    projectId={projectId}
                    folderId={folderId}
                    teamId={teamId}
                    viewName={viewData?.name || "View"}
                    isPrivate={privateView}
                    isLocked={false}
                />
            </div>
        </TooltipProvider>
    );
}