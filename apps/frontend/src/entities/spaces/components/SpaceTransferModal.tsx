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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, Search, UserCheck, Crown, Mail, Info, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpaceTransferModalProps {
    spaceId: string | null;
    spaceName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function SpaceTransferModal({ spaceId, spaceName, open, onOpenChange, onSuccess }: SpaceTransferModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [emailInput, setEmailInput] = useState("");
    const [debouncedEmail, setDebouncedEmail] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isTransferring, setIsTransferring] = useState(false);

    // Debounce email input (400ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedEmail(emailInput.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [emailInput]);

    // Clear selected user when email input changes
    useEffect(() => {
        if (selectedUser && emailInput.trim() !== (selectedUser.email ?? selectedUser.username ?? "")) {
            setSelectedUser(null);
        }
    }, [emailInput]);

    // Look up user by email/username
    const {
        data: foundUser,
        isLoading: isSearching,
        isFetched,
        error: searchError,
    } = trpc.user.searchPeople.useQuery(
        { query: debouncedEmail },
        {
            enabled: !!spaceId && open && debouncedEmail.length >= 3,
            staleTime: 30_000,
            retry: false,
        }
    );

    const resetForm = useCallback(() => {
        setEmailInput("");
        setDebouncedEmail("");
        setSelectedUser(null);
        setIsTransferring(false);
    }, []);

    const displayName = (u: any) =>
        u?.name ||
        [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
        u?.username ||
        u?.email ||
        "Unknown";

    const handleSelectUser = () => {
        if (!foundUser) return;
        setSelectedUser(foundUser as any);
    };

    const handleConfirmTransfer = async () => {
        if (!spaceId || !selectedUser) return;

        setIsTransferring(true);
        try {
            const res = await fetch(`/api/permissions/space/${spaceId}/transfer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newOwnerId: selectedUser.id }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to transfer ownership");
            }

            toast({
                title: "Ownership transferred successfully",
                description: `${displayName(selectedUser)} is now the owner of ${spaceName}`,
            });
            utils.space.get.invalidate({ id: spaceId });
            utils.space.list.invalidate();
            utils.space.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.();
            resetForm();
        } catch (error: any) {
            toast({
                title: "Failed to transfer ownership",
                description: error.message || "Please try again or contact support",
                variant: "destructive",
            });
        } finally {
            setIsTransferring(false);
        }
    };

    // Derive result states
    const hasQuery = debouncedEmail.length >= 3;
    const showResult = hasQuery && isFetched && !isSearching;
    const noUserFound = showResult && !foundUser;
    const userFound = showResult && !!foundUser;

    if (!spaceId) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) resetForm();
                onOpenChange(o);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-600" />
                        Transfer Ownership
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 leading-relaxed pr-4">
                        This will transfer{" "}
                        <strong className="font-semibold text-zinc-700">"{spaceName}"</strong> full
                        control of the space to the new owner, and you'll be downgraded to Admin.{" "}
                        <span className="group relative inline-flex align-middle">
                            <Info className="h-4 w-4 text-zinc-300 hover:text-indigo-500 transition-colors duration-150 cursor-help translate-y-[-3px]" />
                            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg bg-zinc-900 text-white text-[12px] leading-snug px-2.5 py-2 shadow-lg opacity-0 scale-95 origin-bottom group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-20">
                                Ownership transfers can't be undone by canceling — the new owner
                                will need to transfer it back.
                                <span className="absolute top-full left-1/2 -translate-x-1/2 h-2 w-2 -mt-1 rotate-45 bg-zinc-900" />
                            </span>
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pb-2">
                    {/* Email input */}
                    <div className="space-y-1.5">
                        <Label className="!text-xs text-zinc-800">Enter new owner's email</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <Input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder="name@example.com"
                                disabled={isTransferring}
                                autoFocus
                                className="pl-9 h-10 border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 shadow-sm transition-shadow rounded-lg text-sm"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                            )}
                        </div>
                        {!hasQuery && (
                            <p className="text-[11px] text-slate-400">Type at least 3 characters to search</p>
                        )}
                    </div>

                    {/* Result area */}
                    {hasQuery && (
                        <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm min-h-[72px] flex flex-col justify-center bg-white">
                            {isSearching && (
                                <div className="flex items-center gap-2.5 p-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    <span className="text-sm text-slate-500">Looking up user…</span>
                                </div>
                            )}

                            {noUserFound && (
                                <div className="flex items-center gap-3 p-4">
                                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <UserX className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">No user found</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            No account matches <span className="font-medium text-slate-600">"{debouncedEmail}"</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {userFound && !selectedUser && (
                                <button
                                    type="button"
                                    onClick={handleSelectUser}
                                    disabled={isTransferring}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left focus:outline-none focus:bg-indigo-50/50 group"
                                >
                                    {foundUser!.avatar || foundUser!.image ? (
                                        <img
                                            src={(foundUser!.avatar || foundUser!.image)!}
                                            alt={displayName(foundUser)}
                                            className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5 shrink-0"
                                        />
                                    ) : (
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                                            {displayName(foundUser).charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                            {displayName(foundUser)}
                                        </p>
                                        {foundUser!.email && (
                                            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                                <Mail className="h-3 w-3 shrink-0" />
                                                {foundUser!.email}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[11px] font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1">
                                        Select →
                                    </span>
                                </button>
                            )}

                            {selectedUser && (
                                <div className={cn(
                                    "flex items-center gap-3 p-3 bg-indigo-50/80"
                                )}>
                                    {selectedUser.avatar || selectedUser.image ? (
                                        <img
                                            src={(selectedUser.avatar || selectedUser.image)!}
                                            alt={displayName(selectedUser)}
                                            className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5 shrink-0"
                                        />
                                    ) : (
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                                            {displayName(selectedUser).charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                            {displayName(selectedUser)}
                                        </p>
                                        {selectedUser.email && (
                                            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                                <Mail className="h-3 w-3 shrink-0" />
                                                {selectedUser.email}
                                            </p>
                                        )}
                                    </div>
                                    <UserCheck className="h-5 w-5 text-indigo-600 shrink-0 mr-1" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Change selection hint */}
                    {selectedUser && (
                        <button
                            type="button"
                            onClick={() => { setSelectedUser(null); setEmailInput(""); setDebouncedEmail(""); }}
                            disabled={isTransferring}
                            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            ← Choose a different user
                        </button>
                    )}
                </div>

                <DialogFooter className="gap-2.5 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => { resetForm(); onOpenChange(false); }}
                        disabled={isTransferring}
                        className="border-slate-300 bg-white text-slate-700 font-medium shadow-none hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 transition-colors"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmTransfer}
                        disabled={!selectedUser || isTransferring}
                        className={cn(
                            "relative font-semibold text-white transition-all duration-150",
                            "bg-gradient-to-b from-amber-500 to-amber-600",
                            "shadow-[0_1px_2px_rgba(180,83,9,0.3),0_2px_6px_rgba(180,83,9,0.25),inset_0_1px_0_rgba(255,255,255,0.25)]",
                            "hover:from-amber-500 hover:to-amber-700 hover:shadow-[0_2px_4px_rgba(180,83,9,0.35),0_4px_10px_rgba(180,83,9,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]",
                            "active:scale-[0.98] active:shadow-[0_1px_1px_rgba(180,83,9,0.3),inset_0_1px_3px_rgba(0,0,0,0.15)]",
                            "focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2",
                            "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                        )}
                    >
                        {isTransferring ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Crown className="mr-2 h-4 w-4" />
                        )}
                        {isTransferring ? "Transferring..." : "Transfer Ownership"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}