"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
    Plus,
    List,
    Folder,
    FileText,
    Briefcase,
    Users
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SpaceCreateMenuProps {
    onCreateInternal: (type: 'list' | 'folder' | 'doc') => void;
    onCreateEntity: (type: 'project' | 'team', mode: 'new' | 'import') => void;
}

export function SpaceCreateMenu({ onCreateInternal, onCreateEntity }: SpaceCreateMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-400 hover:text-zinc-900 md:h-4 md:w-4">
                    <Plus size={14} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel className="text-xs text-zinc-400 uppercase tracking-wider">Create New</DropdownMenuLabel>

                <DropdownMenuItem onClick={() => onCreateInternal('list')}>
                    <List className="mr-2 h-4 w-4" /> List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateInternal('folder')}>
                    <Folder className="mr-2 h-4 w-4" /> Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateInternal('doc')}>
                    <FileText className="mr-2 h-4 w-4" /> Doc
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Briefcase className="mr-2 h-4 w-4" /> Project
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => onCreateEntity('project', 'new')}>
                            Create New...
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateEntity('project', 'import')}>
                            Import Existing...
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Users className="mr-2 h-4 w-4" /> Team
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => onCreateEntity('team', 'new')}>
                            Create New...
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateEntity('team', 'import')}>
                            Import Existing...
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

            </DropdownMenuContent>
        </DropdownMenu>
    );
}
