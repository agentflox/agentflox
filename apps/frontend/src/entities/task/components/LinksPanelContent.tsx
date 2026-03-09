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
    Youtube,
    Github,
    Figma,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConnectLinkModal, LINK_ATTACHMENT_MIME_TYPE } from './ConnectLinkModal';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const QUICK_ICONS = [
    { icon: FileText, label: 'Document', color: 'text-blue-600' },
    { icon: Youtube, label: 'YouTube', color: 'text-red-600' },
    { icon: Github, label: 'GitHub', color: 'text-zinc-800' },
    { icon: Figma, label: 'Figma', color: 'text-purple-600' },
];

interface UrlLink {
    id: string;
    url: string;
    filename: string | null;
    mimeType: string;
    createdAt: Date | string;
    uploader?: { id: string; name: string | null; image: string | null } | null;
}

interface LinksPanelContentProps {
    taskId: string;
    /** URL attachments (mimeType === link) */
    items?: UrlLink[];
}

export function LinksPanelContent({ taskId, items = [] }: LinksPanelContentProps) {
    const [layout, setLayout] = React.useState<'card' | 'list'>('card');
    const [connectUrlInput, setConnectUrlInput] = React.useState('');
    const [addLinkModalOpen, setAddLinkModalOpen] = React.useState(false);

    const utils = trpc.useUtils();
    const { data: attachments = [] } = trpc.task.attachments.list.useQuery({ taskId });
    const urlLinks = React.useMemo(
        () => attachments.filter((a: any) => a.mimeType === LINK_ATTACHMENT_MIME_TYPE) as UrlLink[],
        [attachments]
    );
    const displayItems = items.length > 0 ? items : urlLinks;

    const deleteAttachment = trpc.task.attachments.delete.useMutation({
        onSuccess: () => utils.task.attachments.list.invalidate({ taskId }),
    });

    const handleUrlSubmit = React.useCallback(() => {
        const normalized = validateAndNormalizeUrl(connectUrlInput);
        if (normalized) {
            setConnectUrlInput(normalized);
            setAddLinkModalOpen(true);
        }
    }, [connectUrlInput]);

    return (
        <div className="flex flex-col h-full min-h-0">
            <ConnectLinkModal
                key={addLinkModalOpen ? (connectUrlInput || 'new') : 'closed'}
                open={addLinkModalOpen}
                onOpenChange={setAddLinkModalOpen}
                taskId={taskId}
                initialUrl={connectUrlInput.trim()}
                onSuccess={() => setConnectUrlInput('')}
            />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 shrink-0 mb-3 px-4 pt-4">
                <h3 className="text-base font-semibold text-zinc-900">Links</h3>
                <div className="flex items-center gap-0.5">
                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn('h-8 w-8', layout === 'card' && 'bg-zinc-200 text-zinc-900')}
                        onClick={() => setLayout('card')}
                        aria-label="Card layout"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn('h-8 w-8', layout === 'list' && 'bg-zinc-200 text-zinc-900')}
                        onClick={() => setLayout('list')}
                        aria-label="List layout"
                    >
                        <ListIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Connect a URL */}
            <div className="px-4 mb-4">
                <h4 className="text-sm font-medium text-zinc-700 mb-2">Connect a URL</h4>
                <div
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 focus-within:ring-2 focus-within:ring-zinc-200 focus-within:border-zinc-300"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUrlSubmit();
                        }
                    }}
                >
                    <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                    <input
                        value={connectUrlInput}
                        onChange={(e) => setConnectUrlInput(e.target.value)}
                        placeholder="Paste any link..."
                        className="flex-1 min-w-0 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none"
                    />
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {QUICK_ICONS.map(({ icon: Icon, label, color }) => (
                        <button
                            key={label}
                            type="button"
                            className={cn('p-1.5 rounded-md hover:bg-zinc-100 transition-colors', color)}
                            aria-label={label}
                        >
                            <Icon className="h-4 w-4" />
                        </button>
                    ))}
                    <span className="text-xs text-zinc-400">and more</span>
                </div>
            </div>

            <Separator className="mx-4 mb-4" />

            {/* URL list */}
            <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
                {displayItems.length === 0 ? (
                    <p className="text-sm text-zinc-400 py-4">No links yet. Paste a URL above to add one.</p>
                ) : layout === 'card' ? (
                    <div className="grid gap-3">
                        {displayItems.map((link: UrlLink) => (
                            <div
                                key={link.id}
                                className="rounded-lg border border-zinc-200 bg-white p-3 hover:border-zinc-300 transition-colors relative group"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <a href={link.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open
                                            </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => deleteAttachment.mutate({ id: link.id })} className="text-red-600">
                                            Remove
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <h4 className="text-sm font-medium text-zinc-900 pr-8 line-clamp-2">
                                    {link.filename || link.url}
                                </h4>
                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 break-all">{link.url}</p>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                                    <span className="text-xs text-zinc-400">
                                        {format(new Date(link.createdAt), "MMM d 'at' h:mm a")}
                                    </span>
                                    {link.uploader && (
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={link.uploader.image ?? undefined} />
                                            <AvatarFallback className="text-[9px] bg-zinc-200 text-zinc-600">
                                                {link.uploader.name?.slice(0, 2).toUpperCase() ?? '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {displayItems.map((link: UrlLink) => (
                            <li
                                key={link.id}
                                className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-zinc-50 group"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 truncate">
                                        {link.filename || link.url}
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                        {format(new Date(link.createdAt), "MMM d 'at' h:mm a")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                        onClick={() => navigator.clipboard.writeText(link.url)}
                                        aria-label="Copy link"
                                    >
                                        <Link2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                        asChild
                                    >
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label="Open">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => deleteAttachment.mutate({ id: link.id })} className="text-red-600">
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                {link.uploader && (
                                    <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarImage src={link.uploader.image ?? undefined} />
                                        <AvatarFallback className="text-[9px] bg-zinc-200 text-zinc-600">
                                            {link.uploader.name?.slice(0, 2).toUpperCase() ?? '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
