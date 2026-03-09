import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    FolderOpen,
    CheckSquare,
    Plus,
    Calendar,
    Users,
    Activity,
    UserPlus,
    Briefcase,
    FileText,
    Edit,
    Download,
    LucideIcon
} from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    action: string;
    icon?: string;
    variant?: 'default' | 'primary' | 'secondary' | 'destructive';
}

interface QuickActionsBarProps {
    actions: QuickAction[];
    onActionClick: (action: QuickAction) => void;
    className?: string;
}

const iconMap: Record<string, LucideIcon> = {
    FolderOpen,
    CheckSquare,
    Plus,
    Calendar,
    Users,
    Activity,
    UserPlus,
    Briefcase,
    FileText,
    Edit,
    Download,
};

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
    actions,
    onActionClick,
    className
}) => {
    if (actions.length === 0) return null;

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-4 py-2 border-t bg-muted/30",
                "animate-in slide-in-from-bottom-2 duration-300",
                className
            )}
        >
            <span className="text-xs font-medium text-muted-foreground mr-2">
                Quick actions:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {actions.map((action) => {
                    const IconComponent = action.icon ? iconMap[action.icon] : null;

                    return (
                        <Button
                            key={action.id}
                            variant={action.variant === 'primary' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onActionClick(action)}
                            className={cn(
                                "flex items-center gap-1.5 whitespace-nowrap",
                                "transition-all hover:scale-105",
                                action.variant === 'primary' && "bg-primary text-primary-foreground"
                            )}
                        >
                            {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                            {action.label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
};
