import {
    Bot,
    MessageSquare,
    Briefcase,
    Folder,
    CheckSquare,
    FileText,
    Wrench,
    Users,
    Terminal,
    Plus,
    Sparkles,
    Activity,
    Home,
    Clock,
    ArrowRight
} from 'lucide-react';

export function getIconComponent(iconName: string | undefined): any {
    if (!iconName) return Terminal;

    const iconMap: Record<string, any> = {
        'MessageSquare': MessageSquare,
        'Bot': Bot,
        'Briefcase': Briefcase,
        'Folder': Folder,
        'CheckSquare': CheckSquare,
        'FileText': FileText,
        'Wrench': Wrench,
        'Users': Users,
        'Plus': Plus,
        'Terminal': Terminal,
        'Sparkles': Sparkles,
        'Activity': Activity,
        'Home': Home,
        'Clock': Clock,
        'workspace': Briefcase,
        'project': Folder,
        'team': Users,
        'task': CheckSquare,
        'material': FileText,
        'tool': Wrench,
        'command': MessageSquare,
        'agent': Bot,
    };

    return iconMap[iconName] || Terminal;
}
