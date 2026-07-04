"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Store, ExternalLink, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ListingDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: listing, isLoading, error } = trpc.marketplace.get.useQuery({ id });

    if (isLoading) {
        return (
            <Shell>
                <div className="h-64 animate-pulse rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
            </Shell>
        );
    }

    if (error || !listing) {
        return (
            <Shell>
                <div className="p-8 text-center text-zinc-500">
                    Failed to load listing details.
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/dashboard/listings")}
                    className="text-muted-foreground hover:text-foreground -ml-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Listings
                </Button>

                <PageHeader
                    title={listing.title}
                    subtitle="Manage your marketplace listing configuration."
                    actions={
                        <div className="flex items-center gap-3">
                            <Badge variant={listing.status === "active" ? "default" : "secondary"} className="capitalize">
                                {listing.status.toLowerCase()}
                            </Badge>
                            <Button
                                variant="outline"
                                onClick={() => window.open(`/store/${listing.slug ?? listing.id}`, "_blank")}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View in Marketplace
                            </Button>
                        </div>
                    }
                />

                <div className="flex items-center gap-3 -mt-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <Store className="h-5 w-5" />
                    </div>
                </div>

                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="general">General Settings</TabsTrigger>
                        <TabsTrigger value="description">Description</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6">
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs mb-4">
                                Basic Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Title</p>
                                    <p className="font-medium mt-1">{listing.title}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Short Description</p>
                                    <p className="font-medium mt-1">{listing.shortDesc || "No short description"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Category</p>
                                    <p className="font-medium mt-1 capitalize">{listing.category || "Uncategorized"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs mb-4">
                                Statistics
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900/20">
                                    <p className="text-sm font-medium text-zinc-500">Total Installations</p>
                                    <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{listing._count?.orders ?? 0}</p>
                                </div>
                                <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900/20">
                                    <p className="text-sm font-medium text-zinc-500">Clones (Applications)</p>
                                    <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{listing._count?.applications ?? 0}</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="description">
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: listing.description || "No description provided." }} />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </Shell>
    );
}
