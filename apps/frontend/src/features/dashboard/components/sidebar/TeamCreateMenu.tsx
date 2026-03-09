"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
    Plus,
    Users
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamCreateMenuProps {
    onCreateNew: () => void;
    onImport: () => void;
}

export function TeamCreateMenu({ onCreateNew, onImport }: TeamCreateMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-400 hover:text-zinc-900 md:h-4 md:w-4">
                    <Plus size={14} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel className="text-xs text-zinc-400 uppercase tracking-wider">Create New</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={onCreateNew}>
                    <Users className="mr-2 h-4 w-4" /> Create New...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onImport}>
                    <Users className="mr-2 h-4 w-4" /> Import Existing...
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
