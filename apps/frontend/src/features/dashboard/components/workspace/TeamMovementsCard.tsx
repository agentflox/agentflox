"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

type TeamMovementsCardProps = {
    workspace: any;
    isLoading?: boolean;
};

export function TeamMovementsCard({ workspace, isLoading }: TeamMovementsCardProps) {
    const teams = workspace?.teams || [];

    return (
        <Card className="col-span-1 overflow-hidden rounded-[2rem] border-slate-200 shadow-sm transition-shadow hover:shadow-md lg:col-span-1">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">Team Movements</CardTitle>
                    {isLoading ? <Skeleton className="h-5 w-6 rounded-full" /> : <Badge variant="outline">{teams.length}</Badge>}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                </div>
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teams.length > 0 ? (
                            teams.slice(0, 3).map((team: any) => (
                                <Link
                                    key={team.id}
                                    href={DASHBOARD_ROUTES.TEAM(team.id)}
                                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Pseudo-avatar for team */}
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                            <span className="text-sm font-bold">{team.name.substring(0, 2).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{team.name}</p>
                                            <p className="text-xs text-slate-500">{team.size ?? 0} members</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-slate-50 text-slate-600">{team.status ?? "Active"}</Badge>
                                </Link>
                            ))
                        ) : (
                            <div className="py-8 text-center text-sm text-slate-500">
                                No teams established.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
