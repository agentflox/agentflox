"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, Users, User, Eye, MessageSquare, Edit } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ViewShareDialogProps {
    viewId: string;
    viewName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type SharePermission = "VIEW" | "COMMENT" | "FULL";

const permissionIcons = {
    VIEW: Eye,
    COMMENT: MessageSquare,
    FULL: Edit,
};

const permissionLabels = {
    VIEW: "Can view",
    COMMENT: "Can comment",
    FULL: "Can edit",
};

export function ViewShareDialog({ viewId, viewName, open, onOpenChange }: ViewShareDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPermission, setSelectedPermission] = useState<SharePermission>("VIEW");

    const utils = trpc.useUtils();

    // Fetch current shares
    const { data: shares = [] } = trpc.view.getShares.useQuery({ viewId }, { enabled: open });

    // Fetch users to share with (could be workspace members, team members, etc.)
    const { data: users = [] } = trpc.user.search.useQuery({ query: searchQuery }, {
        enabled: open && searchQuery.length > 2
    });

    // Mutations
    const shareViewMutation = trpc.view.share.useMutation({
        onSuccess: () => {
            utils.view.getShares.invalidate({ viewId });
            toast.success("View shared successfully");
            setSearchQuery("");
        },
        onError: (err) => toast.error(`Failed to share view: ${err.message}`),
    });

    const updateShareMutation = trpc.view.updateShare.useMutation({
        onSuccess: () => {
            utils.view.getShares.invalidate({ viewId });
            toast.success("Permission updated");
        },
        onError: (err) => toast.error(`Failed to update permission: ${err.message}`),
    });

    const removeShareMutation = trpc.view.removeShare.useMutation({
        onSuccess: () => {
            utils.view.getShares.invalidate({ viewId });
            toast.success("Access removed");
        },
        onError: (err) => toast.error(`Failed to remove access: ${err.message}`),
    });

    const handleShare = (userId: string) => {
        shareViewMutation.mutate({
            viewId,
            userId,
            permission: selectedPermission,
        });
    };

    const handleUpdatePermission = (shareId: string, permission: SharePermission) => {
        updateShareMutation.mutate({ shareId, permission });
    };

    const handleRemoveShare = (shareId: string) => {
        removeShareMutation.mutate({ shareId });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Share "{viewName}"</DialogTitle>
                    <DialogDescription>
                        Give others access to this view. They'll be able to see it in their sidebar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Search and Add */}
                    <div className="space-y-2">
                        <Label>Add people or teams</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1"
                            />
                            <Select value={selectedPermission} onValueChange={(v) => setSelectedPermission(v as SharePermission)}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VIEW">Can view</SelectItem>
                                    <SelectItem value="COMMENT">Can comment</SelectItem>
                                    <SelectItem value="FULL">Can edit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Results */}
                        {searchQuery.length > 2 && users.length > 0 && (
                            <div className="mt-2 rounded-lg border border-zinc-200 divide-y divide-zinc-100 max-h-[200px] overflow-y-auto">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 hover:bg-zinc-50 cursor-pointer"
                                        onClick={() => handleShare(user.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.image || undefined} />
                                                <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                                                    {user.name?.substring(0, 2).toUpperCase() || "??"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="text-sm font-medium text-zinc-900">{user.name}</div>
                                                <div className="text-xs text-zinc-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Current Shares */}
                    {shares.length > 0 && (
                        <div className="space-y-2">
                            <Label>People with access</Label>
                            <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100">
                                {shares.map((share) => {
                                    const PermissionIcon = permissionIcons[share.permission as SharePermission];

                                    return (
                                        <div key={share.id} className="flex items-center justify-between p-3">
                                            <div className="flex items-center gap-3">
                                                {share.user ? (
                                                    <>
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={share.user.image || undefined} />
                                                            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                                                                {share.user.name?.substring(0, 2).toUpperCase() || "??"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="text-sm font-medium text-zinc-900">{share.user.name}</div>
                                                            <div className="text-xs text-zinc-500">{share.user.email}</div>
                                                        </div>
                                                    </>
                                                ) : share.team ? (
                                                    <>
                                                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                                            <Users className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-zinc-900">{share.team.name}</div>
                                                            <div className="text-xs text-zinc-500">Team</div>
                                                        </div>
                                                    </>
                                                ) : null}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={share.permission}
                                                    onValueChange={(v) => handleUpdatePermission(share.id, v as SharePermission)}
                                                >
                                                    <SelectTrigger className="w-[140px] h-8">
                                                        <div className="flex items-center gap-2">
                                                            <PermissionIcon className="h-3.5 w-3.5" />
                                                            <span className="text-xs">{permissionLabels[share.permission as SharePermission]}</span>
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="VIEW">
                                                            <div className="flex items-center gap-2">
                                                                <Eye className="h-3.5 w-3.5" />
                                                                Can view
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="COMMENT">
                                                            <div className="flex items-center gap-2">
                                                                <MessageSquare className="h-3.5 w-3.5" />
                                                                Can comment
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="FULL">
                                                            <div className="flex items-center gap-2">
                                                                <Edit className="h-3.5 w-3.5" />
                                                                Can edit
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                                    onClick={() => handleRemoveShare(share.id)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Link Sharing */}
                    <div className="pt-4 border-t border-zinc-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Eye className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-zinc-900">Anyone with the link</div>
                                    <div className="text-xs text-zinc-500">Anyone with the link can view</div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                Copy link
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
