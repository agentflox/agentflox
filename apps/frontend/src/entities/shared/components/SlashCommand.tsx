import { type Editor, Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import {
    Sparkles,
    List,
    ListOrdered,
    CheckSquare,
    Heading1,
    Heading2,
    Heading3,
    Type,
    Minus,
    Quote,
    ImageIcon,
    Columns2,
    Table,
    LayoutTemplate,
    Palette,
    Highlighter,
    Link as LinkIcon,
    Italic,
    Bold as BoldIcon,
    Strikethrough as StrikethroughIcon,
    Code as CodeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React, { type ReactNode, useState, useEffect, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { User, FileText, CheckSquare2, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type CommandItemGroup =
    | 'ai'
    | 'text'
    | 'inline'
    | 'views'
    | 'embeds'
    | 'formatting'
    | 'colors'
    | 'highlights';

interface CommandItem {
    title: string;
    subtitle?: string;
    group: CommandItemGroup;
    icon: ReactNode;
    shortcut?: string;
    command: (opts: { editor: Editor; range: { from: number; to: number } }) => void;
}

// Simple color palettes roughly mirroring ClickUp
const TEXT_COLOR_ITEMS = [
    { title: 'Default', color: '#18181b' },
    { title: 'Red', color: '#ef4444' },
    { title: 'Orange', color: '#f97316' },
    { title: 'Yellow', color: '#eab308' },
    { title: 'Blue', color: '#3b82f6' },
    { title: 'Purple', color: '#a855f7' },
    { title: 'Pink', color: '#ec4899' },
    { title: 'Green', color: '#22c55e' },
    { title: 'Grey', color: '#6b7280' },
] as const;

const HIGHLIGHT_COLOR_ITEMS = [
    { title: 'Remove highlight', color: '' },
    { title: 'Red highlight', color: '#fee2e2' },
    { title: 'Orange highlight', color: '#ffedd5' },
    { title: 'Yellow highlight', color: '#fef9c3' },
    { title: 'Blue highlight', color: '#dbeafe' },
    { title: 'Purple highlight', color: '#f3e8ff' },
    { title: 'Pink highlight', color: '#fce7f3' },
    { title: 'Green highlight', color: '#dcfce7' },
    { title: 'Grey highlight', color: '#e5e7eb' },
] as const;

function openUrlPrompt(options: {
    editor: Editor;
    label: string;
    placeholder?: string;
    onSubmit: (url: string) => void;
    range: { from: number; to: number };
}) {
    const { editor, placeholder, onSubmit, range } = options;
    const urlPrompt = (editor as any).storage?.urlPrompt;
    if (urlPrompt) {
        urlPrompt.open(placeholder ?? 'Paste a link then press Enter', onSubmit, range);
    }
}

function openMentionModal(options: {
    editor: Editor;
    range: { from: number; to: number };
    initialTab: 'tasks' | 'docs' | 'people';
    spaceId?: string | null;
    workspaceId?: string | null;
    projectId?: string | null;
}) {
    const { editor, range, initialTab } = options;
    const mention = (editor as any).storage?.mention;
    if (mention) {
        mention.open(initialTab, range);
    }
}

function runSlashAI(
    editor: Editor,
    range: { from: number; to: number },
    kind: 'writeWithAI' | 'direct',
    operation?: string
) {
    const { from: selFrom, to: selTo } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selFrom, selTo, ' ').trim();
    editor.chain().focus().deleteRange(range).run();
    const brain = (editor as any).storage?.brain;
    if (kind === 'writeWithAI') {
        brain?.openWriteWithAI?.(selectedText);
    } else if (operation) {
        brain?.runDirectAI?.(operation, selectedText);
    }
}

const COMMAND_ITEMS: CommandItem[] = [
    // CLICKUP AI
    {
        title: 'Write with AI',
        subtitle: 'Write with AI',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-purple-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'writeWithAI'),
    },
    {
        title: 'Simplify writing',
        subtitle: 'Simplify writing',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'simplify'),
    },
    {
        title: 'Summarize',
        subtitle: 'Summarize',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'summarize'),
    },
    {
        title: 'Fix spelling and grammar',
        subtitle: 'Fix spelling and grammar',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'fixSpelling'),
    },
    {
        title: 'Continue writing',
        subtitle: 'Continue writing',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'expand'),
    },
    {
        title: 'Make shorter',
        subtitle: 'Make shorter',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'makeShorter'),
    },
    {
        title: 'Explain',
        subtitle: 'Explain',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'explain'),
    },
    {
        title: 'Make longer',
        subtitle: 'Make longer',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'makeLonger'),
    },
    {
        title: 'Improve writing',
        subtitle: 'Improve writing',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'enhance'),
    },
    {
        title: 'Translate',
        subtitle: 'Translate',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'translate'),
    },
    {
        title: 'Generate action items',
        subtitle: 'Generate action items',
        group: 'ai',
        icon: <Sparkles className="h-4 w-4 text-sky-500" />,
        command: ({ editor, range }) => runSlashAI(editor, range, 'direct', 'actionItems'),
    },

    // TEXT
    {
        title: 'Normal text',
        group: 'text',
        icon: <Type className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setParagraph().run();
        },
    },
    {
        title: 'Heading 1',
        group: 'text',
        icon: <Heading1 className="h-4 w-4" />,
        shortcut: 'Alt+Ctrl+1',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
        },
    },
    {
        title: 'Heading 2',
        group: 'text',
        icon: <Heading2 className="h-4 w-4" />,
        shortcut: 'Alt+Ctrl+2',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
        },
    },
    {
        title: 'Heading 3',
        group: 'text',
        icon: <Heading3 className="h-4 w-4" />,
        shortcut: 'Alt+Ctrl+3',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
        },
    },
    {
        title: 'Heading 4',
        group: 'text',
        icon: <Heading3 className="h-4 w-4" />,
        shortcut: 'Alt+Ctrl+4',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 4 }).run();
        },
    },
    {
        title: 'Bulleted list',
        group: 'text',
        icon: <List className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Numbered list',
        group: 'text',
        icon: <ListOrdered className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: 'Checklist',
        group: 'text',
        icon: <CheckSquare className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: 'Block quote',
        group: 'text',
        icon: <Quote className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setBlockquote().run();
        },
    },
    {
        title: 'Code block',
        group: 'text',
        icon: <CodeIcon className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setCodeBlock().run();
        },
    },
    {
        title: 'Pull quote',
        group: 'text',
        icon: <Quote className="h-4 w-4" />,
        command: ({ editor, range }) => {
            // Approximate pull quote as a centered blockquote
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setBlockquote()
                .setTextAlign('center')
                .run();
        },
    },
    {
        title: 'Divider',
        group: 'text',
        icon: <Minus className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },

    // INLINE (mentions etc. as structured placeholders)
    {
        title: 'Mention a Person',
        subtitle: 'Tag a teammate',
        group: 'inline',
        icon: <Type className="h-4 w-4" />,
        command: ({ editor, range }) => {
            const context = (editor as any).storage?.mentionContext || {};
            openMentionModal({
                editor,
                range,
                initialTab: 'people',
                spaceId: context.spaceId,
                workspaceId: context.workspaceId,
                projectId: context.projectId,
            });
        },
    },
    {
        title: 'Mention a Task',
        group: 'inline',
        icon: <CheckSquare className="h-4 w-4" />,
        command: ({ editor, range }) => {
            const context = (editor as any).storage?.mentionContext || {};
            openMentionModal({
                editor,
                range,
                initialTab: 'tasks',
                spaceId: context.spaceId,
                workspaceId: context.workspaceId,
                projectId: context.projectId,
            });
        },
    },
    {
        title: 'Mention a Page',
        group: 'inline',
        icon: <Type className="h-4 w-4" />,
        command: ({ editor, range }) => {
            const context = (editor as any).storage?.mentionContext || {};
            openMentionModal({
                editor,
                range,
                initialTab: 'docs',
                spaceId: context.spaceId,
                workspaceId: context.workspaceId,
                projectId: context.projectId,
            });
        },
    },

    // VIEWS (insert links / placeholders)
    {
        title: 'Table',
        group: 'views',
        icon: <Table className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
    },
    // EMBEDS (generic embed placeholders)
    {
        title: 'Image',
        subtitle: 'Insert image from URL',
        group: 'embeds',
        icon: <ImageIcon className="h-4 w-4" />,
        command: ({ editor, range }) => {
            openUrlPrompt({
                editor,
                label: 'Paste a link then press Enter',
                placeholder: 'https://example.com/image.jpg',
                range,
                onSubmit: url => {
                    editor.chain().focus().setImage({ src: url }).run();
                },
            });
        },
    },
    {
        title: 'YouTube',
        subtitle: 'Embed a YouTube video',
        group: 'embeds',
        icon: <ImageIcon className="h-4 w-4" />,
        command: ({ editor, range }) => {
            openUrlPrompt({
                editor,
                label: 'Paste a link then press Enter',
                placeholder: 'https://www.youtube.com/watch?v=…',
                range,
                onSubmit: url => {
                    editor.chain().focus().setYoutubeVideo({ src: url }).run();
                },
            });
        },
    },

    // FORMATTING
    {
        title: 'Clear format',
        group: 'formatting',
        icon: <Minus className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).unsetAllMarks().clearNodes().run();
        },
    },
    {
        title: 'Bold',
        group: 'formatting',
        icon: <BoldIcon className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBold().run();
        },
    },
    {
        title: 'Italic',
        group: 'formatting',
        icon: <Italic className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleItalic().run();
        },
    },
    {
        title: 'Strikethrough',
        group: 'formatting',
        icon: <StrikethroughIcon className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleStrike().run();
        },
    },
    {
        title: 'Inline code',
        group: 'formatting',
        icon: <CodeIcon className="h-4 w-4" />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCode().run();
        },
    },
    {
        title: 'Website link',
        group: 'formatting',
        icon: <LinkIcon className="h-4 w-4" />,
        command: ({ editor, range }) => {
            openUrlPrompt({
                editor,
                label: 'Paste a link then press Enter',
                placeholder: 'https://example.com',
                range,
                onSubmit: url => {
                    editor
                        .chain()
                        .focus()
                        .setLink({ href: url })
                        .insertContent(url)
                        .run();
                },
            });
        },
    },

    // TEXT COLORS
    ...TEXT_COLOR_ITEMS.map<CommandItem>(item => ({
        title: item.title,
        group: 'colors',
        icon: (
            <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-zinc-200 text-[10px] font-semibold"
                style={{ color: item.color || '#18181b' }}
            >
                A
            </span>
        ),
        command: ({ editor, range }) => {
            const chain = editor.chain().focus().deleteRange(range);
            if (item.title === 'Default') {
                chain.unsetColor().run();
            } else {
                chain.setColor(item.color).run();
            }
        },
    })),

    // HIGHLIGHTS
    ...HIGHLIGHT_COLOR_ITEMS.map<CommandItem>(item => ({
        title: item.title,
        group: 'highlights',
        icon: (
            <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-zinc-200 text-[10px] font-semibold"
                style={{ backgroundColor: item.color || 'transparent' }}
            >
                A
            </span>
        ),
        command: ({ editor, range }) => {
            const chain = editor.chain().focus().deleteRange(range);
            if (!item.color) {
                chain.unsetHighlight().run();
            } else {
                chain.toggleHighlight({ color: item.color }).run();
            }
        },
    })),
];

interface SlashCommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
    selectedIndex: number;
}

const GROUP_LABELS: Record<CommandItemGroup, string> = {
    ai: 'Agentflox AI',
    text: 'Text',
    inline: 'Inline',
    views: 'Views',
    embeds: 'Embeds',
    formatting: 'Formatting',
    colors: 'Text colors',
    highlights: 'Highlights',
};

const SlashCommandList: React.FC<SlashCommandListProps> = ({ items, command, selectedIndex }) => {
    const grouped = items.reduce<Record<CommandItemGroup, CommandItem[]>>(
        (acc, item) => {
            acc[item.group].push(item);
            return acc;
        },
        {
            ai: [],
            text: [],
            inline: [],
            views: [],
            embeds: [],
            formatting: [],
            colors: [],
            highlights: [],
        },
    );

    const flat: CommandItem[] = [
        ...grouped.ai,
        ...grouped.text,
        ...grouped.inline,
        ...grouped.views,
        ...grouped.embeds,
        ...grouped.formatting,
        ...grouped.colors,
        ...grouped.highlights,
    ];

    return (
        <div className="min-w-[280px] max-w-[360px] max-h-[340px] bg-white/95 backdrop-blur-md border border-zinc-200/70 rounded-xl shadow-[0_18px_60px_rgba(15,23,42,0.18)] overflow-hidden">
            <div className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
                Slash commands
            </div>
            <div className="custom-scrollbar max-h-[300px] overflow-y-auto overflow-x-hidden py-1 pr-1">
                {(Object.keys(GROUP_LABELS) as CommandItemGroup[]).map(group => {
                    const groupItems = grouped[group];
                    if (!groupItems.length) return null;

                    return (
                        <div key={group} className="px-1 py-1">
                            <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-400">
                                {GROUP_LABELS[group]}
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                {groupItems.map(item => {
                                    const index = flat.indexOf(item);
                                    const isSelected = index === selectedIndex;
                                    return (
                                        <button
                                            key={item.title}
                                            type="button"
                                            onClick={() => command(item)}
                                            className={cn(
                                                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors truncate',
                                                isSelected
                                                    ? 'bg-zinc-100 text-zinc-900'
                                                    : 'text-zinc-600 hover:bg-zinc-50',
                                            )}
                                        >
                                            <div className="flex min-h-7 min-w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                                                {item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-medium truncate">{item.title}</span>
                                                    {item.shortcut && (
                                                        <span className="text-[10px] text-zinc-400">
                                                            {item.shortcut}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.subtitle && (
                                                    <div className="text-[11px] text-zinc-400 truncate">
                                                        {item.subtitle}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-100 text-[10px] text-zinc-400">
                <span>Navigate with ↑ ↓ • Enter to select</span>
                <span className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-[9px] text-zinc-400 hover:text-zinc-600"
                        aria-label="Trigger AI"
                    >
                        <Sparkles className="h-3 w-3" />
                    </Button>
                </span>
            </div>
        </div>
    );
};

export const SlashCommand = Extension.create({
    name: 'slash-command',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                startOfLine: true,
                allowSpaces: true,
                command: ({
                    editor,
                    range,
                    props,
                }: {
                    editor: Editor;
                    range: { from: number; to: number };
                    props: CommandItem;
                }) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        const extension = this;
        const suggestion = this.options.suggestion;

        return [
            Suggestion({
                char: suggestion.char,
                startOfLine: suggestion.startOfLine,
                allowSpaces: suggestion.allowSpaces,
                editor: this.editor,
                items: ({ query }) => {
                    const q = query.toLowerCase();
                    return COMMAND_ITEMS.filter(item =>
                        item.title.toLowerCase().includes(q),
                    );
                },
                render: () => {
                    let component: ReactRenderer<SlashCommandListProps> | null = null;
                    let popup: TippyInstance | null = null;
                
                    let destroyed = false;
                    const destroy = () => {
                        if (destroyed) return;
                        destroyed = true;

                        const popupInstance = popup;
                        const componentInstance = component;
                        popup = null;
                        component = null;

                        try {
                            if (popupInstance) {
                                (popupInstance as any).setProps?.({ onHide: undefined });
                                popupInstance.destroy();
                            }
                        } catch (_) {}
                        try {
                            componentInstance?.destroy();
                        } catch (_) {}
                    };

                    // Expose close method in editor storage
                    // Note: storage is read-only, so we can only add properties to it, not reassign it
                    if (!(extension.editor as any).storage.slashCommand) {
                        (extension.editor as any).storage.slashCommand = {
                            close: () => {
                                destroy();
                            },
                        };
                    } else {
                        // Update the close method if it already exists
                        (extension.editor as any).storage.slashCommand.close = () => {
                            destroy();
                        };
                    }
                
                    return {
                        onStart: (props: any) => {
                            component = new ReactRenderer(SlashCommandList, {
                                editor: extension.editor,
                                props: {
                                    items: props.items as CommandItem[],
                                    command: (item: CommandItem) => {
                                        suggestion.command({
                                            editor: extension.editor,
                                            range: props.range,
                                            props: item,
                                        });
                                        // Close the slash command after executing any command
                                        destroy();
                                    },
                                    selectedIndex: props.selectedIndex,
                                },
                            });
                
                            popup = tippy('body', {
                                getReferenceClientRect: props.clientRect as any,
                                appendTo: () => document.body,
                                content: (component.element as unknown) as HTMLElement,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                                maxWidth: 'none',
                                // Do NOT set onHide - it causes infinite recursion when destroy() runs.
                                // Cleanup is handled only by onExit (suggestion plugin) and Escape key.
                            })[0];
                        },
                
                        onUpdate(props: any) {
                            component?.updateProps({
                                items: props.items as CommandItem[],
                                command: (item: CommandItem) => {
                                    suggestion.command({
                                        editor: extension.editor,
                                        range: props.range,
                                        props: item,
                                    });
                                    // Close the slash command after executing any command
                                    destroy();
                                },
                                selectedIndex: props.selectedIndex,
                            });
                
                            popup?.setProps({
                                getReferenceClientRect: props.clientRect as any,
                            });
                        },
                
                        onKeyDown(props: any) {
                            if (props.event.key === 'Escape') {
                                destroy();
                                return true;
                            }
                
                            const items = (props.items as CommandItem[] | undefined) ?? [];
                            if (!items.length) {
                                return false;
                            }
                
                            if (props.event.key === 'ArrowDown') {
                                const nextIndex = (props.selectedIndex + 1) % items.length;
                                component?.updateProps({
                                    items,
                                    selectedIndex: nextIndex,
                                    command: (item: CommandItem) => {
                                        suggestion.command({
                                            editor: extension.editor,
                                            range: props.range,
                                            props: item,
                                        });
                                    },
                                });
                                return true;
                            }
                
                            if (props.event.key === 'ArrowUp') {
                                const prevIndex =
                                    (props.selectedIndex + items.length - 1) % items.length;
                                component?.updateProps({
                                    items,
                                    selectedIndex: prevIndex,
                                    command: (item: CommandItem) => {
                                        suggestion.command({
                                            editor: extension.editor,
                                            range: props.range,
                                            props: item,
                                        });
                                    },
                                });
                                return true;
                            }
                
                            if (props.event.key === 'Enter') {
                                const item = items[props.selectedIndex];
                                if (item) {
                                    suggestion.command({
                                        editor: extension.editor,
                                        range: props.range,
                                        props: item,
                                    });
                                    // Close the slash command after executing any command
                                    destroy();
                                }
                                return true;
                            }
                
                            return false;
                        },
                
                        onExit() {
                            destroy();
                        },
                    };
                },
            }),
        ];
    },
});

