"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Maximize2, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmbedViewProps {
    url?: string;
    onUrlSave?: (url: string) => void;
    isReadOnly?: boolean;
    height?: string;
    allowFullscreen?: boolean;
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
        pattern: /figma\.com\/(file|proto)/,
        transform: (url: string) => url.includes('embed') ? url : `${url}?embed=1`
    },
    googleSheets: {
        pattern: /docs\.google\.com\/spreadsheets/,
        transform: (url: string) => {
            // Convert edit link to embed link
            return url.replace('/edit', '/preview');
        }
    },
    googleDocs: {
        pattern: /docs\.google\.com\/document/,
        transform: (url: string) => url.replace('/edit', '/preview')
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

export function EmbedView({
    url: initialUrl,
    onUrlSave,
    isReadOnly,
    height = "100%",
    allowFullscreen = true
}: EmbedViewProps) {
    const [url, setUrl] = useState(initialUrl || "");
    const [currentUrl, setCurrentUrl] = useState(initialUrl || "");
    const [isEmbedded, setIsEmbedded] = useState(!!initialUrl);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [embedError, setEmbedError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialUrl) {
            setUrl(initialUrl);
            setCurrentUrl(initialUrl);
            setIsEmbedded(true);
        }
    }, [initialUrl]);

    // Detect and transform URL based on provider
    const transformUrlForEmbed = (inputUrl: string): string => {
        try {
            // Validate URL
            new URL(inputUrl);

            // Check each provider and transform if matched
            for (const [provider, config] of Object.entries(EMBED_PROVIDERS)) {
                if (config.pattern.test(inputUrl)) {
                    return config.transform(inputUrl);
                }
            }

            return inputUrl;
        } catch {
            return inputUrl;
        }
    };

    const handleEmbed = () => {
        if (url) {
            setIsLoading(true);
            setEmbedError(false);

            const transformedUrl = transformUrlForEmbed(url);
            setCurrentUrl(transformedUrl);
            setIsEmbedded(true);
            setIsEditing(false);

            if (onUrlSave && url !== initialUrl) {
                onUrlSave(transformedUrl);
                toast.success("Embed URL successfully saved!");
            }

            // Reset loading after a brief delay
            setTimeout(() => setIsLoading(false), 1000);
        }
    };

    const handleReset = () => {
        setIsEditing(true);
        setEmbedError(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setUrl(currentUrl);
        if (!currentUrl) {
            setIsEmbedded(false);
        }
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

    if (!isEmbedded || isEditing) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50/50">
                <div className="max-w-md w-full space-y-4 text-center">
                    <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Globe size={32} />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900">
                        {isEditing ? "Update Embed" : "Embed Anything"}
                    </h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Embed data from other apps like Google Sheets, Figma, YouTube, Loom, Miro, Notion, or any valid URL.
                    </p>

                    <div className="flex gap-2 pt-4">
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isReadOnly && url && handleEmbed()}
                            placeholder="https://example.com/..."
                            className="bg-white"
                            disabled={isReadOnly}
                        />
                        <Button onClick={handleEmbed} disabled={!url || isReadOnly}>
                            {isEditing ? "Save" : "Embed"}
                        </Button>
                    </div>

                    {isEditing && currentUrl && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="mt-2 text-muted-foreground"
                        >
                            Cancel
                        </Button>
                    )}

                    <div className="pt-2 space-y-2">
                        <p className="text-xs text-slate-400">
                            Supported: YouTube, Vimeo, Google Docs/Sheets, Figma, Miro, Notion, Loom, Airtable, and more
                        </p>
                        <p className="text-xs text-slate-400">
                            Note: Some URLs may not allow iframe embedding
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="h-full flex flex-col bg-white" style={{ height }}>
            {!isReadOnly && (
                <div className="p-2 border-b flex items-center justify-between bg-slate-50 gap-2">
                    <div className="text-xs text-slate-500 truncate max-w-xl pl-2 font-mono">
                        {currentUrl}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            className="text-xs h-7 px-2"
                            title="Refresh embed"
                        >
                            <RefreshCw size={14} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleOpenExternal}
                            className="text-xs h-7 px-2"
                            title="Open in new tab"
                        >
                            <ExternalLink size={14} />
                        </Button>
                        {allowFullscreen && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleFullscreen}
                                className="text-xs h-7 px-2"
                                title="Fullscreen"
                            >
                                <Maximize2 size={14} />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="text-xs h-7"
                        >
                            Change URL
                        </Button>
                    </div>
                </div>
            )}

            {embedError && (
                <Alert variant="destructive" className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Unable to load this embed. The site may not allow iframe embedding.
                        <Button
                            variant="link"
                            size="sm"
                            onClick={handleOpenExternal}
                            className="ml-2 h-auto p-0"
                        >
                            Open in new tab instead
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            )}

            <iframe
                ref={iframeRef}
                src={currentUrl}
                className="flex-1 w-full h-full border-0"
                title="Embedded Content"
                allowFullScreen={allowFullscreen}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-downloads"
                onError={handleIframeError}
                loading="lazy"
            />
        </div>
    );
}
