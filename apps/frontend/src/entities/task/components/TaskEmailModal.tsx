"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, RefreshCw } from "lucide-react";
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
            <DialogContent className="sm:max-w-md p-6 pb-2">
                <DialogHeader className="pt-2">
                    <DialogTitle className="flex items-center gap-2 mb-1">
                        <div className="h-8 w-8 rounded-md border border-indigo-200 bg-indigo-50 flex items-center justify-center shrink-0">
                            <Mail className="h-5 w-5 text-indigo-500" />
                        </div>
                        <h2 className="text-[20px] font-semibold text-zinc-900">Attach emails to this task</h2>
                    </DialogTitle>
                </DialogHeader>
                <div className="py-2 space-y-4">
                    <p className="text-sm text-zinc-600">
                        Send or forward an email to this address to create a comment:
                    </p>
                    <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                            <Input readOnly value={email} className="pr-[84px] text-zinc-600 bg-white truncate" />
                            <div className="absolute right-1 top-2 flex items-center gap-1 bg-white pl-1">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7 bg-white border-zinc-200"
                                >
                                    <RefreshCw className="h-3 w-3 text-zinc-600" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 bg-white text-[#1976D2] hover:text-[#1565C0] font-medium px-2.5 text-xs border-zinc-200"
                                    onClick={handleCopy}
                                >
                                    Copy
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="my-4 h-[1px] bg-zinc-200 -mx-6" />
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="skipModal"
                            className="rounded border-zinc-300 cursor-pointer"
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