'use client';

import * as React from 'react';
import {
    Globe,
    LayoutGrid,
    List as ListIcon,
    Plus,
    ExternalLink,
    Link2,
    MoreHorizontal,
    Trash2,
    X,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const LINK_MIME = 'link';

function normalizeUrl(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try { return new URL(withProtocol).toString(); } catch { return null; }
}

function getDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

function getOgImageUrl(url: string): string {
    return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
}

interface TaskLink {
    id: string;
    url: string;
    title: string | null;
    description: string | null;
    createdAt: Date | string;
    creator?: { id: string; name: string | null; image: string | null } | null;
}

interface OtherLinksPanelContentProps {
    taskId: string;
    openAddForm?: boolean;
}

export function OtherLinksPanelContent({ taskId, openAddForm = false }: OtherLinksPanelContentProps) {
    const [layout, setLayout] = React.useState<'tiles' | 'list'>('tiles');
    const [addOpen, setAddOpen] = React.useState(openAddForm);
    const [urlInput, setUrlInput] = React.useState('');
    const [titleInput, setTitleInput] = React.useState('');
    const [descInput, setDescInput] = React.useState('');

    const utils = trpc.useUtils();
    const { data: links = [] } = trpc.task.taskLinks.list.useQuery({ taskId });

    const deleteLink = trpc.task.taskLinks.delete.useMutation({
        onMutate: async ({ id }) => {
            await utils.task.taskLinks.list.cancel({ taskId });
            const prev = utils.task.taskLinks.list.getData({ taskId });
            utils.task.taskLinks.list.setData({ taskId }, (old: any) => old?.filter((a: any) => a.id !== id) ?? []);
            return { prev };
        },
        onError: (err: any, _vars: any, ctx: any) => {
            if (ctx?.prev) utils.task.taskLinks.list.setData({ taskId }, ctx.prev);
            toast.error(err.message || 'Failed to remove link');
        },
        onSettled: () => utils.task.taskLinks.list.invalidate({ taskId }),
    });

    const createLink = trpc.task.taskLinks.create.useMutation({
        onMutate: async (vars: any) => {
            await utils.task.taskLinks.list.cancel({ taskId });
            const prev = utils.task.taskLinks.list.getData({ taskId });
            const temp = {
                id: `temp-${Date.now()}`,
                url: vars.url,
                title: vars.title || null,
                description: vars.description || null,
                createdAt: new Date().toISOString(),
                creator: null,
                taskId: vars.taskId,
            };
            utils.task.taskLinks.list.setData({ taskId }, (old: any) => [...(old ?? []), temp]);
            setUrlInput('');
            setTitleInput('');
            setDescInput('');
            setAddOpen(false);
            return { prev };
        },
        onError: (err: any, _vars: any, ctx: any) => {
            if (ctx?.prev) utils.task.taskLinks.list.setData({ taskId }, ctx.prev);
            toast.error(err.message || 'Failed to add link');
        },
        onSettled: () => {
            utils.task.taskLinks.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
        },
        onSuccess: () => toast.success('Link added'),
    });

    const handleAdd = (e?: React.FormEvent) => {
        e?.preventDefault();
        const normalized = normalizeUrl(urlInput);
        if (!normalized) { toast.error('Please enter a valid URL'); return; }
        createLink.mutate({
            taskId,
            url: normalized,
            title: titleInput.trim() || undefined,
            description: descInput.trim() || undefined,
        });
    };

    const isValidUrl = /^https?:\/\//i.test(urlInput.trim());

    return (
        <div className="flex flex-col h-full min-h-0 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-100 shrink-0">
                <span className="text-base font-semibold text-zinc-900">Other links</span>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                {layout === 'tiles' ? <LayoutGrid className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <div className="px-2 py-1.5 text-xs text-zinc-500 font-medium">View links as</div>
                            <DropdownMenuItem
                                onClick={() => setLayout('list')}
                                className="flex items-center justify-between cursor-pointer"
                            >
                                <span className="flex items-center gap-2"><ListIcon className="h-4 w-4" /> List</span>
                                {layout === 'list' && <Check className="h-4 w-4 text-indigo-500" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setLayout('tiles')}
                                className="flex items-center justify-between cursor-pointer"
                            >
                                <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Tiles</span>
                                {layout === 'tiles' && <Check className="h-4 w-4 text-indigo-500" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Popover open={addOpen} onOpenChange={setAddOpen}>
                        <PopoverTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 p-4" sideOffset={6}>
                            <form onSubmit={handleAdd} className="space-y-3">
                                <p className="text-sm font-semibold text-zinc-900">Add a link</p>
                                <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 shadow-sm transition-all">
                                    <Globe className="h-4 w-4 text-indigo-500 shrink-0" />
                                    <input
                                        autoFocus
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="http://..."
                                        className="flex-1 min-w-0 bg-transparent text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none"
                                    />
                                    {urlInput && (
                                        <button type="button" onClick={() => setUrlInput('')} className="text-zinc-400 hover:text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-full p-0.5 transition-colors cursor-pointer shrink-0">
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                                {isValidUrl && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-1">
                                            <label className="text-[13px] font-medium text-zinc-700">Title</label>
                                            <input
                                                value={titleInput}
                                                onChange={(e) => setTitleInput(e.target.value)}
                                                placeholder="Enter a title..."
                                                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
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
                                            disabled={!isValidUrl || createLink.isPending}
                                            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-sm"
                                        >
                                            {createLink.isPending ? 'Adding...' : 'Add link'}
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-auto p-4">
                {links.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-700">No links yet</p>
                            <p className="text-xs text-zinc-400 mt-0.5">Click + to add your first link</p>
                        </div>
                    </div>
                ) : layout === 'tiles' ? (
                    <div className="grid gap-3">
                        {links.map((link) => (
                            <TileCard key={link.id} link={link as TaskLink} onDelete={(id) => deleteLink.mutate({ id })} />
                        ))}
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {links.map((link) => (
                            <ListRow key={link.id} link={link as TaskLink} onDelete={(id) => deleteLink.mutate({ id })} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function TileCard({ link, onDelete }: { link: TaskLink; onDelete: (id: string) => void }) {
    const [imgError, setImgError] = React.useState(false);

    return (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all relative group">
            {!imgError ? (
                <div className="w-full h-36 bg-zinc-100 overflow-hidden">
                    <img
                        src={getOgImageUrl(link.url)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                </div>
            ) : (
                <div className="w-full h-24 bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
                    <Globe className="h-8 w-8 text-zinc-300" />
                </div>
            )}

            <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-zinc-200 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(link.url)}>
                    <Link2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                    <a href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <a href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" /> Open</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(link.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="p-3">
                <p className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug">
                    {link.title || getDomain(link.url)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                    <img
                        src={`https://www.google.com/s2/favicons?sz=16&domain=${getDomain(link.url)}`}
                        alt=""
                        className="h-3.5 w-3.5 rounded-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <p className="text-xs text-zinc-400 truncate">{getDomain(link.url)}</p>
                </div>
            </div>
        </div>
    );
}

function ListRow({ link, onDelete }: { link: TaskLink; onDelete: (id: string) => void }) {
    return (
        <li className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-zinc-50 group">
            <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                    src={`https://www.google.com/s2/favicons?sz=32&domain=${getDomain(link.url)}`}
                    alt=""
                    className="h-5 w-5"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{link.title || getDomain(link.url)}</p>
                <p className="text-xs text-zinc-400 truncate">{getDomain(link.url)}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(link.url)}>
                    <Link2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                    <a href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <a href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" /> Open</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(link.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </li>
    );
}
