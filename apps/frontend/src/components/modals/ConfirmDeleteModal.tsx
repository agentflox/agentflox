"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDeleteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The human-readable name of the item(s) being deleted */
    itemName?: string;
    /** How many items are being deleted — when > 1, shows a count-based message */
    count?: number;
    /** Singular label for the entity type, e.g. "workspace", "space", "agent" */
    entityLabel?: string;
    /** Set to true to require the user to type the item name before confirming */
    requireConfirmText?: boolean;
    /** Called when the user confirms deletion */
    onConfirm: () => void | Promise<void>;
    /** Whether the deletion is in progress */
    isLoading?: boolean;
}

export function ConfirmDeleteModal({
    open,
    onOpenChange,
    itemName,
    count = 1,
    entityLabel = "workspace",
    requireConfirmText = false,
    onConfirm,
    isLoading = false,
}: ConfirmDeleteModalProps) {
    const [confirmText, setConfirmText] = useState("");
    const isBulk = count > 1;
    const pluralLabel = `${count} ${entityLabel}s`;
    const label = isBulk ? pluralLabel : (itemName ?? `this ${entityLabel}`);
    const expectedText = isBulk ? "delete" : (itemName ?? "delete");
    const canConfirm = !requireConfirmText || confirmText.trim().toLowerCase() === expectedText.toLowerCase();

    const handleConfirm = async () => {
        await onConfirm();
        setConfirmText("");
        onOpenChange(false);
    };

    const handleCancel = () => {
        setConfirmText("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
            <DialogContent
                hideOverlay
                className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl"
            >
                <div className="p-6 pb-5 space-y-5">
                    {/* Icon + Title */}
                    <DialogHeader className="gap-3">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 border border-red-100 shadow-sm">
                                <Trash2 className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-[15px] font-semibold text-zinc-900 leading-tight">
                                    {isBulk ? `Delete ${count} ${entityLabel}s?` : `Delete ${entityLabel}?`}
                                </DialogTitle>
                                <DialogDescription className="mt-0.5 text-[13px] text-zinc-500 leading-relaxed">
                                    This action is <span className="font-medium text-zinc-700">permanent</span> and cannot be undone.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Warning box */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[12.5px] text-amber-800 leading-relaxed">
                            <span className="font-semibold">{label}</span>
                            {isBulk
                                ? ` and all associated data will be permanently removed.`
                                : ` and all its associated data will be permanently removed.`}
                        </p>
                    </div>

                    {/* Confirm text input */}
                    {requireConfirmText && (
                        <div className="space-y-1.5">
                            <p className="text-[12.5px] text-zinc-500">
                                Type{" "}
                                <span className="font-mono font-semibold text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded-md text-[11px]">
                                    {expectedText}
                                </span>{" "}
                                to confirm
                            </p>
                            <Input
                                id="confirm-delete-input"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={expectedText}
                                className="h-9 text-sm rounded-lg border-zinc-200 focus-visible:ring-red-300 focus-visible:border-red-400"
                                autoFocus
                                onKeyDown={(e) => e.key === "Enter" && canConfirm && !isLoading && handleConfirm()}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <DialogFooter className="flex-row gap-2 pt-1">
                        <Button
                            id="confirm-delete-cancel"
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="flex-1 h-9 rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-[13px] font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            Cancel
                        </Button>
                        <Button
                            id="confirm-delete-confirm"
                            size="sm"
                            onClick={handleConfirm}
                            disabled={!canConfirm || isLoading}
                            className={cn(
                                "flex-1 h-9 rounded-lg text-[13px] font-medium gap-1.5 transition-all",
                                "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-900/10",
                                "disabled:opacity-40 disabled:cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {isBulk ? `Delete ${count} ${entityLabel}s` : `Delete ${entityLabel}`}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
