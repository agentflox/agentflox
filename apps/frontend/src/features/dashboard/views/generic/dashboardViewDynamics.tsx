"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/** Premium enterprise skeleton — shown while the view chunk is downloading */
function ViewLoadingSkeleton() {
    return (
        <div className="relative flex h-full w-full flex-col p-6 animate-in fade-in duration-700 bg-background/40">
            {/* Toolbar Skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse shadow-sm" />
                    <div className="flex flex-col gap-2.5">
                        <div className="h-4 w-32 rounded-md bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                        <div className="h-3 w-20 rounded-md bg-slate-100/80 dark:bg-slate-800/60 animate-pulse" />
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-24 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                    <div className="h-9 w-9 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                    <div className="h-9 w-9 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                </div>
            </div>

            {/* Content Area Skeleton */}
            <div className="flex-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 p-5 overflow-hidden shadow-sm">
                <div className="flex h-full flex-col gap-5">
                    {/* Header Row */}
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
                        <div className="h-4 w-8 rounded-md bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                        <div className="h-4 w-1/3 rounded-md bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                        <div className="h-4 w-28 rounded-md bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                        <div className="h-4 w-32 rounded-md bg-slate-200/80 dark:bg-slate-700/60 animate-pulse hidden md:block" />
                        <div className="h-4 w-12 rounded-md bg-slate-200/80 dark:bg-slate-700/60 animate-pulse ml-auto" />
                    </div>

                    {/* Data Rows */}
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-2">
                            <div className="h-4 w-8 rounded-md bg-slate-100/80 dark:bg-slate-800/60 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                            <div className={`h-4 rounded-md bg-slate-100/80 dark:bg-slate-800/60 animate-pulse ${i % 2 === 0 ? 'w-1/3' : 'w-1/2'}`} style={{ animationDelay: `${i * 100}ms` }} />
                            <div className="h-6 w-24 rounded-full bg-slate-100/80 dark:bg-slate-800/60 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                            <div className="hidden md:flex -space-x-2">
                                <div className="h-7 w-7 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse border-2 border-white dark:border-slate-950" style={{ animationDelay: `${i * 100}ms` }} />
                                <div className="h-7 w-7 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse border-2 border-white dark:border-slate-950" style={{ animationDelay: `${i * 100}ms` }} />
                            </div>
                            <div className="h-4 w-16 rounded-md bg-slate-100/80 dark:bg-slate-800/60 animate-pulse ml-auto" style={{ animationDelay: `${i * 100}ms` }} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Elegant Floating Loader overlay */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md px-7 py-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-indigo-500/10">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 relative z-10" strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tracking-widest uppercase mt-1">
                        Preparing View
                    </span>
                </div>
            </div>
        </div>
    );
}

export const ListView = dynamic(() => import("./ListView"), { loading: ViewLoadingSkeleton });
export const BoardView = dynamic(() => import("./BoardView").then((mod) => mod.BoardView), { loading: ViewLoadingSkeleton });
export const TableView = dynamic(() => import("./TableView").then((mod) => mod.TableView), { loading: ViewLoadingSkeleton });
export const PeopleView = dynamic(() => import("./PeopleView ").then((mod) => mod.PeopleView), { loading: ViewLoadingSkeleton });
export const ActivityView = dynamic(() => import("./ActivityView").then((mod) => mod.ActivityView), { loading: ViewLoadingSkeleton });
export const CalendarView = dynamic(() => import("./CalendarView").then((mod) => mod.CalendarView), { loading: ViewLoadingSkeleton });
export const GanttView = dynamic(() => import("./GanttView").then((mod) => mod.GanttView), { loading: ViewLoadingSkeleton });
export const TimelineView = dynamic(() => import("./TimelineView").then((mod) => mod.TimelineView), { loading: ViewLoadingSkeleton });
export const FormView = dynamic(() => import("./FormView").then((mod) => mod.FormView), { ssr: false, loading: ViewLoadingSkeleton });
export const MindMapView = dynamic(() => import("./MindMapView").then((mod) => mod.MindMapView), { ssr: false, loading: ViewLoadingSkeleton });
export const WorkloadView = dynamic(() => import("./WorkloadView").then((mod) => mod.WorkloadView), { loading: ViewLoadingSkeleton });
export const WhiteboardView = dynamic(() => import("./WhiteboardView"), { loading: ViewLoadingSkeleton });
export const MapView = dynamic(() => import("./MapView").then((mod) => mod.MapView), { ssr: false, loading: ViewLoadingSkeleton });
export const GenericDashboardView = dynamic(() => import("./DashboardView").then((mod) => mod.DashboardView), { loading: ViewLoadingSkeleton });
export const EmbedView = dynamic(() => import("./EmbedView").then((mod) => mod.EmbedView), { loading: ViewLoadingSkeleton });
export const DocView = dynamic(() => import("./DocView").then((mod) => mod.DocView), { loading: ViewLoadingSkeleton });
