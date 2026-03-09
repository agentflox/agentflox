"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { Tag, X } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseEncodedTag } from "../utils/tags";

interface TagsPopoverProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    /** Optional custom trigger element (e.g. "+3" badge). */
    trigger?: ReactNode;
}

export function TagsPopover({
    tags,
    onChange,
    trigger,
}: TagsPopoverProps) {
    const [localTags, setLocalTags] = useState<string[]>(tags);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        setLocalTags(tags);
    }, [tags]);

    const addTag = () => {
        const trimmed = inputValue.trim();
        if (!trimmed || localTags.includes(trimmed)) return;
        const next = [...localTags, trimmed];
        setLocalTags(next);
        onChange(next);
        setInputValue("");
    };

    const removeTag = (index: number) => {
        const next = localTags.filter((_, i) => i !== index);
        setLocalTags(next);
        onChange(next);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                {trigger ?? (
                    <button
                        type="button"
                        className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700"
                        title="Edit tags"
                    >
                        <Tag className="h-3.5 w-3.5" />
                    </button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                        {localTags.map((tag, index) => {
                            const parsed = parseEncodedTag(tag);
                            const bg = parsed.color ?? "#ede9fe";
                            return (
                            <Badge
                                key={`${tag}-${index}`}
                                variant="secondary"
                                style={{ backgroundColor: bg }}
                                className="text-zinc-600 border-zinc-200 text-[10px] h-5 px-1.5 gap-1"
                            >
                                {parsed.label}
                                <button
                                    type="button"
                                    onClick={() => removeTag(index)}
                                    className="hover:text-red-600 rounded-full p-0.5"
                                    aria-label="Remove tag"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        );})}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addTag();
                                }
                            }}
                            placeholder="Add tags..."
                            className="h-8 text-sm"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
