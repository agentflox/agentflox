'use client';

import * as React from 'react';
import {
    Search,
    LayoutGrid,
    List as ListIcon,
    ExternalLink,
    Link2,
    MoreHorizontal,
    FileText,
    X,
    Trash2,
} from 'lucide-react';
import { FaFigma, FaYoutube, FaGithub } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

function validateAndNormalizeUrl(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        return new URL(withProtocol).toString();
    } catch {
        return null;
    }
}

const LINK_ATTACHMENT_MIME_TYPE = 'link';

const QUICK_ICONS = [
    { icon: FileText, label: 'Document', color: 'text-blue-600' },
    { icon: FaYoutube, label: 'YouTube', color: 'text-red-600' },
    { icon: FaGithub, label: 'GitHub', color: 'text-zinc-800' },
    { icon: FaFigma, label: 'Figma', color: 'text-purple-600' },
];

interface LinksPanelContentProps {
    taskId: string;
    onLinkAdded?: () => void;
}

export function LinksPanelContent({ taskId, onLinkAdded }: LinksPanelContentProps) {
    const [layout, setLayout] = React.useState<'card' | 'list'>('card');
    const [connectUrlInput, setConnectUrlInput] = React.useState('');
    const [titleInput, setTitleInput] = React.useState('');
    const [descInput, setDescInput] = React.useState('');

    const isExpanded = React.useMemo(() => {
        const trimmed = connectUrlInput.trim();
        if (!trimmed) return false;
        // Strictly require http/https format as requested
        return /^https?:\/\//i.test(trimmed);
    }, [connectUrlInput]);

    const utils = trpc.useUtils();

    const createLink = trpc.task.taskLinks.create.useMutation({
        onSuccess: () => {
            utils.task.taskLinks.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            setConnectUrlInput('');
            setTitleInput('');
            setDescInput('');
            toast.success('Link added');
            onLinkAdded?.();
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to add link');
        },
    });

    const handleAddLink = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedUrl = validateAndNormalizeUrl(connectUrlInput);
        if (!trimmedUrl) {
            toast.error('Please enter a valid URL');
            return;
        }
        const trimmedTitle = titleInput.trim() || trimmedUrl;
        createLink.mutate({
            taskId,
            url: trimmedUrl,
            title: trimmedTitle,
            description: descInput.trim() || undefined,
        });
    };

    return (
        <div className="flex flex-col h-full min-h-0">

            {/* Header */}
            <div className="flex items-center justify-between gap-2 shrink-0 mb-3 px-4 pt-4">
                <h3 className="text-base font-semibold text-zinc-900">Add Links</h3>
            </div>

            {/* Inline Add Link Form */}
            <div className="px-4 mb-4">
                <form onSubmit={handleAddLink} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-zinc-700">{isExpanded ? 'Add a link' : 'Connect a URL'}</label>
                        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 shadow-sm transition-all">
                            <Link2 className="h-4 w-4 text-indigo-500 shrink-0" />
                            <input
                                value={connectUrlInput}
                                onChange={(e) => setConnectUrlInput(e.target.value)}
                                placeholder="https://..."
                                className="flex-1 min-w-0 bg-transparent text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none"
                            />
                            {connectUrlInput && (
                                <button type="button" onClick={() => setConnectUrlInput('')} className="text-zinc-400 hover:text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-full p-0.5 transition-colors cursor-pointer shrink-0">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-zinc-700">Title</label>
                                <input
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    placeholder="Enter a title..."
                                    className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-zinc-700">Description <span className="text-zinc-400 font-normal">(optional)</span></label>
                                <input
                                    value={descInput}
                                    onChange={(e) => setDescInput(e.target.value)}
                                    placeholder="Enter a description..."
                                    className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={!connectUrlInput.trim() || createLink.isPending}
                                className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-sm"
                            >
                                {createLink.isPending ? 'Adding...' : 'Add link'}
                            </Button>
                        </div>
                    )}
                </form>

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {QUICK_ICONS.map(({ icon: Icon, label, color }) => (
                        <button
                            key={label}
                            type="button"
                            className={cn('p-1.5 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer', color)}
                            aria-label={label}
                        >
                            <Icon className="h-4 w-4" />
                        </button>
                    ))}
                    <span className="text-xs text-zinc-400">and more</span>
                </div>
            </div>
        </div>
    );
}
