"use client";

import * as React from "react";
import { Search, Upload, Ban } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storageUtils } from "@/utils/storage/storageUtils";
import { useToast } from "@/hooks/useToast";

const COLORS = [
    "#FFFFFF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE",
    "#85C1E2", "#F8B739", "#52BE80", "#E74C3C", "#3498DB", "#9B59B6", "#1ABC9C",
    "#F39C12", "#E67E22", "#34495E", "#95A5A6", "#16A085", "#27AE60", "#2980B9",
    "#8E44AD", "#C0392B", "#D35400", "#7F8C8D"
];

// Extract valid icon keys (simple heuristic: starts with uppercase, excluding "Lucide" or specific internal exports)
// We memoize this to avoid re-calculating on every render
const VALID_ICONS = Object.keys(LucideIcons)
    .filter(key => key !== "icons" && key !== "createLucideIcon" && /^[A-Z]/.test(key))
    .sort();

interface EnhancedIconPickerProps {
    icon: string;
    color: string;
    onIconChange: (icon: string) => void;
    onColorChange: (color: string) => void;
    spaceId?: string; // Optional: for space-specific uploads
    bucket?: string; // Optional: defaults to "icons"
    entityName?: string; // Optional: used for default icon character
}

export function EnhancedIconPicker({ icon, color, onIconChange, onColorChange, spaceId, bucket = "icons", entityName }: EnhancedIconPickerProps) {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [view, setView] = React.useState<"icon" | "color">("icon");
    const [isUploading, setIsUploading] = React.useState(false);
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Memoize filtered icons for performance - show MORE icons
    const filteredIcons = React.useMemo(() => {
        if (!searchQuery) return VALID_ICONS.slice(0, 300); // Increased from 100 to 300
        const lowerQuery = searchQuery.toLowerCase();
        return VALID_ICONS.filter(key => key.toLowerCase().includes(lowerQuery)).slice(0, 300);
    }, [searchQuery]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
        if (!validTypes.includes(file.type)) {
            toast({
                title: "Invalid file type",
                description: "Please upload PNG, JPG, WebP, or SVG",
                variant: "destructive",
            });
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Please upload an image smaller than 2MB",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);

        try {
            // Generate path: icons/spaces/{spaceId}/{filename} or icons/{filename}
            const pathPrefix = spaceId ? `spaces/${spaceId}` : "custom";
            const path = storageUtils.generateUniquePath(file.name, pathPrefix);

            const result = await storageUtils.upload({
                file,
                bucket,
                path,
                upsert: true,
            });

            if (result.success && result.url) {
                onIconChange(result.url);
                toast({
                    title: "Icon uploaded",
                    description: "Custom icon uploaded successfully",
                });
            } else {
                toast({
                    title: "Upload failed",
                    description: result.error || "Failed to upload icon",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = "";
        }
    };

    // Render the current icon component dynamically
    // If the icon string matches a Lucide icon, render it.
    // If it's an emoji (or not found), render it as text if possible, or fallback.
    // However, the user is switching TO this picker.

    return (
        <div className="w-[340px] p-2 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border flex flex-col gap-2">

            {/* Header Area */}
            <div className="flex items-center gap-2 px-1">
                <span className="text-sm font-semibold mr-auto">
                    {view === 'icon' ? 'Icon' : 'Color'}
                </span>

                {/* View Toggles (Color Dot & Add Button) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full p-0 border border-zinc-200"
                    style={{ backgroundColor: color }}
                    onClick={() => setView(view === 'icon' ? 'color' : 'icon')}
                    title={view === 'icon' ? "Change Color" : "Back to Icons"}
                    disabled={!icon}
                >
                    {/* Optional: Checkmark if in color view? */}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full text-zinc-500 hover:bg-zinc-100"
                    title={view === 'icon' ? "Clear Icon" : "Clear Color"}
                    onClick={() => {
                        if (view === 'icon') onIconChange("");
                        else onColorChange("");
                    }}
                >
                    <Ban size={12} />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full text-zinc-500 hover:bg-zinc-100"
                    title="Upload Custom Icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <Upload size={12} />
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>

            {/* Icon View Content */}
            {view === 'icon' && (
                <>
                    <div className="relative px-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            className="h-8 pl-9 pr-3 text-xs bg-muted/50 border-none focus-visible:ring-1"
                            placeholder="Search icons..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <ScrollArea className="h-[280px] w-full px-1">
                        <div className="grid grid-cols-7 gap-1 p-2">
                            {/* Special options: Default (Initial) and Empty (None) */}
                            {!searchQuery && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Determine default character from entity name or fallback to "S"
                                            const defaultChar = entityName ? entityName.charAt(0).toUpperCase() : "S";
                                            onIconChange(defaultChar);
                                        }}
                                        className={cn(
                                            "flex items-center justify-center aspect-square rounded-md transition-all hover:bg-muted font-bold",
                                            // Check if current icon matches the default character
                                            icon === (entityName ? entityName.charAt(0).toUpperCase() : "S")
                                                ? "bg-primary/10 border border-primary/50"
                                                : "text-zinc-600 hover:text-zinc-900"
                                        )}
                                        style={
                                            icon === (entityName ? entityName.charAt(0).toUpperCase() : "S") && color
                                                ? {
                                                    color: color,
                                                    backgroundColor: `${color}20`,
                                                    borderColor: `${color}50`
                                                }
                                                : undefined
                                        }
                                        title={entityName || "Default"}
                                    >
                                        {entityName ? entityName.charAt(0).toUpperCase() : "S"}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onIconChange("");
                                        }}
                                        className={cn(
                                            "flex items-center justify-center aspect-square rounded-md transition-all hover:bg-muted text-zinc-600 hover:text-zinc-900",
                                            icon === "" && "bg-primary/10 text-primary border border-primary/50"
                                        )}
                                        title="None"
                                    >
                                        <Ban size={16} />
                                    </button>
                                </>
                            )}

                            {filteredIcons.map((iconName) => {
                                const IconComp = (LucideIcons as any)[iconName];
                                const isSelected = icon === iconName;
                                return (
                                    <button
                                        key={iconName}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onIconChange(iconName);
                                        }}
                                        className={cn(
                                            "flex items-center justify-center aspect-square rounded-md transition-all hover:bg-muted text-zinc-600 hover:text-zinc-900",
                                            isSelected && "bg-primary/10 text-primary border border-primary/50"
                                        )}
                                        title={iconName}
                                    >
                                        <IconComp size={16} />
                                    </button>
                                );
                            })}
                        </div>
                        {filteredIcons.length === 0 && !searchQuery && (
                            /* If searching and no results, this will show below, but if searchQuery is empty we just showed the specials, so this conditional is tricky. 
                               Actually filteredIcons will fallback to 300 items if no query. 
                               So this empty state effectively only triggers on search with no results.
                            */
                            null
                        )}
                        {filteredIcons.length === 0 && searchQuery && (
                            <div className="flex flex-col items-center justify-center text-zinc-400 py-8 text-xs">
                                <span className="mb-2">👻</span>
                                No icons found
                            </div>
                        )}
                    </ScrollArea>
                </>
            )}

            {/* Color View Content */}
            {view === 'color' && (
                <div className="p-1">
                    <div className="grid grid-cols-6 gap-2">
                        {(() => {
                            // Ensure current color is available and first
                            const displayColors = React.useMemo(() => {
                                const uniqueColors = new Set(COLORS);
                                // If color is valid and not empty, ensuring it's in the set wont enforce order, so we build array manually
                                const baseColors = COLORS.filter(c => c !== color);
                                return color && color !== "" ? [color, ...baseColors] : COLORS;
                            }, [color]);

                            return displayColors.map((c) => (
                                <button
                                    key={c}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onColorChange(c);
                                        setView('icon'); // Switch back to icon view after picking color?
                                    }}
                                    className={cn(
                                        "h-8 w-8 rounded-full border border-transparent transition-transform hover:scale-110",
                                        c === "#FFFFFF" && "border-zinc-200",
                                        color === c && "ring-1 ring-primary ring-offset-1"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ));
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
