"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, Search, UserCheck, Crown, Mail, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectTransferModalProps {
    projectId: string | null;
    projectName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ProjectTransferModal({ projectId, projectName, open, onOpenChange, onSuccess }: ProjectTransferModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Debounce search query (300ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch project data to get current owner and validate permissions
    const { data: project, isLoading: isLoadingProject } = trpc.project.get.useQuery(
        { id: projectId || "" },
        { enabled: !!projectId && open }
    );

    // Get members from project data
    const allMembers = (project as any)?.members?.map((member: any) => {
        const u = member.user;
        const name = u?.name ||
            u?.username ||
            [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
            u?.email ||
            "Unknown";

        return {
            id: u?.id || member.userId,
            name: name,
            email: u?.email || "",
            avatar: u?.avatar || u?.image || null,
            role: member.role
        };
    }) || [];

    // Filter members client-side
    const currentOwnerId = (project as any)?.createdBy;
    const filteredMembers = allMembers
        .filter((member: any) => member.id !== currentOwnerId) // Exclude current owner
        .filter((member: any) => {
            if (!debouncedSearch) return true;
            const query = debouncedSearch.toLowerCase();
            return (
                member.name?.toLowerCase().includes(query) ||
                member.email?.toLowerCase().includes(query)
            );
        })
        .slice(0, 20); // Limit to 20 results for performance

    const selectedMember = allMembers.find((m: any) => m.id === selectedUserId);

    const resetForm = useCallback(() => {
        setSearchQuery("");
        setDebouncedSearch("");
        setSelectedUserId(null);
        setShowConfirmation(false);
    }, []);

    const handleInitiateTransfer = () => {
        if (!selectedUserId || !selectedMember) return;
        setShowConfirmation(true);
    };

    const handleConfirmTransfer = async () => {
        if (!projectId || !selectedUserId) return;

        try {
            const res = await fetch(`/api/permissions/project/${projectId}/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newOwnerId: selectedUserId })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to transfer ownership');
            }

            toast({
                title: "Ownership transferred successfully",
                description: `${selectedMember?.name} is now the owner of ${projectName}`
            });
            utils.project.get.invalidate({ id: projectId });
            utils.project.list.invalidate();
            utils.project.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.();
            resetForm();

        } catch (error: any) {
            toast({
                title: "Failed to transfer ownership",
                description: error.message || "Please try again or contact support",
                variant: "destructive"
            });
        }
    };

    const isLoading = isLoadingProject;

    if (!projectId) return null;

    return (
        <>
            <Dialog open={open && !showConfirmation} onOpenChange={(open) => {
                if (!open) resetForm();
                onOpenChange(open);
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-amber-600" />
                            Transfer Ownership
                        </DialogTitle>
                        <DialogDescription>
                            Transfer ownership of "{projectName}" to another member
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Critical Warning Banner */}
                        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
                            <div className="flex gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-amber-900">Important</p>
                                    <p className="text-sm text-amber-800 mt-1">
                                        This action will transfer full control of this project. You will be downgraded to Admin role.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-900">Search members</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="pl-9"
                                    disabled={isLoadingProject}
                                />
                                {isLoading && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                                )}
                            </div>
                        </div>

                        {/* Member List */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-900">
                                Select new owner ({filteredMembers.length} available)
                            </Label>
                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-[300px] overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-8 flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                        <p className="text-sm text-slate-500">Loading members...</p>
                                    </div>
                                ) : filteredMembers.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-sm font-medium text-slate-700">
                                            {searchQuery ? "No members found" : "No members available"}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {searchQuery
                                                ? "Try a different search term"
                                                : "Invite members to transfer ownership"}
                                        </p>
                                    </div>
                                ) : (
                                    filteredMembers.map((member: any) => (
                                        <button
                                            key={member.id}
                                            onClick={() => setSelectedUserId(member.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left focus:outline-none focus:bg-slate-100",
                                                selectedUserId === member.id && "bg-blue-50 hover:bg-blue-100"
                                            )}
                                            type="button"
                                        >
                                            {member.avatar ? (
                                                <img
                                                    src={member.avatar}
                                                    alt={member.name}
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-medium">
                                                    {member.name?.charAt(0)?.toUpperCase() || "?"}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-slate-900 truncate">
                                                    {member.name}
                                                </div>
                                                {member.email && (
                                                    <div className="text-sm text-slate-500 truncate flex items-center gap-1">
                                                        <Mail className="h-3 w-3 flex-shrink-0" />
                                                        <span>{member.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedUserId === member.id && (
                                                <UserCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Selection Warning */}
                        {selectedMember && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                <p className="text-sm text-blue-900">
                                    <strong>Selected:</strong> {selectedMember.name} ({selectedMember.email})
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                onOpenChange(false);
                            }}
                            disabled={false}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInitiateTransfer}
                            disabled={!selectedUserId}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <Crown className="mr-2 h-4 w-4" />
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            Confirm Ownership Transfer
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3 pt-2">
                            <p>
                                You are about to transfer ownership of <strong>"{projectName}"</strong> to:
                            </p>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center gap-3">
                                    {selectedMember?.avatar ? (
                                        <img
                                            src={selectedMember.avatar}
                                            alt={selectedMember.name}
                                            className="h-10 w-10 rounded-full"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-medium">
                                            {selectedMember?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-slate-900">{selectedMember?.name}</p>
                                        <p className="text-sm text-slate-600">{selectedMember?.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
                                <p className="text-sm font-semibold text-amber-900 mb-2">What will happen:</p>
                                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                                    <li>{selectedMember?.name} will become the owner</li>
                                    <li>You will be downgraded to Admin role</li>
                                    <li>The new owner will have full control</li>
                                    <li>This action cannot be easily reversed</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowConfirmation(false)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmTransfer}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Transfer Ownership
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
