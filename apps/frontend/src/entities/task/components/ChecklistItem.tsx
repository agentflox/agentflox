'use client';

import * as React from 'react';
import { Check, GripVertical, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

interface ChecklistItemProps {
    item?: any;
    checklistId: string;
    taskId: string;
    workspaceMembers?: any[];
    isNew?: boolean;
}

export function ChecklistItem({
    item,
    checklistId,
    taskId,
    workspaceMembers = [],
    isNew = false
}: ChecklistItemProps) {
    const [isEditing, setIsEditing] = React.useState(isNew);
    const [itemName, setItemName] = React.useState(item?.name || '');
    const [assigneeOpen, setAssigneeOpen] = React.useState(false);

    const utils = trpc.useUtils();

    // Mutations
    const createItem = trpc.task.checklists.items.create.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            setItemName('');
            setIsEditing(false);
            if (isNew) setIsEditing(true); // Keep new item input active
        }
    });

    const updateItem = trpc.task.checklists.items.update.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            setIsEditing(false);
        }
    });

    const toggleItem = trpc.task.checklists.items.toggle.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
        }
    });

    const deleteItem = trpc.task.checklists.items.delete.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('Item deleted');
        }
    });

    const handleSave = () => {
        if (!itemName.trim()) {
            if (!isNew) setIsEditing(false);
            return;
        }

        if (isNew) {
            createItem.mutate({
                checklistId,
                name: itemName.trim(),
            });
        } else if (item) {
            updateItem.mutate({
                id: item.id,
                name: itemName.trim(),
            });
        }
    };

    const handleToggle = () => {
        if (item) {
            toggleItem.mutate({ id: item.id });
        }
    };

    const handleAssigneeChange = (userId: string | null) => {
        if (item) {
            updateItem.mutate({
                id: item.id,
                assigneeId: userId,
            });
        }
        setAssigneeOpen(false);
    };

    if (isNew || isEditing) {
        return (
            <div className="flex items-center gap-2 p-2 rounded-md hover:bg-zinc-50 group">
                <div className="h-4 w-4 rounded border-2 border-zinc-300 shrink-0" />
                <Input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder={isNew ? "Add an item..." : "Item name"}
                    className="h-7 text-sm border-none shadow-none focus-visible:ring-0 px-0"
                    autoFocus={!isNew}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') {
                            if (isNew) {
                                setItemName('');
                            } else {
                                setItemName(item?.name || '');
                                setIsEditing(false);
                            }
                        }
                    }}
                    onBlur={handleSave}
                />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-zinc-50 group">
            <GripVertical className="h-4 w-4 text-zinc-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            
            {/* Checkbox */}
            <button
                onClick={handleToggle}
                className={cn(
                    "h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-all",
                    item.isCompleted
                        ? "bg-green-500 border-green-500"
                        : "border-zinc-300 hover:border-green-500"
                )}
                disabled={toggleItem.isLoading}
            >
                {item.isCompleted && <Check className="h-3 w-3 text-white" />}
            </button>

            {/* Item Name */}
            <span
                className={cn(
                    "flex-1 text-sm cursor-text",
                    item.isCompleted
                        ? "line-through text-zinc-400"
                        : "text-zinc-700"
                )}
                onClick={() => setIsEditing(true)}
            >
                {item.name}
            </span>

            {/* Assignee */}
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {item.assignee ? (
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={item.assignee.image || undefined} />
                                <AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">
                                    {item.assignee.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <User className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="end">
                    <Command>
                        <CommandInput placeholder="Assign to..." />
                        <CommandList className="max-h-[200px]">
                            <CommandEmpty>No members found.</CommandEmpty>
                            <CommandGroup>
                                {item.assignee && (
                                    <CommandItem
                                        onSelect={() => handleAssigneeChange(null)}
                                        className="cursor-pointer text-red-600"
                                    >
                                        Remove assignee
                                    </CommandItem>
                                )}
                                {workspaceMembers.map((member: any) => (
                                    <CommandItem
                                        key={member.id}
                                        value={member.name}
                                        onSelect={() => handleAssigneeChange(member.id)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={member.image || undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {member.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">{member.name}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Delete */}
            <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteItem.mutate({ id: item.id })}
                disabled={deleteItem.isLoading}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
