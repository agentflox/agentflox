"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

type Props = {
    projectId: string;
    open: boolean;
    onClose: () => void;
    inline?: boolean;
};

export function ProjectSettingsSidebar({ projectId, open, onClose, inline }: Props) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: open });

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (project) {
            setName(project.name || "");
            setDescription(project.description || "");
        }
    }, [project]);

    const updateMutation = trpc.project.update.useMutation();

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync({ id: projectId, name: name.trim() || undefined, description: description.trim() || undefined });
            await utils.project.get.invalidate({ id: projectId });
            toast({ title: "Saved", description: "Project updated" });
            onClose();
        } catch (error: any) {
            toast({ title: "Failed to save", description: error?.message ?? "Please try again.", variant: "destructive" });
        }
    };

    return (
        <div className={`${inline ? 'absolute inset-y-0 right-0' : 'fixed inset-y-0 right-0'} z-[60] w-auto min-w-[20rem] max-w-sm bg-background shadow-xl transition-transform duration-300 ${open ? '-translate-x-14' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-medium">Project settings</span>
                <button className="rounded-md border p-1.5 hover:bg-muted" onClick={onClose} aria-label="Close">✕</button>
            </div>
            <div className="p-4 space-y-4">
                <div className="space-y-2">
                    <label htmlFor="project-name" className="text-sm font-medium">Title</label>
                    <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project title" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="project-description" className="text-sm font-medium">Description</label>
                    <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={updateMutation.isPending}>Save</Button>
                </div>
            </div>
        </div>
    );
}

export default ProjectSettingsSidebar;
