"use client";

import React, { useState, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoverPickerPopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    onColorSelect: (color: string) => void;
    onUpload: (file: File) => void;
    isUploading?: boolean;
    onLinkSave: (url: string) => void;
    onRemove: () => void;
}

const GALLERY_COLORS = [
    "#6366f1", // Indigo
    "#fbbf24", // Amber
    "#ef4444", // Red
    "#ec4899", // Pink
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f97316", // Orange
    "#a855f7", // Purple
];

export function CoverPickerPopover({
    open,
    onOpenChange,
    children,
    onColorSelect,
    onUpload,
    isUploading,
    onLinkSave,
    onRemove
}: CoverPickerPopoverProps) {
    const [activeTab, setActiveTab] = useState<"gallery" | "upload" | "link">("gallery");
    const [linkUrl, setLinkUrl] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpload(file);
        }
    };

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent 
                align="end" 
                className="w-[420px] p-0 rounded-xl shadow-lg border-zinc-200 overflow-hidden bg-white"
            >
                {/* Tabs Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 pt-2">
                    <div className="flex gap-4">
                        {(["gallery", "upload", "link"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-1 pb-3 pt-2 text-[13px] font-medium capitalize transition-colors relative cursor-pointer",
                                    activeTab === tab ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => {
                            onRemove();
                            onOpenChange(false);
                        }}
                        className="text-[13px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors pb-1 cursor-pointer"
                    >
                        Remove
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-4 min-h-[160px]">
                    {activeTab === "gallery" && (
                        <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-semibold text-zinc-400">Colors</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {GALLERY_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            onColorSelect(color);
                                            onOpenChange(false);
                                        }}
                                        className="h-16 rounded-md hover:ring-2 hover:ring-zinc-300 transition-all focus:outline-none cursor-pointer"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <button className="h-16 rounded-md border border-zinc-200 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                                    <Droplet className="h-3 w-3" /> Custom
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "upload" && (
                        <div className="flex flex-col gap-4">
                            <div 
                                className="border border-dashed border-zinc-300 rounded-md bg-zinc-50 hover:bg-zinc-100 transition-colors flex items-center justify-center py-8 cursor-pointer relative"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="flex items-center gap-2 text-sm text-zinc-600">
                                    <Upload className="h-4 w-4" />
                                    <span>Drag & drop files or <span className="text-blue-600 underline underline-offset-2">browse</span></span>
                                </div>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                            </div>
                            <p className="text-center text-xs text-zinc-400">
                                {isUploading ? "Uploading..." : "Images wider than 1400px are preferred"}
                            </p>
                        </div>
                    )}

                    {activeTab === "link" && (
                        <div className="flex flex-col gap-4 pt-1">
                            <div className="flex gap-2">
                                <Input 
                                    value={linkUrl}
                                    onChange={e => setLinkUrl(e.target.value)}
                                    placeholder="Paste image link..."
                                    className="flex-1"
                                />
                                <Button 
                                    className="bg-indigo-400 hover:bg-indigo-500 text-white"
                                    onClick={() => {
                                        if (linkUrl) {
                                            onLinkSave(linkUrl);
                                            onOpenChange(false);
                                        }
                                    }}
                                >
                                    Save
                                </Button>
                            </div>
                            <p className="text-center text-xs text-zinc-400">Works with any image from the web</p>
                        </div>
                    )}

                    {activeTab === "search" && (
                        <div className="flex items-center justify-center h-24 text-sm text-zinc-500 italic">
                            Search functionality coming soon.
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
