"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { IconColorSelector } from "@/components/ui/icon-color-selector";

interface ProjectIconColorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentIcon: string;
    currentColor: string;
    onSave: (icon: string, color: string) => void;
    isSaving?: boolean;
}

export function ProjectIconColorDialog({ open, onOpenChange, currentIcon, currentColor, onSave, isSaving }: ProjectIconColorDialogProps) {
    const [icon, setIcon] = useState(currentIcon || "💼");
    const [color, setColor] = useState(currentColor || "#4F46E5");

    useEffect(() => {
        if (open) {
            setIcon(currentIcon || "💼");
            setColor(currentColor || "#4F46E5");
        }
    }, [open, currentIcon, currentColor]);

    const handleSave = () => {
        onSave(icon, color);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Color & Icon</DialogTitle>
                    <DialogDescription>Choose an icon and color for this project</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/30">
                        <IconColorSelector
                            icon={icon}
                            color={color}
                            onIconChange={setIcon}
                            onColorChange={setColor}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="h-20 w-20 rounded-xl"
                                style={{ backgroundColor: color }}
                            >
                                <span className="text-4xl">{icon}</span>
                            </Button>
                        </IconColorSelector>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
