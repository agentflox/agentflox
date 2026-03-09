"use client";

import { toast } from "sonner";
import { Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

interface Tool {
    id: string;
    name: string;
    description?: string | null;
    isPublic?: boolean;
}

interface SpaceToolsTabProps {
    workspaceId: string;
    spaceId: string;
    tools?: Tool[];
    onAddClick?: () => void;
}

export function SpaceToolsTab({
    workspaceId,
    spaceId,
    tools = [],
    onAddClick,
}: SpaceToolsTabProps) {
    const utils = trpc.useUtils();
    const toolUpdate = trpc.tool.update.useMutation({
        onSuccess: () => {
            utils.workspace.get.invalidate({ id: workspaceId });
            utils.space.get.invalidate({ id: spaceId });
            utils.tool.list.invalidate();
        },
    });

    const detachTool = async (id: string) => {
        try {
            await toolUpdate.mutateAsync({
                id,
                spaceId: null,
                workspaceId: null,
            });
            toast.success("Tool removed from space");
        } catch (error) {
            console.error("Failed to detach tool:", error);
            toast.error("Failed to remove tool from space");
        }
    };

    if (tools.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-4 text-center transition-all hover:bg-slate-50">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4 ring-8 ring-slate-50">
                    <Wrench className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No tools yet</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                    Tools help your team automate workflows and tasks. Add a tool to enhance productivity.
                </p>
                <Button onClick={onAddClick} className="mt-6" variant="default">
                    Add Tool
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
                <Card
                    key={tool.id}
                    className="group relative border-slate-200 transition-all hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5"
                >
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                            <CardTitle className="text-base font-semibold text-slate-900 line-clamp-1">{tool.name}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {tool.description && (
                            <p className="text-sm text-slate-500 line-clamp-2 h-10">
                                {tool.description}
                            </p>
                        )}
                        <div className="mt-4 flex items-center justify-between">
                            <Badge
                                variant={tool.isPublic ? "default" : "secondary"}
                                className={tool.isPublic ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : ""}
                            >
                                {tool.isPublic ? "Public" : "Private"}
                            </Badge>
                            <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 focus:opacity-100"
                                onClick={() => detachTool(tool.id)}
                                title="Remove from space"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
