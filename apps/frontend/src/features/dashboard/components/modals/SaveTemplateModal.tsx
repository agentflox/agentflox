"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface SaveTemplateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    view: any;
    workspaceId: string;
}

export function SaveTemplateModal({ open, onOpenChange, view, workspaceId }: SaveTemplateModalProps) {
    const [name, setName] = useState(`${view.name} Template`);
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Custom Views");

    const createTemplateMutation = trpc.template.create.useMutation({
        onSuccess: () => {
            toast.success("View saved as template!");
            onOpenChange(false);
        },
        onError: (err) => toast.error(`Failed to save template: ${err.message}`),
    });

    const handleSave = () => {
        if (!name) {
            toast.error("Template name is required");
            return;
        }

        createTemplateMutation.mutate({
            name,
            description,
            category,
            type: "VIEW",
            workspaceId,
            content: {
                type: view.type,
                config: view.config,
                filters: view.filters,
                grouping: view.grouping,
                sorting: view.sorting,
                columns: view.columns,
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Save className="h-5 w-5 text-primary" />
                        Save as Template
                    </DialogTitle>
                    <DialogDescription>
                        Created templates can be reused across this workspace.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter template name..."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Custom Views">Custom Views</SelectItem>
                                <SelectItem value="Development">Development</SelectItem>
                                <SelectItem value="Management">Management</SelectItem>
                                <SelectItem value="Reporting">Reporting</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Explain how to use this view..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={createTemplateMutation.isLoading}>
                        {createTemplateMutation.isLoading ? "Saving..." : "Save Template"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
