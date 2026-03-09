"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

type ProjectLandscapeCardProps = {
    workspace: any;
    isLoading?: boolean;
};

export function ProjectLandscapeCard({ workspace, isLoading }: ProjectLandscapeCardProps) {
    const projects = workspace?.projects || [];

    return (
        <Card className="col-span-1 overflow-hidden rounded-[2rem] border-slate-200 shadow-sm transition-shadow hover:shadow-md lg:col-span-1">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">Project Landscape</CardTitle>
                    {isLoading ? <Skeleton className="h-5 w-6 rounded-full" /> : <Badge variant="outline">{projects.length}</Badge>}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-3 w-3 rounded-full" />
                                        <Skeleton className="h-3 w-12 rounded-sm" />
                                    </div>
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                                <Skeleton className="mt-4 h-3 w-24" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {projects.length > 0 ? (
                            projects.slice(0, 4).map((project: any) => (
                                <Link
                                    key={project.id}
                                    href={DASHBOARD_ROUTES.PROJECT(project.id)}
                                    className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-md hover:border-slate-200"
                                >
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className={`h-2 w-2 rounded-full ${project.status === 'COMPLETED' ? 'bg-emerald-500' : project.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{project.status ?? "DRAFT"}</span>
                                        </div>
                                        <p className="font-semibold text-slate-900 line-clamp-1">{project.name}</p>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-2 py-8 text-center text-sm text-slate-500">
                                No active projects.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
