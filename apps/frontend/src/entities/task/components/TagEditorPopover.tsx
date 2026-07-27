"use client";

import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trash2, Slash, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseEncodedTag, formatEncodedTag } from "../utils/tags";

const TAG_COLOR_PALETTE = [
    "#e5e7eb", // zinc-200
    "#fee2e2", // red-100
    "#ffedd5", // orange-100
    "#fef3c7", // amber-100
    "#dcfce7", // green-100
    "#dbeafe", // blue-100
    "#e0e7ff", // indigo-100
    "#f5d0fe", // fuchsia-100
    "#fce7f3", // pink-100
    "#f3e8ff", // violet-100
    "#e2f3ff", // custom light blue
    "#defbf6", // teal-ish
    "#fef9c3", // yellow-100
    "#fee2f2", // rose-100
];

interface TagEditorPopoverProps {
    tag: string;
    tags: string[];
    onChange: (nextTags: string[]) => void;
    children: React.ReactNode;
}

export function TagEditorPopover({ tag, tags, onChange, children }: TagEditorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [color, setColor] = useState("");

    useEffect(() => {
        if (open) {
            const parsed = parseEncodedTag(tag);
            setName(parsed.label);
            setColor(parsed.color ?? "#f3e8ff");
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
            <PopoverContent className="w-[200px] p-3" side="right" align="start" sideOffset={8} collisionPadding={12}>
                <div className="space-y-3">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name"
                        className="h-8 text-sm"
                        autoFocus
                    />
                    <div className="grid grid-cols-6 gap-1.5">
                        {TAG_COLOR_PALETTE.map((c) => (
                            <button
                                key={c}
                                type="button"
                                className={cn(
                                    "h-6 w-6 rounded-full border border-transparent flex items-center justify-center cursor-pointer",
                                    color === c ? "ring-2 ring-violet-500 ring-offset-1" : ""
                                )}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                            >
                                {color === c && (
                                    <span className="h-2 w-2 rounded-full bg-white" />
                                )}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center bg-zinc-100 text-zinc-400 text-xs cursor-pointer"
                            onClick={() => setColor("")}
                            title="No color"
                        >
                            <Slash className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center bg-white text-zinc-400 text-xs cursor-pointer"
                            onClick={() => setColor("#f3e8ff")}
                            title="Default color"
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                    <Separator className="my-4" />
                    <button
                        type="button"
                        className="flex items-center gap-2 text-xs text-zinc-700 hover:text-red-700 hover:bg-red-50 rounded-md px-1.5 py-2 w-full cursor-pointer"
                        onClick={() => {
                            const nextTags = tags.filter((t) => t !== tag);
                            onChange(nextTags);
                            setOpen(false);
                        }}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
