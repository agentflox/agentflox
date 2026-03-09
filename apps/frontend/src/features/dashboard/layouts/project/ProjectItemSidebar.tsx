"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import { ViewType } from "@/features/dashboard/components/modals/AddViewModal";

type Props = {
    projectId: string;
    type?: ViewType;
    open: boolean;
    onClose: () => void;
    inline?: boolean;
};

export function ProjectItemSidebar({ projectId, type, open, onClose, inline }: Props) {
    // Stub implementation
    return (
        <div className={`${inline ? 'absolute inset-y-0 right-0' : 'fixed inset-y-0 right-0'} z-[60] w-auto min-w-[20rem] max-w-sm bg-background shadow-xl transition-transform duration-300 ${open ? '-translate-x-14' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-medium capitalize">Add {type?.toLowerCase() || 'Item'}</span>
                <button className="rounded-md border p-1.5 hover:bg-muted" onClick={onClose} aria-label="Close">
                    ✕
                </button>
            </div>
            <div className="p-4 space-y-4">
                <div className="py-6 text-sm text-muted-foreground text-center">
                    Adding {type?.toLowerCase()} to projects is coming soon.
                </div>
            </div>
        </div>
    );
}

export default ProjectItemSidebar;
