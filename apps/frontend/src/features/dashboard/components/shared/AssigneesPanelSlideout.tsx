"use client";

import React, { useState } from "react";
import { X, Search, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface UserItem {
    id: string;
    name: string | null;
    image: string | null;
}

export interface AssigneesPanelSlideoutProps {
    open: boolean;
    onClose: () => void;
    users: UserItem[];
    selectedAssignees: string[];
    onSelectionChange: (newSelection: string[]) => void;
}

export function AssigneesPanelSlideout({
    open,
    onClose,
    users,
    selectedAssignees,
    onSelectionChange,
}: AssigneesPanelSlideoutProps) {
    const [assigneesSearch, setAssigneesSearch] = useState("");

    if (!open) return null;

    const handleToggle = (id: string, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedAssignees, id]);
        } else {
            onSelectionChange(selectedAssignees.filter((currentId) => currentId !== id));
        }
    };

    return (
        <>
            <div className="absolute inset-0 z-40" onClick={onClose} aria-hidden />
            <div className="absolute top-0 right-0 h-full w-[320px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                    <h3 className="font-semibold text-zinc-900">Assignees</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-zinc-500 hover:text-zinc-900" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="p-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden cursor-text">
                        <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                        <Input
                            variant="ghost"
                            className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                            placeholder="Search by user or team"
                            value={assigneesSearch}
                            onChange={(e) => setAssigneesSearch(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1 p-3">
                    <p className="text-[13px] font-normal text-zinc-500 mb-2">People <span className="text-zinc-400">{users.length}</span></p>
                    <div className="space-y-0.5 mb-4">
                        <label className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 cursor-pointer">
                            <div className="flex items-center gap-2.5">
                                <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                                    <Users className="h-3.5 w-3.5 text-zinc-600" />
                                </div>
                                <span className="text-[13px] text-zinc-700">Unassigned</span>
                            </div>
                            <Checkbox
                                checked={selectedAssignees.includes("__unassigned__")}
                                onCheckedChange={(checked) => handleToggle("__unassigned__", !!checked)}
                                className="h-4 w-4 rounded-sm border-zinc-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 cursor-pointer"
                            />
                        </label>
                        {users
                            .filter((u) => !assigneesSearch.trim() || (u.name || "").toLowerCase().includes(assigneesSearch.toLowerCase()))
                            .map((u) => (
                                <label key={u.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 cursor-pointer">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Avatar className="h-6 w-6 shrink-0">
                                            <AvatarImage src={u.image || undefined} />
                                            <AvatarFallback className="text-[10px] bg-zinc-900 text-white font-medium">
                                                {u.name?.slice(0, 1).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[13px] text-zinc-700 truncate">{u.name}</span>
                                    </div>
                                    <Checkbox
                                        checked={selectedAssignees.includes(u.id)}
                                        onCheckedChange={(checked) => handleToggle(u.id, !!checked)}
                                        className="h-4 w-4 rounded-sm border-zinc-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                    />
                                </label>
                            ))}
                    </div>
                    <p className="text-[13px] font-normal text-zinc-500 mb-2">Teams <span className="text-zinc-400">0</span></p>
                    <div className="py-2 text-[13px] text-zinc-500">No teams</div>
                </ScrollArea>
                <div className="p-3 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-sm text-zinc-700 flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-zinc-400" /> Assigned comments
                    </span>
                    <Switch className="data-[state=checked]:bg-indigo-500" />
                </div>
            </div>
        </>
    );
}