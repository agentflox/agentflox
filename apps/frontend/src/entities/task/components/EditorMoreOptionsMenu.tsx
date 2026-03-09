'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Plus, Eraser, Copy, ChevronRight, Pin, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/core';

function htmlToPlainMarkdown(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    const walk = (node: Node): string[] => {
        const out: string[] = [];
        if (node.nodeType === Node.TEXT_NODE) {
            const t = node.textContent?.trim();
            if (t) out.push(t);
            return out;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return out;
        const el = node as HTMLElement;
        const tag = el.tagName?.toLowerCase();
        const children = Array.from(node.childNodes).flatMap(walk);
        const text = children.join('');
        if (tag === 'strong' || tag === 'b') return ['**' + text + '**'];
        if (tag === 'em' || tag === 'i') return ['*' + text + '*'];
        if (tag === 'code') return ['`' + text + '`'];
        if (tag === 'a') {
            const href = (el as HTMLAnchorElement).href || '';
            return ['[' + text + '](' + href + ')'];
        }
        if (tag === 'ul' || tag === 'ol') {
            const items = el.querySelectorAll('li');
            return Array.from(items).map((li, i) =>
                (tag === 'ol' ? `${i + 1}. ` : '- ') + li.textContent?.trim()
            );
        }
        if (tag === 'li') return [text];
        if (tag === 'p' || tag === 'div' || tag === 'h1' || tag === 'h2' || tag === 'h3') {
            const prefix = tag === 'h1' ? '# ' : tag === 'h2' ? '## ' : tag === 'h3' ? '### ' : '';
            return [prefix + text];
        }
        if (tag === 'br') return ['\n'];
        return children;
    };
    return walk(div).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

interface EditorMoreOptionsMenuProps {
    editor: Editor | null;
    trigger: React.ReactNode;
    toolbarPinned?: boolean;
    onToolbarPinnedChange?: (pinned: boolean) => void;
}

export function EditorMoreOptionsMenu({
    editor,
    trigger,
    toolbarPinned = false,
    onToolbarPinnedChange,
}: EditorMoreOptionsMenuProps) {
    if (!editor) return null;

    const handleUndo = () => editor.chain().focus().undo().run();
    const handleRedo = () => editor.chain().focus().redo().run();
    const handleClearFormat = () => {
        editor.chain().focus().clearNodes().unsetAllMarks().run();
        toast.success('Formatting cleared');
    };
    const handleCopyMarkdown = async () => {
        const html = editor.getHTML();
        const markdown = htmlToPlainMarkdown(html);
        await navigator.clipboard.writeText(markdown);
        toast.success('Copied as Markdown');
    };
    const handleInsertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };
    const handleInsertCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();
    const handleInsertHorizontalRule = () => editor.chain().focus().setHorizontalRule().run();

    const canUndo = editor.can().undo();
    const canRedo = editor.can().redo();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleUndo} disabled={!canUndo}>
                    <Undo2 className="mr-2 h-4 w-4" />
                    Undo
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+Z</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRedo} disabled={!canRedo}>
                    <Redo2 className="mr-2 h-4 w-4" />
                    Redo
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+Shift+Z</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Plus className="mr-2 h-4 w-4" />
                        Insert
                        <ChevronRight className="ml-auto h-4 w-4" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={handleInsertCodeBlock}>
                            <Copy className="mr-2 h-4 w-4" />
                            Code block
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleInsertHorizontalRule}>
                            <span className="mr-2 inline-block w-4 text-center">—</span>
                            Horizontal rule
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={handleClearFormat}>
                    <Eraser className="mr-2 h-4 w-4" />
                    Clear format
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyMarkdown}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Markdown
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Toolbar position
                </div>
                <DropdownMenuItem
                    onClick={() => onToolbarPinnedChange?.(false)}
                    className={cn(!toolbarPinned && 'bg-accent')}
                >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Default
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onToolbarPinnedChange?.(true)}
                    className={cn(toolbarPinned && 'bg-accent')}
                >
                    <Pin className="mr-2 h-4 w-4" />
                    Pinned
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
