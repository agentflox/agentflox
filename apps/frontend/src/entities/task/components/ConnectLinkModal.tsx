'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const LINK_MIME_TYPE = 'link';

interface ConnectLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    initialUrl?: string;
    onSuccess?: () => void;
}

export function ConnectLinkModal({
    open,
    onOpenChange,
    taskId,
    initialUrl = '',
    onSuccess,
}: ConnectLinkModalProps) {
    const [url, setUrl] = React.useState(initialUrl);
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');

    const utils = trpc.useUtils();

    React.useEffect(() => {
        if (open) {
            setUrl(initialUrl);
            setTitle('');
            setDescription('');
        }
    }, [open, initialUrl]);

    const createAttachment = trpc.task.attachments.create.useMutation({
        onSuccess: () => {
            utils.task.attachments.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            onOpenChange(false);
            toast.success('Link added');
            onSuccess?.();
        },
        onError: (e) => toast.error(e.message || 'Failed to add link'),
    });

    const handleAddLink = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            toast.error('Please enter a URL');
            return;
        }
        const trimmedTitle = title.trim() || trimmedUrl;
        createAttachment.mutate({
            taskId,
            url: trimmedUrl,
            filename: trimmedTitle,
            size: 0,
            mimeType: LINK_MIME_TYPE,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <DialogTitle className="sr-only">Connect a URL</DialogTitle>
                <form onSubmit={handleAddLink} className="p-5 space-y-4">
                    <h2 className="text-base font-semibold text-zinc-900">Connect a URL</h2>

                    {/* URL input */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                            <Input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Paste or enter URL..."
                                className="pl-9 pr-9 h-10 rounded-md border-zinc-200 bg-zinc-50/50"
                                type="url"
                            />
                            {url && (
                                <button
                                    type="button"
                                    onClick={() => setUrl('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700">Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter title..."
                            className="h-10 rounded-md border-zinc-200 bg-zinc-50/50"
                        />
                    </div>

                    {/* Description (Optional) */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700">
                            Description <span className="text-zinc-400 font-normal">(Optional)</span>
                        </Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter description..."
                            className="min-h-[72px] rounded-md border-zinc-200 bg-zinc-50/50 resize-none"
                            rows={3}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
                        disabled={createAttachment.isPending || !url.trim()}
                    >
                        Add Link
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export const LINK_ATTACHMENT_MIME_TYPE = LINK_MIME_TYPE;
