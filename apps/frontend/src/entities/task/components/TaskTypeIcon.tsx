import React from 'react';
import { Target, FileText, List as ListIcon, CheckCircle2, Box, ClipboardList } from 'lucide-react';
import { DynamicLucideIcon } from '@/lib/lucideIcon';
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
    color?: string;
}

export function TaskTypeIcon({ type, className, size = 14, color }: TaskTypeIconProps) {
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

    // Override with explicit color prop if provided
    const finalColor = color || typeColor;

    if (iconName) {
        if (iconName.length <= 2) {
            return (
                <span
                    className={cn("inline-block", className)}
                    style={{ fontSize: size, lineHeight: 1, color: finalColor }}
                >
                    {iconName}
                </span>
            );
        }

        return (
            <DynamicLucideIcon
                name={iconName}
                size={size}
                className={className}
                style={finalColor ? { color: finalColor } : undefined}
            />
        );
    }

    const lowerName = typeName.toLowerCase();
    const lowerIcon = iconName.toLowerCase();

    const Icon = (() => {
        if (lowerIcon === 'target' || lowerName.includes('milestone')) return Target;
        if (lowerIcon === 'file-text' || lowerIcon === 'filetext' || lowerName.includes('meeting')) return FileText;
        if (lowerIcon === 'list' || lowerName.includes('form')) return ClipboardList;
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
            className={cn(className, !finalColor && defaultColorClass)}
            style={finalColor ? { color: finalColor } : undefined}
        />
    );
}
