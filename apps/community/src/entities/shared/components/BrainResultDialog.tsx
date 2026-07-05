'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, RefreshCw, ThumbsUp, ThumbsDown, Send, AtSign, Check, ArrowDownLeft, Copy, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/core';
import { improveText } from '@/services/ai-text.service';
import { BrainContextModal, type BrainContextEntity } from './BrainContextModal';

const BrainIcon = () => (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white">
        <Sparkles className="h-5 w-5" />
    </div>
);

interface BrainResultDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    result: string;
    editor: Editor | null;
    originalText: string;
    onReplaceSelection: (newText: string) => void;
    onRegenerate: () => void;
    onOpenAskAI?: () => void;
    /** When provided, Back button calls this (e.g. to reopen Write with AI modal) then closes */
    onBack?: () => void;
    spaceId?: string | null;
    workspaceId?: string | null;
    projectId?: string | null;
}

export function BrainResultDialog({
    open,
    onOpenChange,
    result,
    editor,
    originalText,
    onReplaceSelection,
    onRegenerate,
    onOpenAskAI,
    onBack,
    spaceId = null,
    workspaceId = null,
    projectId = null,
}: BrainResultDialogProps) {
    const [followUp, setFollowUp] = useState('');
    const [focusedAction, setFocusedAction] = useState<string | null>(null);
    const [sendLoading, setSendLoading] = useState(false);
    const [contextModalOpen, setContextModalOpen] = useState(false);
    const [selectedContexts, setSelectedContexts] = useState<BrainContextEntity[]>([]);

    const handleSendFollowUp = async () => {
        const message = followUp.trim();
        if (!message) return;
        setSendLoading(true);
        try {
            const response = await improveText(result, {
                operation: 'custom',
                userInstruction: message,
                contextIds: selectedContexts.length > 0 ? selectedContexts.map((c) => ({ type: c.type, id: c.id })) : undefined,
            });
            if ('error' in response) {
                toast.error(`Insufficient tokens. Remaining: ${response.remaining}`);
                return;
            }
            onReplaceSelection(response.result);
            setFollowUp('');
            setSelectedContexts([]);
            onOpenChange(false);
            toast.success('Updated with AI');
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : 'AI request failed');
        } finally {
            setSendLoading(false);
        }
    };

    const handleContextSelect = (entity: BrainContextEntity) => {
        setFollowUp((prev) => {
            const tag = `@${entity.name}`;
            if (prev.includes(tag)) return prev;
            return prev ? `${prev} ${tag}` : tag;
        });
    };

    const handleReplace = () => {
        onReplaceSelection(result);
        onOpenChange(false);
        toast.success('Replaced with AI answer');
    };

    const handleInsertBelow = () => {
        if (!editor) return;
        editor.chain().focus().insertContent('<p>' + result.replace(/\n/g, '</p><p>') + '</p>').run();
        onOpenChange(false);
        toast.success('Inserted below');
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(result);
        toast.success('Copied to clipboard');
    };

    const handleSaveAndContinue = () => {
        onOpenChange(false);
        onOpenAskAI?.();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg" showCloseButton>
                <DialogHeader className="border-b border-zinc-200 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BrainIcon />
                            <DialogTitle className="text-lg">Brain</DialogTitle>
                        </div>
                    </div>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="rounded-md max-h-[300px] overflow-y-auto bg-zinc-50 p-3 text-sm text-zinc-800 whitespace-pre-wrap min-h-[60px]">
                        {result || 'No result.'}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onRegenerate}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ThumbsDown className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ask Brain to edit or write (e.g. make it shorter, add @List1 for context)"
                            value={followUp}
                            onChange={(e) => setFollowUp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendFollowUp()}
                            className="flex-1"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setContextModalOpen(true)}
                            title="Add context (@)"
                        >
                            <AtSign className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            className="shrink-0"
                            onClick={handleSendFollowUp}
                            disabled={sendLoading || !followUp.trim()}
                            title="Send"
                        >
                            {sendLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    {selectedContexts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-xs text-zinc-500">
                            Context: {selectedContexts.map((c) => `@${c.name}`).join(', ')}
                        </div>
                    )}
                    <BrainContextModal
                        spaceId={spaceId}
                        workspaceId={workspaceId}
                        projectId={projectId}
                        open={contextModalOpen}
                        onOpenChange={setContextModalOpen}
                        selectedContexts={selectedContexts}
                        onContextsChange={setSelectedContexts}
                        onSelect={handleContextSelect}
                    />
                    <div className="space-y-0.5 border-t border-zinc-200 pt-3">
                        <button
                            type="button"
                            className={cn(
                                'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100',
                                focusedAction === 'replace' && 'bg-zinc-100'
                            )}
                            onClick={handleReplace}
                            onFocus={() => setFocusedAction('replace')}
                            onBlur={() => setFocusedAction(null)}
                        >
                            <Check className="h-4 w-4 text-zinc-500" />
                            <span>Replace with this answer</span>
                        </button>
                        <button
                            type="button"
                            className={cn(
                                'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100',
                                focusedAction === 'insert' && 'bg-zinc-100'
                            )}
                            onClick={handleInsertBelow}
                            onFocus={() => setFocusedAction('insert')}
                            onBlur={() => setFocusedAction(null)}
                        >
                            <ArrowDownLeft className="h-4 w-4 text-zinc-500" />
                            <span>Insert below</span>
                        </button>
                        <button
                            type="button"
                            className={cn(
                                'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100',
                                focusedAction === 'copy' && 'bg-zinc-100'
                            )}
                            onClick={handleCopy}
                            onFocus={() => setFocusedAction('copy')}
                            onBlur={() => setFocusedAction(null)}
                        >
                            <Copy className="h-4 w-4 text-zinc-500" />
                            <span>Copy</span>
                        </button>
                        {onOpenAskAI && (
                            <button
                                type="button"
                                className={cn(
                                    'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100',
                                    focusedAction === 'askai' && 'bg-zinc-100'
                                )}
                                onClick={handleSaveAndContinue}
                                onFocus={() => setFocusedAction('askai')}
                                onBlur={() => setFocusedAction(null)}
                            >
                                <Settings className="h-4 w-4 text-zinc-500" />
                                <span>Save & continue in Ask AI</span>
                            </button>
                        )}
                        <button
                            type="button"
                            className={cn(
                                'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 text-zinc-500',
                                focusedAction === 'back' && 'bg-zinc-100'
                            )}
                            onClick={() => {
                                onBack?.();
                                onOpenChange(false);
                            }}
                            onFocus={() => setFocusedAction('back')}
                            onBlur={() => setFocusedAction(null)}
                        >
                            <span className="text-zinc-400">←</span>
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
