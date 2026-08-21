"use client";

import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trash2, Slash, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseEncodedTag, formatEncodedTag } from "../utils/tags";
import { TagManagerModal } from "@/entities/tags/components/TagManagerModal";

const TAG_COLOR_PALETTE = [
    "#e5e7eb", // zinc-200
    "#c4b5fd", // lavender
    "#93c5fd", // soft blue
    "#7dd3fc", // sky blue
    "#6ee7b7", // mint
    "#fde047", // yellow
    "#fdba74", // orange
    "#fca5a1", // soft red
    "#f9a8d4", // pink
    "#d8b4fe", // purple
    "#d4d4d8", // tan/gray
];

interface TagEditorPopoverProps {
    tag: string;
    tags: string[];
    onChange: (nextTags: string[]) => void;
    workspaceId?: string;
    children: React.ReactNode;
}

export function TagEditorPopover({ tag, tags, onChange, workspaceId, children }: TagEditorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [color, setColor] = useState("");
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

    useEffect(() => {
        if (open) {
            const parsed = parseEncodedTag(tag);
            setName(parsed.label);
            setColor(parsed.color ?? "#e5e7eb");
        }
    }, [open, tag]);

    const handleSave = () => {
        const parsed = parseEncodedTag(tag);
        const newName = name.trim() || parsed.label;
        const encoded = formatEncodedTag(newName, color || undefined);
        const nextTags = tags.map((t) => (t === tag ? encoded : t));
        onChange(nextTags);
    };

    return (
        <>
            <Popover
                open={open}
                onOpenChange={(newOpen) => {
                    if (!newOpen && open) {
                        handleSave();
                    }
                    setOpen(newOpen);
                }}
            >
                <PopoverTrigger asChild>
                    {children}
                </PopoverTrigger>
                <PopoverContent className="w-[230px] p-3 rounded-2xl shadow-xl border-zinc-200 bg-white" side="bottom" align="start" sideOffset={6}>
                    <div className="space-y-3">
                        {/* Input Row with Settings Gear Icon on the Right */}
                        <div className="flex items-center gap-2">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Tag name..."
                                className="h-8 text-xs flex-1 rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-purple-400"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen(false);
                                    setIsTagManagerOpen(true);
                                }}
                                className="h-8 w-8 shrink-0 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer shadow-2xs"
                                title="Tag settings"
                            >
                                <Settings className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Color Selection Palette Grid */}
                        <div className="grid grid-cols-6 gap-2 pt-1">
                            {/* Clear/No Color */}
                            <button
                                type="button"
                                className={cn(
                                    "h-6 w-6 rounded-full border border-zinc-200 flex items-center justify-center bg-white cursor-pointer transition-transform hover:scale-105",
                                    !color && "ring-2 ring-zinc-300 ring-offset-2"
                                )}
                                onClick={() => setColor("")}
                                title="No color"
                            >
                                <Slash className="h-3 w-3 text-red-500" />
                            </button>

                            {TAG_COLOR_PALETTE.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={cn(
                                        "h-6 w-6 rounded-full border border-transparent flex items-center justify-center cursor-pointer transition-transform hover:scale-105",
                                        color === c ? "ring-2 ring-zinc-300 ring-offset-2" : ""
                                    )}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>

                        <Separator className="my-2" />

                        {/* Add Color Option */}
                        <button
                            type="button"
                            className="flex items-center gap-2 text-xs text-zinc-700 hover:bg-zinc-100 rounded-lg px-2 py-1.5 w-full cursor-pointer transition-colors"
                            onClick={() => setColor("#c4b5fd")}
                        >
                            <Plus className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Add color</span>
                        </button>

                        <Separator className="my-2" />

                        {/* Delete Option */}
                        <button
                            type="button"
                            className="flex items-center gap-2 text-xs text-zinc-700 hover:text-red-700 hover:bg-red-50 rounded-lg px-2 py-1.5 w-full cursor-pointer transition-colors"
                            onClick={() => {
                                const nextTags = tags.filter((t) => t !== tag);
                                onChange(nextTags);
                                setOpen(false);
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-600" />
                            <span>Delete</span>
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Tag Manager Modal */}
            <TagManagerModal
                open={isTagManagerOpen}
                onOpenChange={setIsTagManagerOpen}
                workspaceId={workspaceId}
            />
        </>
    );
}
