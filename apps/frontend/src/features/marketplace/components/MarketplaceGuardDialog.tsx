"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UserCircle2, ArrowRight } from "lucide-react";

interface MarketplaceGuardState {
    isOpen: boolean;
    onContinue?: () => void;
}

export function MarketplaceGuardDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const router = useRouter();

    const handleSetup = () => {
        onOpenChange(false);
        router.push('/dashboard/personal?tab=profile');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCircle2 className="h-5 w-5 text-indigo-500" />
                        Setup Required
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        To publish items on the Marketplace, you must first set up your public profile alias and professional bio.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="bg-indigo-50/50 p-4 rounded-lg my-2 border border-indigo-100">
                    <p className="text-sm text-indigo-900/80 mb-1">We require a complete profile so users know who they are downloading tools or hiring from.</p>
                </div>

                <DialogFooter className="mt-4 sm:justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSetup} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        Setup Profile <ArrowRight className="h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
