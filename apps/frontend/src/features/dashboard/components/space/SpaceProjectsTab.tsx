"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FolderKanban, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

interface Project {
    id: string;
    name: string;
    description?: string | null;
    status?: string | null;
    updatedAt: Date | string | null;
    spaceId?: string | null;
}

interface SpaceProjectsTabProps {
    workspaceId: string;
    spaceId: string;
    projects?: Project[];
    onAddClick?: () => void;
}

function formatDate(input?: Date | string | null) {
    if (!input) return "—";
    const date = typeof input === "string" ? new Date(input) : input;
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function SpaceProjectsTab({
    workspaceId,
    spaceId,
    projects = [],
    onAddClick,
}: SpaceProjectsTabProps) {
    const utils = trpc.useUtils();
    const projectUpdate = trpc.project.update.useMutation({
        onSuccess: () => {
            utils.workspace.get.invalidate({ id: workspaceId });
            utils.space.get.invalidate({ id: spaceId });
            utils.project.list.invalidate();
        },
    });

    const detachProject = async (id: string) => {
        try {
            await projectUpdate.mutateAsync({
                id,
                spaceId: null,
                workspaceId: null,
            });
            toast.success("Project removed from space");
        } catch (error) {
            console.error("Failed to detach project:", error);
            toast.error("Failed to remove project from space");
        }
    };

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-4 text-center transition-all hover:bg-slate-50">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4 ring-8 ring-slate-50">
                    <FolderKanban className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No projects yet</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                    Projects allow you to organize tasks and deliverables. Add a project to get started.
                </p>
                <Button onClick={onAddClick} className="mt-6" variant="default">
                    Add Project
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
                <Link
                    key={project.id}
                    href={DASHBOARD_ROUTES.PROJECT(project.id)}
                    className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5"
                >
                    <div>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                                    {project.name}
                                </p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wider font-medium">
                                {project.status ?? "DRAFT"}
                            </Badge>
                        </div>
                        {project.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                                {project.description}
                            </p>
                        )}
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-xs font-medium text-slate-400">
                            Updated {formatDate(project.updatedAt)}
                        </span>
                        <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 focus:opacity-100"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                detachProject(project.id);
                            }}
                            title="Remove from space"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </Link>
            ))}
        </div>
    );
}
