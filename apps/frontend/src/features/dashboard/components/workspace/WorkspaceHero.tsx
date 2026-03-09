"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "../utils";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

type WorkspaceHeroProps = {
    workspace: any;
    isLoading: boolean;
};

export function WorkspaceHero({ workspace, isLoading }: WorkspaceHeroProps) {
    if (isLoading) {
        return (
            <section className="relative h-[28rem] overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 shadow-2xl ring-1 ring-white/10 md:p-12">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-900 to-slate-900" />
                <div className="relative flex h-full flex-col justify-between">
                    <div className="space-y-6">
                        <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-2/3 rounded-lg bg-white/10 md:w-1/3" />
                            <Skeleton className="h-10 w-1/2 rounded-lg bg-white/10 md:w-1/4" />
                        </div>
                        <Skeleton className="h-6 w-full rounded-md bg-white/5 md:w-1/2" />
                    </div>
                    <div className="flex gap-4">
                        <Skeleton className="h-12 w-32 rounded-full bg-white/10" />
                        <Skeleton className="h-12 w-32 rounded-full bg-white/10" />
                    </div>
                </div>
            </section>
        );
    }

    if (!workspace) {
        return (
            <div className="flex h-64 w-full items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50">
                <p className="text-slate-500">Workspace not found.</p>
            </div>
        );
    }

    return (
        <section className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white shadow-2xl ring-1 ring-white/10">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-900 to-slate-900" />
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl filter transition-all duration-1000 group-hover:bg-blue-400/20" />
            <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-3xl filter" />

            <div className="relative flex flex-col gap-8 px-8 py-10 md:px-12 md:py-14 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20">
                            Workspace
                        </Badge>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                            <span>Active</span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
                            {workspace.name}
                        </h1>
                        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300/90 md:text-xl">
                            {workspace.description || "A central hub that unites projects, teams, and resources."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {/* Pseudo-avatars or just use the count */}
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white ring-2 ring-slate-900">
                                    {workspace.owner?.name?.[0] || "?"}
                                </div>
                            </div>
                            <span>
                                Founded by <span className="font-semibold text-slate-200">{workspace.owner?.name ?? "Unknown"}</span>
                            </span>
                        </div>
                        <Separator orientation="vertical" className="h-4 bg-white/20" />
                        <span>Updated {formatDate(workspace.updatedAt)}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button asChild variant="outline" className="h-11 rounded-full border-white/10 bg-white/5 px-6 text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white hover:ring-1 hover:ring-white/30">
                        <Link href={DASHBOARD_ROUTES.SPACES}>Explore spaces</Link>
                    </Button>
                    <Button asChild className="h-11 rounded-full bg-white px-6 text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:translate-y-[-1px] hover:bg-slate-100 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                        <Link href="/dashboard/settings">Settings</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
