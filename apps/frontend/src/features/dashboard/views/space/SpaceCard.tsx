import { Badge } from "@/components/ui/badge";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { SpaceActionsMenu } from "@/features/dashboard/components/sidebar/SpaceActionsMenu";

interface SpaceCardProps {
    space: {
        id: string;
        name: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        isActive: boolean;
        _count?: {
            members: number;
        } | null;
    };
    onSelect: (spaceId: string) => void;
}

export function SpaceCard({ space, onSelect }: SpaceCardProps) {
    return (
        <div
            className="group relative flex flex-col rounded-xl border bg-card p-4 hover:bg-muted/30 transition-all hover:shadow-sm"
        >
            <div className="flex items-start justify-between mb-3">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-primary bg-primary/10 shrink-0"
                    style={space.color ? {
                        backgroundColor: `${space.color}20`,
                        color: space.color
                    } : undefined}
                >
                    <SpaceIcon icon={space.icon} size={20} />
                </div>
                <div className="flex items-center">
                    <SpaceActionsMenu spaceId={space.id} />
                </div>
            </div>
            <div className="flex-1 space-y-2 cursor-pointer" onClick={() => onSelect(space.id)}>
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                    {space.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {space.description || "No description provided."}
                </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                {!space.isActive ? (
                    <Badge variant="secondary" className="h-5 px-1.5 font-normal">Archived</Badge>
                ) : (
                    <Badge variant="outline" className="h-5 px-1.5 font-normal border-transparent bg-emerald-50 text-emerald-600">Active</Badge>
                )}
                <span className="flex items-center gap-1">
                    Members: {space._count?.members ?? 0}
                </span>
            </div>
        </div>
    );
}
