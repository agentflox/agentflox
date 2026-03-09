"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type WorkspaceStatsProps = {
    workspace: any;
    isLoading: boolean;
};

export function WorkspaceStats({ workspace, isLoading }: WorkspaceStatsProps) {
    const stats = useMemo(() => {
        if (!workspace?._count) return [];

        return [
            {
                label: "Spaces",
                value: workspace._count.spaces,
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                ),
                color: "text-sky-500",
                bg: "bg-sky-500/10",
                border: "border-sky-200/20"
            },
            {
                label: "Projects",
                value: workspace._count.projects,
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
                color: "text-purple-500",
                bg: "bg-purple-500/10",
                border: "border-purple-200/20"
            },
            {
                label: "Teams",
                value: workspace._count.teams,
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                ),
                color: "text-pink-500",
                bg: "bg-pink-500/10",
                border: "border-pink-200/20"
            },
            {
                label: "Members",
                value: workspace._count.members,
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ),
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                border: "border-emerald-200/20"
            },
        ];
    }, [workspace]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${stat.border}`}
                >
                    <div className={`absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y-[-20%] rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 ${stat.bg.replace('/10', '/20')}`} />

                    <div className="flex items-center justify-between">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                            {stat.icon}
                        </span>
                    </div>

                    <div className="relative mt-4">
                        <p className="text-3xl font-bold tracking-tight text-slate-900">{stat.value.toLocaleString()}</p>
                        <p className="font-medium text-slate-500">{stat.label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
