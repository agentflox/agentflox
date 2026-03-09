"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

interface Team {
    id: string;
    name: string;
    description?: string | null;
    status?: string | null;
    size?: number | null;
    updatedAt: Date | string | null;
    spaceId?: string | null;
}

interface SpaceTeamsTabProps {
    workspaceId: string;
    spaceId: string;
    teams?: Team[];
    onAddClick?: () => void;
}

function formatNumber(value: number | null | undefined) {
    if (!value) return "0";
    return value.toLocaleString();
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

export function SpaceTeamsTab({
    workspaceId,
    spaceId,
    teams = [],
    onAddClick,
}: SpaceTeamsTabProps) {
    const utils = trpc.useUtils();
    const teamUpdate = trpc.team.update.useMutation({
        onSuccess: () => {
            utils.workspace.get.invalidate({ id: workspaceId });
            utils.space.get.invalidate({ id: spaceId });
            utils.team.list.invalidate();
        },
    });

    const detachTeam = async (id: string) => {
        try {
            await teamUpdate.mutateAsync({
                id,
                spaceId: null,
                workspaceId: null,
            });
            toast.success("Team removed from space");
        } catch (error) {
            console.error("Failed to detach team:", error);
            toast.error("Failed to remove team from space");
        }
    };

    if (teams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-4 text-center transition-all hover:bg-slate-50">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4 ring-8 ring-slate-50">
                    <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No teams yet</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                    Teams allow you to group members and assign them to projects. Create a team to collaborate.
                </p>
                <Button onClick={onAddClick} className="mt-6" variant="default">
                    Add Team
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
                <Link
                    key={team.id}
                    href={DASHBOARD_ROUTES.TEAM(team.id)}
                    className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5"
                >
                    <div>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                                    {team.name}
                                </p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wider font-medium">
                                {team.status ?? "DRAFT"}
                            </Badge>
                        </div>
                        {team.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                                {team.description}
                            </p>
                        )}
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-medium">{formatNumber(team.size)}</span>
                            <span className="text-slate-300">•</span>
                            <span>Updated {formatDate(team.updatedAt)}</span>
                        </div>
                        <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 focus:opacity-100"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                detachTeam(team.id);
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
