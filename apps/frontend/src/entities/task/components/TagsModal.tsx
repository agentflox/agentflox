"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Tag, X, MoreHorizontal, Trash2, Plus } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseEncodedTag, formatEncodedTag } from "../utils/tags";
import { cn } from "@/lib/utils";

interface TagsModalProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    allAvailableTags?: string[];
    trigger?: React.ReactNode;
}

const TAG_COLORS = [
    "#c4b5fd", "#93c5fd", "#7dd3fc", "#5eead4", "#6ee7b7", "#fde047", "#fdba74",
    "#818cf8", "#60a5fa", "#0ea5e9", "#14b8a6", "#10b981", "#f59e0b", "#fb923c",
    "#fca5a1", "#f9a8d4", "#d8b4fe", "#a8a29e", "#cbd5e1", "#d4d4d8", "#ef4444",
    "#ec4899", "#a855f7", "#78716c", "#71717a", "",
];

export function TagsModal({
    tags,
    onChange,
    allAvailableTags = [],
    trigger,
}: TagsModalProps) {
    const [searchInput, setSearchInput] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [editingColor, setEditingColor] = useState<string | null>(null);

    // Extract unique tags from all available tags
    const allTags = useMemo(() => {
        const tagsSet = new Set([...allAvailableTags, ...tags]);
        return Array.from(tagsSet);
    }, [allAvailableTags, tags]);

    // Filter and match tags
    const { exactMatch, partialMatches, shouldShowCreate } = useMemo(() => {
        const trimmedSearch = searchInput.trim().toLowerCase();

        if (!trimmedSearch) {
            return {
                exactMatch: null,
                partialMatches: allTags,
                shouldShowCreate: false,
            };
        }

        const exact = allTags.find((tag) => {
            const parsed = parseEncodedTag(tag);
            return parsed.label.toLowerCase() === trimmedSearch;
        });

        const partial = allTags.filter((tag) => {
            const parsed = parseEncodedTag(tag);
            return parsed.label.toLowerCase().includes(trimmedSearch) && parsed.label.toLowerCase() !== trimmedSearch;
        });

        return {
            exactMatch: exact,
            partialMatches: partial,
            shouldShowCreate: !exact,
        };
    }, [searchInput, allTags]);

    const toggleTag = (tag: string) => {
        if (tags.includes(tag)) {
            onChange(tags.filter((t) => t !== tag));
        } else {
            onChange([...tags, tag]);
        }
    };

    const createAndAddTag = () => {
        const trimmed = searchInput.trim();
        if (!trimmed) return;

        const newTag = formatEncodedTag(trimmed);
        if (!tags.includes(newTag)) {
            onChange([...tags, newTag]);
        }
        setSearchInput("");
    };

    const updateTagColor = (oldTag: string, newColor: string) => {
        const parsed = parseEncodedTag(oldTag);
        const newTag = formatEncodedTag(parsed.label, newColor);

        // Update in selected tags
        const updatedTags = tags.map((t) => (t === oldTag ? newTag : t));
        onChange(updatedTags);

        setEditingColor(null);
    };

    const deleteTag = (tagToDelete: string) => {
        onChange(tags.filter((t) => t !== tagToDelete));
    };

    const isTagSelected = (tag: string) => tags.includes(tag);

    const displayTags = searchInput.trim()
        ? exactMatch
            ? [exactMatch, ...partialMatches]
            : partialMatches
        : allTags;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {trigger ?? (
                    <div className={cn(
                        "flex items-center gap-2.5 group cursor-pointer transition-colors",
                        tags && tags.length > 0 ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600"
                    )}>
                        <Tag className="h-5 w-5 opacity-80" />
                        <span className="text-[13px] font-medium tracking-tight">
                            {tags && tags.length > 0 ? `${tags.length} Tag${tags.length !== 1 ? 's' : ''}` : "Add tag"}
                        </span>
                    </div>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3" align="start">
                <div className="space-y-2">
                    {/* Search Input */}
                    <Input
                        autoFocus
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && shouldShowCreate) {
                                e.preventDefault();
                                createAndAddTag();
                            }
                        }}
                        placeholder="Search or add tags..."
                        className="h-9 text-sm border-zinc-200 focus-visible:ring-violet-100"
                    />

                    {/* Tags List */}
                    <div className="max-h-[240px] overflow-y-auto space-y-1">
                        {displayTags.length === 0 && !shouldShowCreate && (
                            <div className="text-xs text-zinc-400 text-center py-4">
                                No tags found
                            </div>
                        )}

                        {displayTags.map((tag) => {
                            const parsed = parseEncodedTag(tag);
                            const selected = isTagSelected(tag);
                            const isExact = tag === exactMatch;

                            return (
                                <div
                                    key={tag}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group/item",
                                        selected ? "bg-zinc-50" : "hover:bg-zinc-50"
                                    )}
                                    onClick={() => toggleTag(tag)}
                                >
                                    <Badge
                                        variant="secondary"
                                        style={{ backgroundColor: parsed.color || "#e5e7eb" }}
                                        className="text-zinc-700 border-0 text-xs h-6 px-2 flex-shrink-0"
                                    >
                                        {parsed.label}
                                    </Badge>

                                    <div className="flex-1" />

                                    {/* Settings button with color picker */}
                                    {selected && (
                                        <HoverCard openDelay={200} closeDelay={100}>
                                            <HoverCardTrigger asChild>
                                                <button
                                                    className="opacity-0 group-hover/item:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingColor(tag);
                                                    }}
                                                >
                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                </button>
                                            </HoverCardTrigger>
                                            <HoverCardContent
                                                side="right"
                                                align="start"
                                                className="w-[220px] p-3"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Color Input at top */}
                                                <Input
                                                    value={parsed.label}
                                                    readOnly
                                                    className="h-8 text-sm mb-3 border-zinc-200 bg-white"
                                                />

                                                {/* Color Palette Grid */}
                                                <div className="grid grid-cols-7 gap-1.5 mb-3">
                                                    {TAG_COLORS.map((color, idx) => (
                                                        <button
                                                            key={idx}
                                                            className={cn(
                                                                "h-7 w-7 rounded-full transition-all hover:scale-110",
                                                                color === ""
                                                                    ? "border-2 border-zinc-300 bg-white relative"
                                                                    : "border-2 border-transparent hover:border-zinc-300"
                                                            )}
                                                            style={{ backgroundColor: color || "white" }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateTagColor(tag, color);
                                                            }}
                                                        >
                                                            {color === "" && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-5 h-0.5 bg-red-500 rotate-45" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                    <button
                                                        className="h-7 w-7 rounded-full border-2 border-dashed border-zinc-300 flex items-center justify-center hover:border-zinc-400 transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Plus className="h-3.5 w-3.5 text-zinc-400" />
                                                    </button>
                                                </div>

                                                {/* Delete Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start h-8 text-xs text-zinc-600 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteTag(tag);
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                    Delete
                                                </Button>
                                            </HoverCardContent>
                                        </HoverCard>
                                    )}
                                </div>
                            );
                        })}

                        {/* Create new tag option */}
                        {shouldShowCreate && searchInput.trim() && (
                            <div
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-zinc-50 transition-colors"
                                onClick={createAndAddTag}
                            >
                                <span className="text-xs text-zinc-500">Create</span>
                                <Badge
                                    variant="secondary"
                                    className="bg-zinc-100 text-zinc-700 border-0 text-xs h-6 px-2"
                                >
                                    {searchInput.trim()}
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
