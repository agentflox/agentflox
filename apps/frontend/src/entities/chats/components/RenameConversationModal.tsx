"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, MessageSquare } from "lucide-react";

interface RenameConversationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentTitle: string;
    onConfirm: (newTitle: string) => void | Promise<void>;
    isLoading?: boolean;
}

export function RenameConversationModal({
    open,
    onOpenChange,
    currentTitle,
    onConfirm,
    isLoading = false,
}: RenameConversationModalProps) {
    const [title, setTitle] = useState(currentTitle);

    useEffect(() => {
        if (open) {
            setTitle(currentTitle);
        }
    }, [open, currentTitle]);

    const handleConfirm = async () => {
        if (!title.trim() || title.trim() === currentTitle) return;
        await onConfirm(title.trim());
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-white rounded-2xl gap-0">
                <div className="px-6 pt-6 pb-4">
                    <div className="relative inline-flex mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                            <Pencil className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 border-2 border-white">
                            <MessageSquare className="h-3 w-3 text-white" />
                        </div>
                    </div>
                    <DialogTitle className="text-lg font-bold text-slate-900 mb-1">Rename Chat</DialogTitle>
                    <p className="text-sm text-slate-500">
                        You are about to rename the chat &ldquo;{currentTitle}&rdquo;
                    </p>
                </div>

                <div className="px-6 pb-4">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
                        className="h-10 border-slate-200 rounded-lg text-sm focus-visible:ring-slate-300"
                        autoFocus
                        disabled={isLoading}
                    />
                </div>

                <div className="border-t border-slate-100" />
                <DialogFooter className="px-6 py-4 flex gap-3 sm:gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 h-10 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold disabled:opacity-50"
                        onClick={handleConfirm}
                        disabled={isLoading || !title.trim() || title.trim() === currentTitle}
                    >
                        {isLoading ? "Renaming..." : "Rename"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
