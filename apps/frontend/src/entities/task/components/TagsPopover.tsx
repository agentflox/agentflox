"use client";

import React, { useState, useEffect, ReactNode, useRef } from "react";
import { Tag, X, Settings, Check, Plus, MoreHorizontal } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseEncodedTag, formatEncodedTag } from "../utils/tags";
import { TagEditorPopover } from "./TagEditorPopover";
import { TagManagerModal } from "@/entities/tags/components/TagManagerModal";
import { cn } from "@/lib/utils";

interface TagsPopoverProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    /** Optional list of all available tags across the workspace/project */
    allAvailableTags?: string[];
    workspaceId?: string;
    /** Optional custom trigger element (e.g. "+3" badge). */
    trigger?: ReactNode;
    /** Callback when user clicks edit on a tag */
    onEditTag?: (tag: string) => void;
    /** Callback to open Tag Manager */
    onOpenTagManager?: () => void;
}

const DEFAULT_SUGGESTED_TAGS = ["rwa", "test", "urgent", "feature", "bug", "design"];

export function TagsPopover({
    tags,
    onChange,
    allAvailableTags = DEFAULT_SUGGESTED_TAGS,
    workspaceId,
    trigger,
    onEditTag,
    onOpenTagManager,
}: TagsPopoverProps) {
    const [localTags, setLocalTags] = useState<string[]>(tags);
    const [inputValue, setInputValue] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalTags(tags);
    }, [tags]);

    const addTag = (tagText?: string) => {
        const textToAdd = (tagText || inputValue).trim();
        if (!textToAdd) return;

        // Check if label already present
        const labelToAdd = parseEncodedTag(textToAdd).label.toLowerCase();
        const exists = localTags.some(t => parseEncodedTag(t).label.toLowerCase() === labelToAdd);
        if (exists) {
            setInputValue("");
            return;
        }

        const next = [...localTags, textToAdd];
        setLocalTags(next);
        onChange(next);
        setInputValue("");
    };

    const removeTag = (index: number) => {
        const next = localTags.filter((_, i) => i !== index);
        setLocalTags(next);
        onChange(next);
    };

    const toggleTagOption = (option: string) => {
        const optionLabel = parseEncodedTag(option).label.toLowerCase();
        const existingIndex = localTags.findIndex(t => parseEncodedTag(t).label.toLowerCase() === optionLabel);

        if (existingIndex >= 0) {
            removeTag(existingIndex);
        } else {
            addTag(option);
        }
    };

    const handleOpenSettings = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        if (onOpenTagManager) {
            onOpenTagManager();
        } else {
            setIsTagManagerOpen(true);
        }
    };

    // Filter available options
    const availableList = allAvailableTags.length > 0 ? allAvailableTags : DEFAULT_SUGGESTED_TAGS;
    const filteredOptions = availableList.filter((opt) => {
        const label = parseEncodedTag(opt).label.toLowerCase();
        return !inputValue || label.includes(inputValue.toLowerCase().trim());
    });

    const exactMatch = availableList.some((opt) => {
        return parseEncodedTag(opt).label.toLowerCase() === inputValue.toLowerCase().trim();
    });

    const shouldShowCreate = inputValue.trim().length > 0 && !exactMatch;

    return (
        <>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    {trigger ? (
                        trigger
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                                >
                                    <Tag className="h-3.5 w-3.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={4} className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                                Edit tags
                            </TooltipContent>
                        </Tooltip>
                    )}
                </PopoverTrigger>

                <PopoverContent className="w-[300px] p-3 rounded-2xl shadow-xl border-zinc-200 bg-white" align="start" sideOffset={6}>
                    {/* ── INLINE TAG INPUT CONTAINER ── */}
                    <div
                        onClick={() => inputRef.current?.focus()}
                        className="flex flex-wrap items-center gap-1.5 min-h-[38px] p-1.5 px-2.5 rounded-xl border border-zinc-200 bg-white focus-within:ring-2 focus-within:ring-purple-400/20 focus-within:border-purple-500 transition-all cursor-text mb-2.5"
                    >
                        {localTags.map((tag, index) => {
                            const parsed = parseEncodedTag(tag);
                            const bg = parsed.color ?? "#dbeafe";

                            return (
                                <TagEditorPopover
                                    key={`${tag}-${index}`}
                                    tag={tag}
                                    tags={localTags}
                                    onChange={(nextTags) => {
                                        setLocalTags(nextTags);
                                        onChange(nextTags);
                                    }}
                                >
                                    <span
                                        style={{ backgroundColor: bg }}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-purple-900 border border-purple-200/60 shadow-2xs group cursor-pointer hover:opacity-90 transition-all"
                                    >
                                        <span>{parsed.label}</span>
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeTag(index);
                                            }}
                                            className="text-purple-600 hover:text-purple-900 hover:bg-purple-200/60 rounded-full p-0.5 transition-colors cursor-pointer"
                                            aria-label="Remove tag"
                                        >
                                            <X className="h-3 w-3" />
                                        </span>
                                    </span>
                                </TagEditorPopover>
                            );
                        })}

                        <input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                if (!isOpen) setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addTag();
                                } else if (e.key === "Backspace" && !inputValue && localTags.length > 0) {
                                    removeTag(localTags.length - 1);
                                }
                            }}
                            placeholder={localTags.length === 0 ? "Add tags..." : ""}
                            className="flex-1 min-w-[80px] bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus:ring-0 p-0"
                        />
                    </div>

                    {/* ── DROPDOWN POPOVER OPTIONS ── */}
                    <div className="pt-1">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                            <span className="text-xs font-semibold text-zinc-500">Select an option</span>
                            <button
                                type="button"
                                onClick={handleOpenSettings}
                                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                                title="Tag settings"
                            >
                                <Settings className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="space-y-1 max-h-48 overflow-y-auto py-0.5">
                            {filteredOptions.map((opt) => {
                                const parsed = parseEncodedTag(opt);
                                const isSelected = localTags.some(t => parseEncodedTag(t).label.toLowerCase() === parsed.label.toLowerCase());
                                const bg = parsed.color ?? "#f1f5f9";

                                return (
                                    <div
                                        key={opt}
                                        onClick={() => toggleTagOption(opt)}
                                        className={cn(
                                            "group flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 cursor-pointer transition-colors",
                                            isSelected && "bg-purple-50/50 hover:bg-purple-100/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span
                                                style={{ backgroundColor: bg }}
                                                className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-2xs transition-all",
                                                    isSelected ? "font-semibold text-purple-900 border border-purple-200" : "text-zinc-700"
                                                )}
                                            >
                                                {parsed.label}
                                            </span>
                                            {isSelected && <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                                        </div>

                                        <TagEditorPopover
                                            tag={opt}
                                            tags={allAvailableTags}
                                            onChange={(nextAvailable) => {
                                                if (onEditTag) onEditTag(opt);
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => e.stopPropagation()}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200/70 rounded-md text-zinc-400 hover:text-zinc-700 cursor-pointer transition-all"
                                                title="Edit tag"
                                            >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </button>
                                        </TagEditorPopover>
                                    </div>
                                );
                            })}

                            {shouldShowCreate && (
                                <button
                                    type="button"
                                    onClick={() => addTag()}
                                    className="w-full flex items-center justify-start px-2.5 py-1.5 rounded-xl text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer shadow-2xs transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    <span>Create "{inputValue.trim()}"</span>
                                </button>
                            )}
                        </div>
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
