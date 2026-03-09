"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface EntityRenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
    entityType: "space" | "project" | "team";
    onSave: (newName: string) => void;
    isSaving?: boolean;
}

export function EntityRenameDialog({ open, onOpenChange, currentName, entityType, onSave, isSaving }: EntityRenameDialogProps) {
    const [name, setName] = useState(currentName);

    useEffect(() => {
        if (open) {
            setName(currentName);
        }
    }, [open, currentName]);

    const handleSave = () => {
        if (name.trim() && name.trim() !== currentName) {
            onSave(name.trim());
        }
    };

    const typeLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename {typeLabel}</DialogTitle>
                    <DialogDescription>Enter a new name for this {entityType}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="entity-name">{typeLabel} Name</Label>
                        <Input
                            id="entity-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={`Enter ${entityType} name`}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSave();
                                }
                            }}
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!name.trim() || name.trim() === currentName || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
