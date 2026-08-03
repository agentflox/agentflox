"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmArchiveConversationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    onConfirm: () => void | Promise<void>;
    isLoading?: boolean;
}

export function ConfirmArchiveConversationModal({
    open,
    onOpenChange,
    title,
    onConfirm,
    isLoading = false,
}: ConfirmArchiveConversationModalProps) {
    const handleConfirm = async () => {
        await onConfirm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl"
            >
                <div className="p-6 pb-5 space-y-5">
                    {/* Icon + Title */}
                    <DialogHeader className="gap-3">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 shadow-sm">
                                <Archive className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-[15px] font-semibold text-zinc-900 leading-tight">
                                    Archive Chat?
                                </DialogTitle>
                                <DialogDescription className="mt-0.5 text-[13px] text-zinc-500 leading-relaxed">
                                    This action will move <span className="font-medium text-zinc-700">{title || 'this chat'}</span> to the archive.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Warning box */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3">
                        <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-[12.5px] text-blue-800 leading-relaxed">
                            <span className="font-semibold">{title || 'This chat'}</span>
                            {` will be archived and hidden from the main list.`}
                        </p>
                    </div>

                    {/* Footer */}
                    <DialogFooter className="flex-row gap-2 pt-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="flex-1 h-9 rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-[13px] font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className={cn(
                                "flex-1 h-9 rounded-lg text-[13px] font-medium gap-1.5 transition-all",
                                "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-900/10",
                                "disabled:opacity-40 disabled:cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Archiving...
                                </>
                            ) : (
                                <>
                                    <Archive className="h-3.5 w-3.5" />
                                    Archive Chat
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
