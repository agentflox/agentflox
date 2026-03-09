
import * as React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Check, List } from 'lucide-react';
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskMoveAndAddPopoverProps {
    task: any;
    defaultTab?: 'move' | 'add';
    trigger: React.ReactNode;
    tooltipText: string;
}

export function TaskMoveAndAddPopover({
    task,
    defaultTab = 'move',
    trigger,
    tooltipText
}: TaskMoveAndAddPopoverProps) {
    return (
        <Popover>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            {trigger}
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        {tooltipText}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <PopoverContent align="start" className="w-[280px] p-0" side="bottom" alignOffset={-10}>
                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-2 p-0 h-9 bg-transparent border-b border-zinc-200">
                        <TabsTrigger
                            value="move"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none h-9 text-xs font-medium bg-transparent"
                        >
                            Move task
                        </TabsTrigger>
                        <TabsTrigger
                            value="add"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none h-9 text-xs font-medium bg-transparent"
                        >
                            Add to List
                        </TabsTrigger>
                    </TabsList>
                    <div className="p-0">
                        <TabsContent value="move" className="mt-0">
                            <Command className="border-0">
                                <CommandInput placeholder="Search..." className="h-9 text-xs border-0 focus:ring-0" />
                                <CommandList className="max-h-[260px] overflow-y-auto">
                                    <CommandEmpty className="py-2 text-center text-xs text-zinc-500">No results found.</CommandEmpty>
                                    <CommandGroup heading="Recents">
                                        <CommandItem className="text-xs cursor-pointer" onSelect={() => { }}>
                                            <List className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                                            <span>List</span>
                                            {task.list?.name === 'List' && <Check className="ml-auto h-3 w-3" />}
                                        </CommandItem>
                                    </CommandGroup>
                                    <CommandGroup heading="Spaces">
                                        <CommandItem className="text-xs cursor-pointer" onSelect={() => { }}>
                                            <SpaceIcon icon={task.space?.icon || 'LayoutList'} size={14} className="mr-2" />
                                            <span>{task.space?.name || 'Space'}</span>
                                        </CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </TabsContent>
                        <TabsContent value="add" className="mt-0">
                            <Command className="border-0">
                                <CommandInput placeholder="Search..." className="h-9 text-xs border-0 focus:ring-0" />
                                <CommandList className="max-h-[260px] overflow-y-auto">
                                    <CommandGroup heading="Spaces">
                                        <CommandItem className="text-xs cursor-pointer" onSelect={() => { }}>
                                            <SpaceIcon icon={task.space?.icon || 'LayoutList'} size={14} className="mr-2" />
                                            <span>{task.space?.name || 'Space'}</span>
                                        </CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </TabsContent>
                    </div>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}
