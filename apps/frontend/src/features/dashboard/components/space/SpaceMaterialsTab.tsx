"use client";

import { toast } from "sonner";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

interface Material {
    id: string;
    title: string;
    description?: string | null;
    isPublic?: boolean;
    priceUsd?: number | null;
}

interface SpaceMaterialsTabProps {
    workspaceId: string;
    spaceId: string;
    materials?: Material[];
    onAddClick?: () => void;
}

export function SpaceMaterialsTab({
    workspaceId,
    spaceId,
    materials = [],
    onAddClick,
}: SpaceMaterialsTabProps) {
    const utils = trpc.useUtils();
    const materialUpdate = trpc.material.update.useMutation({
        onSuccess: () => {
            utils.workspace.get.invalidate({ id: workspaceId });
            utils.space.get.invalidate({ id: spaceId });
            utils.material.list.invalidate();
        },
    });

    const detachMaterial = async (id: string) => {
        try {
            await materialUpdate.mutateAsync({
                id,
                spaceId: null,
                workspaceId: null,
            });
            toast.success("Material removed from space");
        } catch (error) {
            console.error("Failed to detach material:", error);
            toast.error("Failed to remove material from space");
        }
    };

    if (materials.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-4 text-center transition-all hover:bg-slate-50">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4 ring-8 ring-slate-50">
                    <Package className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No materials yet</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                    Materials are resources or assets you can share or sell. Add materials to this space.
                </p>
                <Button onClick={onAddClick} className="mt-6" variant="default">
                    Add Material
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((material) => (
                <Card
                    key={material.id}
                    className="group relative border-slate-200 transition-all hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5"
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-900 line-clamp-1">
                            {material.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {material.description && (
                            <p className="text-sm text-slate-500 line-clamp-2 h-10">
                                {material.description}
                            </p>
                        )}
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={material.isPublic ? "default" : "secondary"}
                                    className={material.isPublic ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : ""}
                                >
                                    {material.isPublic ? "Public" : "Private"}
                                </Badge>
                                {material.priceUsd && (
                                    <span className="text-sm font-semibold text-slate-700">
                                        ${material.priceUsd.toFixed(0)}
                                    </span>
                                )}
                            </div>
                            <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 focus:opacity-100"
                                onClick={() => detachMaterial(material.id)}
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
