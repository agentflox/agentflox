"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FolderKanban, CheckSquare, Wrench, Package, Hash, Clock, Activity, FileText } from "lucide-react";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

interface SpaceOverviewTabProps {
    spaceId: string;
    workspaceId: string;
}

export function SpaceOverviewTab({ spaceId, workspaceId }: SpaceOverviewTabProps) {
    const { data: space } = trpc.space.get.useQuery({ id: spaceId });
    const { data: workspace } = trpc.workspace.get.useQuery({ id: workspaceId });

    // Aggregate stats from workspace data (Assuming workspace stores everything flat for now or we filter)
    // In a real app, we might query `space.stats`
    const stats = useMemo(() => {
        if (!workspace) return null;
        const projects = (workspace.projects || []).filter((p: any) => p.spaceId === spaceId);
        const teams = (workspace.teams || []).filter((t: any) => t.spaceId === spaceId);
        const members = (space as any)?.members?.length || 0;

        return {
            projects: projects.length,
            teams: teams.length,
            members
        };
    }, [workspace, spaceId, space]);

    if (!space) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Hero Card */}
            <div className="rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                    <div
                        className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100/50"
                        style={{
                            backgroundColor: `${space.color || '#3B82F6'}20`,
                            color: space.color || '#3B82F6'
                        }}
                    >
                        <SpaceIcon icon={space.icon} size={40} />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{space.name}</h2>
                            {!space.isActive && <Badge variant="secondary">Archived</Badge>}
                        </div>
                        <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                            {space.description || "No description provided. Add a description to help your team understand the purpose of this space."}
                        </p>

                        <div className="flex flex-wrap gap-4 mt-4 pt-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <Users size={16} className="text-blue-500" />
                                <span className="font-semibold">{stats?.members || 0}</span> members
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <FolderKanban size={16} className="text-orange-500" />
                                <span className="font-semibold">{stats?.projects || 0}</span> projects
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <Users size={16} className="text-indigo-500" />
                                <span className="font-semibold">{stats?.teams || 0}</span> teams
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <Clock size={16} className="text-slate-400" />
                                <span>Created {space.createdAt ? formatDistanceToNow(new Date(space.createdAt), { addSuffix: true }) : 'recently'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Activity Placeholder */}
                <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="h-5 w-5 text-indigo-500" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-sm border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            <Activity className="h-8 w-8 mb-2 opacity-20" />
                            <p>No recent activity recorded.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Access/Pinned Items Placeholder */}
                <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5 text-emerald-500" />
                            ReadMe / Docs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-sm border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            <FileText className="h-8 w-8 mb-2 opacity-20" />
                            <p>No pinned documents.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
