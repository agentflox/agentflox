"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface TaskEmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any;
}
export function TaskEmailModal({ open, onOpenChange, task }: TaskEmailModalProps) {
    const email = `task.${task.customId || task.id}@tasks.agentflox.com`; // Adapted generic format
    const [skipModal, setSkipModal] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(email);
        toast.success("Email copied to clipboard");
        if (skipModal) {
            localStorage.setItem("skipTaskEmailModal", "true");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader className="pt-2">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <div className="p-1 border rounded-md">
                            <MailIcon />
                        </div>
                        Attach emails to this task
                    </DialogTitle>
                </DialogHeader>
                <div className="py-2 space-y-4">
                    <p className="text-sm text-zinc-600">
                        Send or forward an email to this address to create a comment:
                    </p>
                    <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                            <Input readOnly value={email} className="pr-20 text-zinc-500 bg-zinc-50" />
                            <Button
                                size="sm"
                                variant="outline"
                                className="absolute right-1 top-1 h-8 bg-white"
                                onClick={handleCopy}
                            >
                                <Copy className="mr-1 h-3 w-3" /> Copy
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="skipModal"
                            className="rounded border-zinc-300"
                            checked={skipModal}
                            onChange={(e) => setSkipModal(e.target.checked)}
                        />
                        <label htmlFor="skipModal" className="text-sm text-zinc-600 cursor-pointer select-none">
                            Skip this modal and copy email every time
                        </label>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MailIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
}
