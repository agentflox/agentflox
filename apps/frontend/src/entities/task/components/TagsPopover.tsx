"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { Tag, X, MoreHorizontal } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseEncodedTag } from "../utils/tags";
import { TagEditorPopover } from "./TagEditorPopover";

interface TagsPopoverProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    /** Optional custom trigger element (e.g. "+3" badge). */
    trigger?: ReactNode;
    /** Callback when the user clicks the edit (...) button on a tag. */
    onEditTag?: (tag: string) => void;
}

export function TagsPopover({
    tags,
    onChange,
    trigger,
    onEditTag,
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
            {trigger ? (
                <PopoverTrigger asChild>
                    {trigger}
                </PopoverTrigger>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                            >
                                <Tag className="h-3.5 w-3.5" />
                            </button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                        Edit tags
                    </TooltipContent>
                </Tooltip>
            )}
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
                                    className="text-zinc-600 border-zinc-200 text-[10px] h-5 px-1.5 gap-1 group"
                                >
                                    <TagEditorPopover
                                        tag={tag}
                                        tags={localTags}
                                        onChange={(nextTags) => {
                                            setLocalTags(nextTags);
                                            onChange(nextTags);
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="opacity-0 group-hover:opacity-100 hover:text-zinc-900 rounded-full cursor-pointer transition-opacity"
                                            aria-label="Edit tag"
                                        >
                                            <MoreHorizontal className="h-3 w-3" />
                                        </button>
                                    </TagEditorPopover>
                                    {parsed.label}
                                    <button
                                        type="button"
                                        onClick={() => removeTag(index)}
                                        className="hover:text-red-600 rounded-full p-0.5 cursor-pointer"
                                        aria-label="Remove tag"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            );
                        })}
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
