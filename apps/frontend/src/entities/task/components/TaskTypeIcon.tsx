import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Target, FileText, List as ListIcon, CheckCircle2, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskType {
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
}

interface TaskTypeIconProps {
    type?: TaskType | string | null;
    className?: string;
    size?: number;
}

export function TaskTypeIcon({ type, className, size = 14 }: TaskTypeIconProps) {
    let iconName = "";
    let typeName = "";
    let typeColor = "";

    if (typeof type === 'string') {
        typeName = type;
        iconName = type;
    } else if (type) {
        iconName = type.icon || "";
        typeName = type.name || "";
        typeColor = type.color || "";
    }

    // Dynamic Lucide selection (matching SpaceIcon pattern)
    const DynamicIcon = iconName ? (LucideIcons as any)[iconName] : null;

    // If it's a found component, return it
    if (DynamicIcon && typeof DynamicIcon !== 'string') {
        return (
            <DynamicIcon
                size={size}
                className={className}
                style={typeColor ? { color: typeColor } : undefined}
            />
        );
    }

    // Fallback to emoji/text if it looks like one
    if (iconName && !DynamicIcon && iconName.length <= 2) {
        return <span className={cn("inline-block", className)} style={{ fontSize: size, lineHeight: 1, color: typeColor }}>{iconName}</span>;
    }

    // Legacy/Hardcoded fallback Map
    const lowerName = typeName.toLowerCase();
    const lowerIcon = iconName.toLowerCase();

    const Icon = (() => {
        if (lowerIcon === 'target' || lowerName.includes('milestone')) return Target;
        if (lowerIcon === 'file-text' || lowerIcon === 'filetext' || lowerName.includes('meeting')) return FileText;
        if (lowerIcon === 'list' || lowerName.includes('form')) return ListIcon;
        if (lowerIcon === 'box' || lowerIcon === 'package') return Box;
        return CheckCircle2;
    })();

    const defaultColorClass = (() => {
        if (Icon === Target) return "text-purple-500";
        if (Icon === FileText) return "text-orange-500";
        if (Icon === ListIcon) return "text-green-500";
        if (Icon === CheckCircle2) return "text-blue-500";
        return "text-zinc-500";
    })();

    return (
        <Icon
            size={size}
            className={cn(className, !typeColor && defaultColorClass)}
            style={typeColor ? { color: typeColor } : undefined}
        />
    );
}
