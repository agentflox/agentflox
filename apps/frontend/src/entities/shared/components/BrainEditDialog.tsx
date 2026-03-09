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
import {
    AI_TEXT_OPERATIONS,
    WRITE_WITH_AI_OPERATIONS,
    improveText,
    TONE_OPTIONS,
    CREATIVITY_OPTIONS,
    type AiTextOperationKey,
    type CreativityLevel,
} from '@/services/ai-text.service';
import { Sparkles, Send, AtSign, Loader2, ArrowUp, Check, Plus, Minus, Type, AlignJustify, List, ListChecks } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/core';
import { BrainResultDialog } from './BrainResultDialog';
import { BrainContextModal, type BrainContextEntity } from './BrainContextModal';

const BrainIcon = () => (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white">
        <Sparkles className="h-5 w-5" />
    </div>
);

export type BrainEditMode = 'full' | 'writeWithAI';

interface BrainEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedText: string;
    editor: Editor | null;
    onReplaceSelection: (newText: string) => void;
    onOpenAskAI?: () => void;
    mode?: BrainEditMode;
    spaceId?: string | null;
    workspaceId?: string | null;
    projectId?: string | null;
}

export function BrainEditDialog({
    open,
    onOpenChange,
    selectedText,
    editor,
    onReplaceSelection,
    onOpenAskAI,
    mode = 'full',
    spaceId = null,
    workspaceId = null,
    projectId = null,
}: BrainEditDialogProps) {
    const [customPrompt, setCustomPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultDialogOpen, setResultDialogOpen] = useState(false);
    const [lastResult, setLastResult] = useState('');
    const [lastOperation, setLastOperation] = useState<string>('');
    const [contextModalOpen, setContextModalOpen] = useState(false);
    const [selectedContexts, setSelectedContexts] = useState<BrainContextEntity[]>([]);
    const [tone, setTone] = useState<string>(TONE_OPTIONS[0].value);
    const [creativity, setCreativity] = useState<CreativityLevel>('medium');

    const runOperation = async (operation: AiTextOperationKey | string) => {
        const toProcess = selectedText.trim() || customPrompt;
        if (!toProcess) {
            toast.error('Enter or select some text first.');
            return;
        }
        setLoading(true);
        try {
            const response = await improveText(toProcess, {
                operation,
                ...(selectedContexts.length > 0 && {
                    contextIds: selectedContexts.map((c) => ({ type: c.type, id: c.id })),
                }),
                ...(mode === 'writeWithAI' && {
                    tone: tone === 'default' ? undefined : tone,
                    creativity,
                }),
            });
            if ('error' in response) {
                toast.error(`Insufficient tokens. Remaining: ${response.remaining}`);
                return;
            }
            setLastResult(response.result);
            setLastOperation(operation);
            setResultDialogOpen(true);
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : 'AI request failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitCustom = () => {
        if (!customPrompt.trim()) return;
        runOperation('enhance');
    };

    const handleContextSelect = (entity: BrainContextEntity) => {
        setCustomPrompt((prev) => {
            const tag = `@${entity.name}`;
            if (prev.includes(tag)) return prev;
            return prev ? `${prev} ${tag}` : tag;
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md" showCloseButton>
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <BrainIcon />
                            <div>
                                <DialogTitle className="text-xl">
                                    How can I help your writing?
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    I can refine your writing, fix grammar, and more.
                                </p>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask Brain to edit or write"
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmitCustom()}
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
                                onClick={handleSubmitCustom}
                                disabled={loading || !customPrompt.trim()}
                            >
                                {loading ? (
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
                        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                            {(mode === 'writeWithAI' ? WRITE_WITH_AI_OPERATIONS : AI_TEXT_OPERATIONS).map(({ key, label }) => {
                                const icon =
                                    mode === 'writeWithAI'
                                        ? key === 'writeDescription'
                                            ? <AlignJustify className="h-4 w-4" />
                                            : key === 'createPlan'
                                                ? <List className="h-4 w-4" />
                                                : <ListChecks className="h-4 w-4" />
                                        : key === 'expand'
                                            ? <Plus className="h-4 w-4" />
                                            : key === 'makeShorter'
                                                ? <Minus className="h-4 w-4" />
                                                : key === 'fixSpelling'
                                                    ? <Check className="h-4 w-4" />
                                                    : key === 'simplify'
                                                        ? <Type className="h-4 w-4" />
                                                        : <ArrowUp className="h-4 w-4" />;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100"
                                        disabled={loading}
                                        onClick={() => runOperation(key)}
                                    >
                                        {icon}
                                        <span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {mode === 'writeWithAI' && (
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-200">
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger className="w-[180px] h-9 text-sm">
                                        <SelectValue placeholder="Default Tone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TONE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={creativity} onValueChange={(v) => setCreativity(v as CreativityLevel)}>
                                    <SelectTrigger className="w-[180px] h-9 text-sm">
                                        <SelectValue placeholder="Medium Creativity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CREATIVITY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <BrainResultDialog
                open={resultDialogOpen}
                onOpenChange={setResultDialogOpen}
                result={lastResult}
                editor={editor}
                originalText={selectedText.trim() || customPrompt}
                onReplaceSelection={onReplaceSelection}
                onRegenerate={() => runOperation(lastOperation)}
                onOpenAskAI={onOpenAskAI}
                spaceId={spaceId}
                workspaceId={workspaceId}
                projectId={projectId}
            />
        </>
    );
}
