"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SpaceIconDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentIcon: string;
    onSave: (newIcon: string) => void;
    isSaving?: boolean;
}

export function SpaceIconDialog({ open, onOpenChange, currentIcon, onSave, isSaving }: SpaceIconDialogProps) {
    const [icon, setIcon] = useState(currentIcon || "🚀");

    useEffect(() => {
        if (open) {
            setIcon(currentIcon || "🚀");
        }
    }, [open, currentIcon]);

    const handleSave = () => {
        if (icon.trim()) {
            onSave(icon.trim());
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Change Space Icon</DialogTitle>
                    <DialogDescription>Enter an emoji or icon character for this space.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="space-icon">Icon</Label>
                        <Input
                            id="space-icon"
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            placeholder="🚀"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSave();
                                }
                            }}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">Enter an emoji or icon character</p>
                    </div>
                    {icon && (
                        <div className="flex items-center justify-center p-4 border rounded-lg bg-muted">
                            <span className="text-4xl">{icon}</span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!icon.trim() || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
