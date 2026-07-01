"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Copy,
    Edit2,
    Play,
    Pause,
    Trash2,
    Eye,
    MoreHorizontal,
    ExternalLink,
    Activity,
    ArrowUpRight,
    BarChart3,
    ShoppingCart,
    DownloadCloud,
    Store,
    Search,
    X,
    ListFilter,
    Check,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { EditListingModal } from "@/features/marketplace/components/EditListingModal";

type StatusFilter = "all" | "active" | "paused";

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Paused", value: "paused" },
];

export function MyListingsView() {
    const { data: listings, isLoading } = trpc.marketplace.myListings.useQuery();
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [editingListingId, setEditingListingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const updateStatusMutation = trpc.marketplace.updateListingStatus.useMutation({
        onSuccess: async () => {
            await utils.marketplace.myListings.invalidate();
        },
    });

    const deleteListingMutation = trpc.marketplace.deleteListing.useMutation({
        onSuccess: async () => {
            await utils.marketplace.myListings.invalidate();
        },
    });

    const handlePauseActivate = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "PAUSED" : "ACTIVE";
        try {
            await updateStatusMutation.mutateAsync({ id, status: newStatus as any });
            toast({
                title: newStatus === "PAUSED" ? "Listing paused" : "Listing activated",
                description:
                    newStatus === "PAUSED"
                        ? "Your listing is now hidden from the marketplace."
                        : "Your listing is now live on the marketplace.",
            });
        } catch (err: any) {
            toast({ title: "Failed to update status", description: err?.message, variant: "destructive" });
        }
    };

    const handleCopyLink = (id: string) => {
        const url = `${window.location.origin}/marketplace/listing/${id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        toast({ title: "Link copied!", description: "Listing URL copied to clipboard." });
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteListingMutation.mutateAsync({ id });
            toast({ title: "Listing deleted", description: `"${title}" has been removed.` });
        } catch (err: any) {
            toast({ title: "Failed to delete", description: err?.message, variant: "destructive" });
        }
    };

    const filtered = useMemo(() => {
        if (!listings) return [];
        return listings.filter((item) => {
            const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === "all" || item.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [listings, search, statusFilter]);

    const counts = useMemo(() => {
        if (!listings) return { all: 0, active: 0, paused: 0, draft: 0 };
        return {
            all: listings.length,
            active: listings.filter((i) => i.status === "active").length,
            paused: listings.filter((i) => i.status === "paused").length,
            draft: listings.filter((i) => i.status === "draft").length,
        };
    }, [listings]);

    /* ─── Header (always shown) ─── */
    const header = (
        <div className="space-y-4 max-w-5xl">
            {/* Top row: title + total */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
                            My Listings
                        </h1>
                        <p className="text-slate-600 text-sm">
                            Manage your lisitings on marketplace
                        </p>
                    </div>
                </div>
            </div>

            {/* Search + filter row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 items-center rounded-lg border-2 border-zinc-200 bg-zinc-50/50 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        variant="ghost"
                        placeholder="Search listings…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 h-9 bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 border-0"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Status filter tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/40">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                statusFilter === tab.value
                                    ? "bg-background text-foreground shadow-sm border border-border/50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {tab.label}
                            {counts[tab.value] > 0 && (
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-bold tabular-nums",
                                        statusFilter === tab.value
                                            ? "bg-primary/10 text-primary"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {counts[tab.value]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    /* ─── Loading ─── */
    if (isLoading) {
        return (
            <div className="space-y-5 max-w-5xl">
                {header}
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border rounded-2xl bg-card">
                            <div className="flex items-start gap-4">
                                <Skeleton className="h-14 w-14 rounded-2xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                            <div className="mt-4 sm:mt-0 flex gap-2">
                                <Skeleton className="h-9 w-24 rounded-xl" />
                                <Skeleton className="h-9 w-9 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /* ─── Empty (no listings at all) ─── */
    if (!listings || listings.length === 0) {
        return (
            <div className="space-y-5 max-w-5xl">
                {header}
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20 text-center space-y-6">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
                        <Store className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold tracking-tight">No listings yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            You haven't published anything to the marketplace yet. Share your creations and start earning.
                        </p>
                    </div>
                    <Button
                        size="lg"
                        className="rounded-full shadow-sm hover:shadow-md transition-all gap-2"
                        onClick={() => (window.location.href = "/marketplace/publish")}
                    >
                        <ArrowUpRight className="h-4 w-4" />
                        Publish to Marketplace
                    </Button>
                </div>
            </div>
        );
    }

    /* ─── Main list ─── */
    return (
        <>
            <div className="space-y-5 max-w-5xl">
                {header}

                {/* No results from filter/search */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-2xl text-center space-y-3">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                            <ListFilter className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No listings match your filters</p>
                        <p className="text-xs text-muted-foreground">Try adjusting the search or status filter.</p>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 rounded-lg text-xs gap-1.5"
                            onClick={() => { setSearch(""); setStatusFilter("all"); }}
                        >
                            <X className="h-3.5 w-3.5" /> Clear filters
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Result count hint when filtering */}
                        {(search || statusFilter !== "all") && (
                            <p className="text-xs text-muted-foreground -mt-1">
                                Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
                                <span className="font-semibold text-foreground">{counts.all}</span> listings
                            </p>
                        )}

                        <div className="grid gap-4">
                            {filtered.map((item) => {
                                const isActive = item.status === "active";
                                const isPending =
                                    (updateStatusMutation.isPending && updateStatusMutation.variables?.id === item.id) ||
                                    (deleteListingMutation.isPending && deleteListingMutation.variables?.id === item.id);

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "group relative flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border bg-card hover:bg-accent/5 hover:border-primary/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 overflow-hidden",
                                            isPending && "opacity-60 pointer-events-none"
                                        )}
                                    >
                                        {/* Accent line */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />

                                        {/* Left Info */}
                                        <div className="flex items-start gap-5 mb-5 sm:mb-0">
                                            <div
                                                className={cn(
                                                    "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-500 group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-md",
                                                    isActive
                                                        ? "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white"
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                                                )}
                                            >
                                                {isActive ? (
                                                    <span className="font-bold text-lg">{item.type.slice(0, 2).toUpperCase()}</span>
                                                ) : (
                                                    <Activity className="h-6 w-6 opacity-50" />
                                                )}
                                            </div>

                                            <div className="space-y-2 min-w-0 flex-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h4 className="font-semibold text-base sm:text-lg tracking-tight truncate group-hover:text-primary transition-colors">
                                                        {item.title}
                                                    </h4>

                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 shadow-sm",
                                                            isActive
                                                                ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                                                : "bg-amber-100/80 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                                        )}
                                                    >
                                                        <span className="flex items-center gap-1.5">
                                                            <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-amber-400")} />
                                                            {item.status}
                                                        </span>
                                                    </Badge>

                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground bg-background">
                                                        {item.type}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                                    <span className="flex items-center gap-1.5">
                                                        <DownloadCloud className="h-4 w-4 opacity-70" />
                                                        <span className="font-medium text-foreground/80">{item._count?.applications || 0} applications</span>
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-border" />
                                                    <span className="flex items-center gap-1.5">
                                                        <ShoppingCart className="h-4 w-4 opacity-70" />
                                                        <span className="font-medium text-foreground/80">{item._count?.orders || 0} orders</span>
                                                    </span>
                                                    {((item.priceCredits !== null && item.priceCredits > 0) || item.isFree) && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-border" />
                                                            <span
                                                                className={cn(
                                                                    "flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-md text-xs",
                                                                    item.isFree
                                                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                                        : "bg-primary/5 text-primary"
                                                                )}
                                                            >
                                                                {item.isFree ? "Free" : `${item.priceCredits} Credits`}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pl-4 sm:pl-0 sm:border-l-0 border-l border-border/50 ml-16 sm:ml-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-9 gap-2 rounded-xl border-border/60 hover:bg-background hover:border-primary/30 transition-all shadow-sm group-hover:shadow"
                                                onClick={() => window.open(`/marketplace/listing/${item.id}`, "_blank")}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                <span className="hidden sm:inline">View</span>
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="h-9 w-9 px-0 rounded-xl hover:bg-accent/80 transition-colors cursor-pointer">
                                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl">
                                                    {/* Edit Details */}
                                                    <DropdownMenuItem
                                                        className="gap-2.5 rounded-lg cursor-pointer"
                                                        onClick={() => setEditingListingId(item.id)}
                                                    >
                                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-normal">Edit Details</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator className="my-1.5" />

                                                    {/* Pause / Activate */}
                                                    {isActive ? (
                                                        <DropdownMenuItem
                                                            className="gap-2.5 rounded-lg cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-500/10"
                                                            onClick={() => handlePauseActivate(item.id, item.status)}
                                                        >
                                                            <Pause className="h-4 w-4" />
                                                            <span className="font-normal">Pause Listing</span>
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="gap-2.5 rounded-lg cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-500/10"
                                                            onClick={() => handlePauseActivate(item.id, item.status)}
                                                        >
                                                            <Play className="h-4 w-4" />
                                                            <span className="font-normal">Activate</span>
                                                        </DropdownMenuItem>
                                                    )}

                                                    {/* Copy Link */}
                                                    <DropdownMenuItem
                                                        className="gap-2.5 rounded-lg cursor-pointer"
                                                        onClick={() => handleCopyLink(item.id)}
                                                    >
                                                        {copiedId === item.id ? (
                                                            <Check className="h-4 w-4 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                        <span className="font-normal">{copiedId === item.id ? "Copied!" : "Copy Link"}</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator className="my-1.5" />

                                                    {/* Delete */}
                                                    <DropdownMenuItem
                                                        className="gap-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                        onClick={() => handleDelete(item.id, item.title)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="font-normal">Delete</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Edit Listing Modal */}
            {editingListingId && (
                <EditListingModal
                    open={!!editingListingId}
                    onOpenChange={(open) => { if (!open) setEditingListingId(null); }}
                    listingId={editingListingId}
                    workspaceId={undefined}
                />
            )}
        </>
    );
}
