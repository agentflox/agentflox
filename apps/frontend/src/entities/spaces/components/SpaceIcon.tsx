"use client";

import { FolderKanban } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface SpaceIconProps {
    icon?: string | null;
    className?: string;
    size?: number;
}

export function SpaceIcon({ icon, className, size = 16 }: SpaceIconProps) {
    if (!icon) return <FolderKanban size={size} className={className} />;

    // Check if icon string matches a known Lucide Icon component
    // We check specifically for components (functions), not just any key
    const IconComp = (LucideIcons as any)[icon];

    // Simple heuristic: if it's a function/object, assumes it's component. 
    // If it's undefined (emoji or random string), fallback to text.
    if (IconComp && typeof IconComp !== 'string') {
        return <IconComp size={size} className={className} />;
    }

    // Check if it's an image URL
    if (icon && (icon.startsWith("http") || icon.startsWith("/") || icon.startsWith("data:"))) {
        return (
            <img
                src={icon}
                alt="Icon"
                className={cn("object-cover rounded-md", className)}
                style={{ width: size, height: size }}
            />
        );
    }

    // Fallback: render as emoji/text
    return <span className={cn("inline-block", className)} style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>;
}
