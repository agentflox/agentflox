'use client';

import { useEffect, useState, useCallback, useRef, useImperativeHandle, forwardRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/core';
import { EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions'
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list'
import Link from '@tiptap/extension-link';
import { BubbleMenu } from '@tiptap/react/menus';
import FileHandler from '@tiptap/extension-file-handler';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Mention from '@tiptap/extension-mention'
import Color from '@tiptap/extension-color';
import { TextStyleKit as TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Youtube from '@tiptap/extension-youtube';
import { Button } from '@/components/ui/button';
import DragHandle from '@tiptap/extension-drag-handle-react';
import { Selection } from '@tiptap/extensions'
import { useCollaborativeEditor } from '@/hooks/useCollaborativeEditor';
import { SlashCommand } from './SlashCommand';
import { Separator } from '@/components/ui/separator';
import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    List,
    ListOrdered,
    Quote,
    Sparkles,
    CheckSquare,
    Link as LinkIcon,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Minus,
    MoreHorizontal,
    ImageIcon,
    Underline as UnderlineIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Indent,
    Outdent,
    RotateCcw,
    RotateCw,
    Eraser,
    Copy,
    Pin,
    ChevronDown,
    Type,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { improveText } from '@/services/ai-text.service';
import { BrainEditDialog, type BrainEditMode } from './BrainEditDialog';
import { BrainResultDialog } from './BrainResultDialog';
import { MentionModalDialog } from './MentionModalDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import './editor.css';

interface DescriptionEditorProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
    onOpenAskAI?: () => void;
    spaceId?: string | null;
    workspaceId?: string | null;
    projectId?: string | null;
    // Opt-in realtime collaboration
    collaboration?: {
        enabled: boolean;
        documentId: string;
        documentType: 'task' | 'project' | 'space' | 'comment' | 'doc';
        user?: {
            id: string;
            name: string;
            color?: string;
        };
    };
}

export interface DescriptionEditorRef {
    focus: () => void;
    getEditor: () => Editor | null;
}

interface MenuButtonProps {
    onClick: () => void;
    isActive?: boolean;
    icon: ReactNode;
    tooltip: string;
    className?: string;
    disabled?: boolean;
}

const MenuButton = ({ onClick, isActive, icon, tooltip, className, disabled }: MenuButtonProps) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled}
                aria-label={tooltip}
                className={cn(
                    'h-8 w-8 transition-all duration-200',
                    isActive
                        ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50',
                    className,
                )}
                onClick={onClick}
            >
                {icon}
            </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] px-2 py-1">
            {tooltip}
        </TooltipContent>
    </Tooltip>
);

// Function to get extensions with optional collaboration support
const getExtensions = (collaborationExtensions: any[] = []) => [
    ...collaborationExtensions, // Add collaboration extensions first if provided
    StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
    }),
    Placeholder.configure({
        placeholder: 'Write a description, type / for commands...',
    }),
    Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline hover:text-blue-800' },
    }),
    TaskList,
    BulletList,
    OrderedList,
    ListItem,
    Selection.configure({
        className: 'selection',
    }),
    TaskItem.configure({ nested: true }),
    Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
            class: 'rounded-lg max-w-full h-auto',
        },
    }),
    TableKit.configure({
        table: { resizable: true },
    }),
    FileHandler.configure({
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
        onDrop: (currentEditor, files, pos) => {
            files.forEach(file => {
                const fileReader = new FileReader();

                fileReader.readAsDataURL(file);
                fileReader.onload = () => {
                    currentEditor
                        .chain()
                        .insertContentAt(pos, {
                            type: 'image',
                            attrs: {
                                src: fileReader.result,
                            },
                        })
                        .focus()
                        .run();
                };
            });
        },
        onPaste: (currentEditor, files, htmlContent) => {
            files.forEach(file => {
                if (htmlContent) {
                    console.log('HTML content detected:', htmlContent);
                    return false;
                }

                const fileReader = new FileReader();

                fileReader.readAsDataURL(file);
                fileReader.onload = () => {
                    currentEditor
                        .chain()
                        .insertContentAt(currentEditor.state.selection.anchor, {
                            type: 'image',
                            attrs: {
                                src: fileReader.result,
                            },
                        })
                        .focus()
                        .run();
                };
            });
        },
    }),
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
        multicolor: true,
    }),
    Youtube.configure({
        controls: false,
        modestBranding: true,
    }),
    Mention.configure({
        HTMLAttributes: {
            class: 'mention',
        },
        // When user types "@", open the same mention modal we use for slash commands.
        suggestion: {
            char: '@',
            render() {
                return {
                    onStart(props) {
                        console.log('[DEBUG] Mention suggestion started:', props);
                        const mention = (props.editor as any).storage?.mention;
                        if (mention) {
                            mention.open('people', props.range);
                        }
                    },
                    onExit() {
                        console.log('[DEBUG] Mention suggestion exited');
                        // Modal closing is handled inside TaskDescriptionEditor.
                    },
                    onKeyDown() {
                        console.log('[DEBUG] Mention suggestion keydown');
                        // Let the modal handle all keyboard interactions.
                        return false;
                    },
                };
            },
        },
    }),
    SlashCommand,
];


// Text colors matching ClickUp
const TEXT_COLORS = [
    '#D32F2F', '#E64A19', '#F57C00', '#FBC02D',
    '#388E3C', '#0288D1', '#1976D2', '#7B1FA2', '#000000'
];

// Highlight colors matching ClickUp
const HIGHLIGHT_COLORS = [
    '#FFCDD2', '#FFE0B2', '#FFF9C4', '#DCEDC8',
    '#B3E5FC', '#C5CAE9', '#F8BBD0', '#D7CCC8',
];

// Badge/Accent colors
const BADGE_COLORS = [
    '#D32F2F', '#E64A19', '#F57C00', '#FBC02D',
    '#388E3C', '#0288D1', '#7B1FA2', '#EC407A',
    '#78909C',
];

export const DescriptionEditor = forwardRef<DescriptionEditorRef, DescriptionEditorProps>(function TaskDescriptionEditor({
    content,
    onChange,
    editable = true,
    onOpenAskAI,
    spaceId = null,
    workspaceId = null,
    projectId = null,
    collaboration,
}, ref) {
    const [brainEditOpen, setBrainEditOpen] = useState(false);
    const [brainEditMode, setBrainEditMode] = useState<BrainEditMode>('full');
    const [brainEditSelectedText, setBrainEditSelectedText] = useState('');
    const [slashResultOpen, setSlashResultOpen] = useState(false);
    const [slashResult, setSlashResult] = useState<{ result: string; originalText: string; operation: string } | null>(null);
    const [toolbarPinned, setToolbarPinned] = useState(false);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [urlPromptOpen, setUrlPromptOpen] = useState(false);
    const [urlPromptPlaceholder, setUrlPromptPlaceholder] = useState('');
    const [urlPromptValue, setUrlPromptValue] = useState('');
    const [urlPromptOnSubmit, setUrlPromptOnSubmit] = useState<((url: string) => void) | null>(null);
    const [urlPromptRange, setUrlPromptRange] = useState<{ from: number; to: number } | null>(null);
    const [urlPromptPosition, setUrlPromptPosition] = useState<{ top: number; left: number } | null>(null);
    const [mentionModalOpen, setMentionModalOpen] = useState(false);
    const [mentionInitialTab, setMentionInitialTab] = useState<'tasks' | 'docs' | 'people'>('people');
    const [mentionRange, setMentionRange] = useState<{ from: number; to: number } | null>(null);
    const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null);
    const [editor, setEditor] = useState<Editor | null>(null);
    const bubbleRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef(content);
    const editableRef = useRef(editable);
    const onChangeRef = useRef(onChange);

    // Realtime collaboration (opt-in via prop)
    const collaborationHook = useCollaborativeEditor({
        documentId: collaboration?.documentId || '',
        documentType: collaboration?.documentType || 'task',
        enabled: collaboration?.enabled || false,
        user: collaboration?.user || { id: '', name: '' },
    });

    // Keep refs up to date
    contentRef.current = content;
    editableRef.current = editable;
    onChangeRef.current = onChange;

    useImperativeHandle(
        ref,
        () => ({
            focus: () => {
                console.log('[DEBUG] Focus called via ref');
                editor?.chain().focus().run();
            },
            getEditor: () => editor,
        }),
        [editor],
    );

    // Initialize editor
    useEffect(() => {
        console.log('[DEBUG] Initializing editor with:', { spaceId, workspaceId, projectId });

        // Get collaboration extensions if enabled
        const collabExtensions = collaboration?.enabled ? collaborationHook.extensions : [];

        const ed = new Editor({
            extensions: getExtensions(collabExtensions),
            content: contentRef.current,
            editorProps: {
                attributes: {
                    class:
                        'prose prose-sm max-w-none focus:outline-none min-h-[300px] text-zinc-900 [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none',
                },
                handleClickOn: (view, pos, node, nodePos, event, direct) => {
                    console.log('[DEBUG] handleClickOn triggered:', {
                        pos,
                        nodePos,
                        nodeName: node?.type?.name,
                        direct,
                        eventTarget: event.target,
                        selection: {
                            from: view.state.selection.from,
                            to: view.state.selection.to,
                            empty: view.state.selection.empty
                        }
                    });
                    return false;
                },
                handleClick: (view, pos, event) => {
                    console.log('[DEBUG] handleClick triggered:', {
                        pos,
                        eventTarget: event.target,
                        selection: {
                            from: view.state.selection.from,
                            to: view.state.selection.to,
                            empty: view.state.selection.empty
                        }
                    });
                    return false;
                },
                handleDOMEvents: {
                    mousedown: (view, event) => {
                        console.log('[DEBUG] mousedown event:', {
                            target: event.target,
                            button: event.button,
                            editable: view.editable
                        });
                        return false;
                    },
                    mouseup: (view, event) => {
                        console.log('[DEBUG] mouseup event:', {
                            target: event.target,
                            selection: {
                                from: view.state.selection.from,
                                to: view.state.selection.to,
                                empty: view.state.selection.empty,
                                text: view.state.doc.textBetween(
                                    view.state.selection.from,
                                    view.state.selection.to
                                )
                            }
                        });
                        return false;
                    },
                    click: (view, event) => {
                        console.log('[DEBUG] click event:', {
                            target: event.target,
                            selection: view.state.selection
                        });
                        return false;
                    }
                }
            },
            onUpdate: ({ editor: e }) => {
                console.log('[DEBUG] Editor content updated');
                onChangeRef.current(e.getHTML());
            },
            onSelectionUpdate: ({ editor: e }) => {
                const { from, to, empty } = e.state.selection;
                console.log('[DEBUG] Selection updated:', {
                    from,
                    to,
                    empty,
                    selectedText: e.state.doc.textBetween(from, to, ' ')
                });
            },
            onFocus: ({ editor: e }) => {
                console.log('[DEBUG] Editor focused');
            },
            onBlur: ({ editor: e }) => {
                console.log('[DEBUG] Editor blurred');
            }
        });

        // Store context in editor storage for mention commands
        (ed as any).storage.mentionContext = {
            spaceId: spaceId ?? undefined,
            workspaceId: workspaceId ?? undefined,
            projectId: projectId ?? undefined,
        };

        setEditor(ed);
        console.log('[DEBUG] Editor initialized');

        return () => {
            console.log('[DEBUG] Editor destroyed');
            ed.destroy();
            setEditor(null);
        };
    }, [spaceId, workspaceId, projectId]); // Include context in deps

    // Update editable state
    useEffect(() => {
        if (!editor) return;
        console.log('[DEBUG] Updating editable state:', editableRef.current);
        editor.setEditable(editableRef.current);
    }, [editor, editable]);

    // Update content when changed externally
    useEffect(() => {
        if (!editor || !content || content === editor.getHTML() || editor.isFocused) {
            console.log('[DEBUG] Skipping content update:', {
                hasEditor: !!editor,
                hasContent: !!content,
                contentMatch: content === editor?.getHTML(),
                isFocused: editor?.isFocused
            });
            return;
        }
        console.log('[DEBUG] Setting content externally');
        editor.commands.setContent(content);
    }, [content, editor]);

    const handleOpenBrainEdit = useCallback(() => {
        if (editor) {
            const text = editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to,
                ' '
            ).trim();
            console.log('[DEBUG] Opening Brain Edit with selected text:', text);
            setBrainEditSelectedText(text);
        }
        setBrainEditMode('full');
        setBrainEditOpen(true);
    }, [editor]);

    // Expose callbacks for slash commands
    useEffect(() => {
        if (!editor) return;
        console.log('[DEBUG] Setting up editor storage callbacks');

        (editor as any).storage.brain = {
            openWriteWithAI(selectedText?: string) {
                console.log('[DEBUG] openWriteWithAI called:', selectedText);
                setBrainEditSelectedText(selectedText ?? '');
                setBrainEditMode('writeWithAI');
                setBrainEditOpen(true);
            },
            runDirectAI(operation: string, selectedText?: string) {
                console.log('[DEBUG] runDirectAI called:', { operation, selectedText });
                const text = selectedText ?? '';
                improveText(text || ' ', { operation })
                    .then((res) => {
                        console.log('[DEBUG] AI response received:', res);
                        if ('error' in res) {
                            toast.error(`Insufficient tokens. Remaining: ${res.remaining}`);
                            return;
                        }
                        setSlashResult({ result: res.result, originalText: text, operation });
                        setSlashResultOpen(true);
                    })
                    .catch((e) => {
                        console.error('[DEBUG] AI request failed:', e);
                        toast.error(e instanceof Error ? e.message : 'AI request failed');
                    });
            },
        };
        (editor as any).storage.urlPrompt = {
            open(placeholder: string, onSubmit: (url: string) => void, range: { from: number; to: number }) {
                console.log('[DEBUG] URL prompt opened:', { placeholder, range });
                // Get cursor position for positioning the modal
                const { view } = editor;
                const coords = view.coordsAtPos(range.from);
                setUrlPromptPlaceholder(placeholder);
                setUrlPromptValue('');
                setUrlPromptOnSubmit(() => onSubmit);
                setUrlPromptRange(range);
                setUrlPromptPosition({ top: coords.bottom + 4, left: coords.left });
                setUrlPromptOpen(true);
                // Close slash command if open
                const slashCommand = (editor as any).storage?.slashCommand;
                if (slashCommand?.close) {
                    slashCommand.close();
                }
            },
        };
        (editor as any).storage.mention = {
            open(initialTab: 'tasks' | 'docs' | 'people', range: { from: number; to: number }) {
                console.log('[DEBUG] Mention modal opened:', { initialTab, range });
                // Get cursor position for positioning the modal
                const { view } = editor;
                const coords = view.coordsAtPos(range.from);
                setMentionInitialTab(initialTab);
                setMentionRange(range);
                setMentionPosition({ top: coords.bottom + 4, left: coords.left });
                setMentionModalOpen(true);
                // Close slash command if open
                const slashCommand = (editor as any).storage?.slashCommand;
                if (slashCommand?.close) {
                    slashCommand.close();
                }
            },
        };
        return () => {
            console.log('[DEBUG] Cleaning up editor storage callbacks');
            delete (editor as any).storage.brain;
            delete (editor as any).storage.urlPrompt;
            delete (editor as any).storage.mention;
        };
    }, [editor]);

    const handleReplaceSelection = useCallback(
        (newText: string) => {
            if (!editor) return;
            console.log('[DEBUG] Replacing selection with:', newText);
            const { from, to } = editor.state.selection;
            editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
            onChangeRef.current(editor.getHTML());
        },
        [editor]
    );

    const openLinkDialog = useCallback(() => {
        if (!editor) return;
        console.log('[DEBUG] Opening link dialog');
        const previousUrl = editor.getAttributes('link').href || '';
        setLinkUrl(previousUrl);
        setLinkDialogOpen(true);
    }, [editor]);

    const handleSetLink = useCallback(() => {
        if (!editor) return;
        console.log('[DEBUG] Setting link:', linkUrl);
        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
        }
        setLinkDialogOpen(false);
        setLinkUrl('');
    }, [editor, linkUrl]);

    const addImage = useCallback(() => {
        if (!editor) return;
        console.log('[DEBUG] Adding image');
        const url = window.prompt('Image URL', 'https://');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    // URL Prompt handlers
    const handleUrlPromptSubmit = useCallback(() => {
        console.log('[DEBUG] URL prompt submitted:', urlPromptValue);
        if (!editor || !urlPromptOnSubmit || !urlPromptRange) return;
        const value = urlPromptValue.trim();
        if (value) {
            editor.chain().focus().deleteRange(urlPromptRange).run();
            urlPromptOnSubmit(value);
        }
        setUrlPromptOpen(false);
        setUrlPromptValue('');
        setUrlPromptOnSubmit(null);
        setUrlPromptRange(null);
        setUrlPromptPosition(null);
    }, [editor, urlPromptValue, urlPromptOnSubmit, urlPromptRange]);

    // Mention Modal handlers
    const handleMentionSelect = useCallback((item: { id: string; label: string; kind: 'task' | 'doc' | 'person' }) => {
        console.log('[DEBUG] Mention selected:', item);
        if (!editor || !mentionRange) return;
        editor
            .chain()
            .focus()
            .deleteRange(mentionRange)
            .insertContent({
                type: 'mention',
                attrs: {
                    id: item.id,
                    label: item.label,
                    kind: item.kind,
                },
            })
            .run();
        setMentionModalOpen(false);
        setMentionRange(null);
        setMentionPosition(null);
    }, [editor, mentionRange]);

    // Click outside to close URL prompt
    useEffect(() => {
        if (!urlPromptOpen) return;
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-url-prompt]')) {
                console.log('[DEBUG] Closing URL prompt (click outside)');
                setUrlPromptOpen(false);
                setUrlPromptPosition(null);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [urlPromptOpen]);

    // Click outside to close Mention modal
    useEffect(() => {
        if (!mentionModalOpen) return;
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-mention-modal]')) {
                console.log('[DEBUG] Closing mention modal (click outside)');
                setMentionModalOpen(false);
                setMentionPosition(null);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [mentionModalOpen]);

    return (
        <div className="relative group">
            {/* Brain Edit Dialog (full or Write with AI mode) */}
            <BrainEditDialog
                open={brainEditOpen}
                onOpenChange={setBrainEditOpen}
                selectedText={brainEditSelectedText}
                editor={editor}
                onReplaceSelection={handleReplaceSelection}
                onOpenAskAI={onOpenAskAI}
                mode={brainEditMode}
                spaceId={spaceId}
                workspaceId={workspaceId}
                projectId={projectId}
            />
            {/* Result dialog when AI is run from slash (e.g. Simplify, Summarize); Back reopens Write with AI */}
            {slashResult && (
                <BrainResultDialog
                    open={slashResultOpen}
                    onOpenChange={setSlashResultOpen}
                    result={slashResult.result}
                    editor={editor}
                    originalText={slashResult.originalText}
                    onReplaceSelection={handleReplaceSelection}
                    onRegenerate={() => {
                        console.log('[DEBUG] Regenerating AI result');
                        improveText(slashResult.originalText || ' ', { operation: slashResult.operation })
                            .then((res) => {
                                if ('error' in res) {
                                    toast.error(`Insufficient tokens. Remaining: ${res.remaining}`);
                                    return;
                                }
                                setSlashResult((prev) => (prev ? { ...prev, result: res.result } : null));
                            })
                            .catch((e) => {
                                console.error(e);
                                toast.error(e instanceof Error ? e.message : 'AI request failed');
                            });
                    }}
                    onBack={() => {
                        console.log('[DEBUG] Back button clicked in result dialog');
                        setSlashResultOpen(false);
                        setBrainEditMode('writeWithAI');
                        setBrainEditOpen(true);
                    }}
                    onOpenAskAI={onOpenAskAI}
                    spaceId={spaceId}
                    workspaceId={workspaceId}
                    projectId={projectId}
                />
            )}

            {/* Link Dialog */}
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogHeader>
                    <DialogTitle className="sr-only">URL Link</DialogTitle>
                </DialogHeader>
                <DialogContent className="sm:max-w-[325px] [&>button]:hidden p-0 rounded-sm">
                    <div className="flex items-center justify-between gap-2">
                        <Input
                            variant="ghost"
                            className="border-0 bg-transparent outline-none focus:outline-none shadow-none px-2 h-9 min-w-[270px]"
                            id="link-url"
                            placeholder="Paste a link then press Enter"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSetLink();
                                }
                            }}
                        />
                        <Separator orientation="vertical" />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="cursor-pointer h-7 gap-1.5 text-purple-600 hover:text-purple-900 hover:bg-transparent w-full"
                            onClick={() => setLinkDialogOpen(false)}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* URL Prompt – ClickUp-style inline pill positioned relative to cursor */}
            {urlPromptOpen && urlPromptPosition && typeof window !== 'undefined' && createPortal(
                <div
                    data-url-prompt
                    className="fixed z-50 bg-white border border-gray-200 rounded-sm shadow-lg"
                    style={{
                        top: `${urlPromptPosition.top}px`,
                        left: `${urlPromptPosition.left}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-2 px-2">
                        <Input
                            variant="ghost"
                            className="border-0 bg-transparent outline-none focus:outline-none shadow-none px-2 h-9 min-w-[270px]"
                            placeholder={urlPromptPlaceholder || 'Paste a link then press Enter'}
                            value={urlPromptValue}
                            onChange={(e) => setUrlPromptValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleUrlPromptSubmit();
                                } else if (e.key === 'Escape') {
                                    setUrlPromptOpen(false);
                                    setUrlPromptPosition(null);
                                }
                            }}
                            autoFocus
                        />
                        <Separator orientation="vertical" />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="cursor-pointer h-7 gap-1.5 text-purple-600 hover:text-purple-900 hover:bg-transparent w-full"
                            onClick={() => {
                                setUrlPromptOpen(false);
                                setUrlPromptPosition(null);
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>,
                document.body
            )}

            {/* Mention Modal positioned relative to cursor */}
            <MentionModalDialog
                open={mentionModalOpen}
                onOpenChange={setMentionModalOpen}
                initialTab={mentionInitialTab}
                spaceId={spaceId}
                workspaceId={workspaceId}
                projectId={projectId}
                onSelect={handleMentionSelect}
                position={mentionPosition || undefined}
            />

            {/* Bubble menu: ClickUp-style toolbar */}
            {editable && editor && (
                <BubbleMenu ref={bubbleRef} editor={editor} options={{ placement: 'bottom', offset: 16, flip: true }}>
                    <div className="bubble-menu">
                        <TooltipProvider delayDuration={300}>
                            {/* Improve Button */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 font-medium"
                                        onClick={handleOpenBrainEdit}
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Edit
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    AI-powered text improvement
                                </TooltipContent>
                            </Tooltip>

                            <div className="w-px h-4 bg-zinc-200 mx-1" />

                            {/* List Type Dropdown */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 gap-1"
                                            >
                                                <List className="h-3.5 w-3.5" />
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-48" sideOffset={5}>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                                className={cn(editor.isActive('bulletList') && 'bg-zinc-100')}
                                            >
                                                <List className="h-4 w-4 mr-2" />
                                                Bullet List
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                                className={cn(editor.isActive('orderedList') && 'bg-zinc-100')}
                                            >
                                                <ListOrdered className="h-4 w-4 mr-2" />
                                                Numbered List
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleTaskList().run()}
                                                className={cn(editor.isActive('taskList') && 'bg-zinc-100')}
                                            >
                                                <CheckSquare className="h-4 w-4 mr-2" />
                                                Task List
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    Insert list
                                </TooltipContent>
                            </Tooltip>

                            {/* Text Style Dropdown */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 gap-1"
                                            >
                                                <Type className="h-3.5 w-3.5" />
                                                <span className="text-xs">Text</span>
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-56" sideOffset={5} container={bubbleRef.current}>
                                            <DropdownMenuLabel className="text-xs text-zinc-500">Turn into</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().setParagraph().run()}
                                                className={cn(editor.isActive('paragraph') && 'bg-zinc-100')}
                                            >
                                                <Type className="h-4 w-4 mr-2" />
                                                Text
                                                {editor.isActive('paragraph') && <span className="ml-auto text-xs text-zinc-500">✓</span>}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                                className={cn(editor.isActive('heading', { level: 1 }) && 'bg-zinc-100')}
                                            >
                                                <Heading1 className="h-4 w-4 mr-2" />
                                                Heading 1
                                                <span className="ml-auto text-xs text-zinc-400">Alt+Ctrl+1</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                                className={cn(editor.isActive('heading', { level: 2 }) && 'bg-zinc-100')}
                                            >
                                                <Heading2 className="h-4 w-4 mr-2" />
                                                Heading 2
                                                <span className="ml-auto text-xs text-zinc-400">Alt+Ctrl+2</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                                className={cn(editor.isActive('heading', { level: 3 }) && 'bg-zinc-100')}
                                            >
                                                <Heading3 className="h-4 w-4 mr-2" />
                                                Heading 3
                                                <span className="ml-auto text-xs text-zinc-400">Alt+Ctrl+3</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                                                className={cn(editor.isActive('heading', { level: 4 }) && 'bg-zinc-100')}
                                            >
                                                <Heading4 className="h-4 w-4 mr-2" />
                                                Heading 4
                                                <span className="ml-auto text-xs text-zinc-400">Alt+Ctrl+4</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                                                className={cn(editor.isActive('codeBlock') && 'bg-zinc-100')}
                                            >
                                                <Code className="h-4 w-4 mr-2" />
                                                Code block
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                                className={cn(editor.isActive('blockquote') && 'bg-zinc-100')}
                                            >
                                                <Quote className="h-4 w-4 mr-2" />
                                                Quote
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    Text style
                                </TooltipContent>
                            </Tooltip>

                            {/* Text Color Popover */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Popover modal={false}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 relative"
                                            >
                                                <Type className="h-3.5 w-3.5" />
                                                <div
                                                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3"
                                                    style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                                                />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-3" align="start" sideOffset={5}>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="text-xs font-medium text-zinc-600 mb-2">Text colors</div>
                                                    <div className="grid grid-cols-9 gap-1">
                                                        {TEXT_COLORS.map((color) => (
                                                            <button
                                                                key={color}
                                                                type="button"
                                                                className="w-7 h-7 rounded flex items-center justify-center hover:ring-2 hover:ring-zinc-300 transition-all"
                                                                style={{ backgroundColor: color === '#000000' ? 'transparent' : color }}
                                                                onClick={() => editor.chain().focus().setColor(color).run()}
                                                            >
                                                                <span
                                                                    className="text-sm font-semibold"
                                                                    style={{ color: color }}
                                                                >
                                                                    A
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-medium text-zinc-600 mb-2">Text highlights</div>
                                                    <div className="grid grid-cols-9 gap-1">
                                                        {HIGHLIGHT_COLORS.map((color) => (
                                                            <button
                                                                key={color}
                                                                type="button"
                                                                className="w-7 h-7 rounded hover:ring-2 hover:ring-zinc-300 transition-all"
                                                                style={{ backgroundColor: color }}
                                                                onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-medium text-zinc-600 mb-2">Badges</div>
                                                    <div className="grid grid-cols-9 gap-1">
                                                        {BADGE_COLORS.map((color) => (
                                                            <button
                                                                key={color}
                                                                type="button"
                                                                className="w-7 h-7 rounded hover:ring-2 hover:ring-zinc-300 transition-all"
                                                                style={{ backgroundColor: color }}
                                                                onClick={() => editor.chain().focus().setColor(color).run()}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full text-xs"
                                                    onClick={() => editor.chain().focus().unsetColor().unsetHighlight().run()}
                                                >
                                                    <Eraser className="h-3 w-3 mr-1" />
                                                    Remove color
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    Text color
                                </TooltipContent>
                            </Tooltip>

                            {/* Bold */}
                            <MenuButton
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                isActive={editor.isActive('bold')}
                                icon={<Bold className="h-3.5 w-3.5" />}
                                tooltip="Bold"
                            />

                            {/* Italic */}
                            <MenuButton
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                isActive={editor.isActive('italic')}
                                icon={<Italic className="h-3.5 w-3.5" />}
                                tooltip="Italic"
                            />

                            {/* Underline */}
                            <MenuButton
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                                isActive={editor.isActive('underline')}
                                icon={<UnderlineIcon className="h-3.5 w-3.5" />}
                                tooltip="Underline"
                            />

                            {/* Strikethrough */}
                            <MenuButton
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                isActive={editor.isActive('strike')}
                                icon={<Strikethrough className="h-3.5 w-3.5" />}
                                tooltip="Strikethrough"
                            />

                            {/* Code */}
                            <MenuButton
                                onClick={() => editor.chain().focus().toggleCode().run()}
                                isActive={editor.isActive('code')}
                                icon={<Code className="h-3.5 w-3.5" />}
                                tooltip="Code"
                            />

                            {/* Alignment Dropdown */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                            >
                                                {editor.isActive({ textAlign: 'center' }) ? (
                                                    <AlignCenter className="h-3.5 w-3.5" />
                                                ) : editor.isActive({ textAlign: 'right' }) ? (
                                                    <AlignRight className="h-3.5 w-3.5" />
                                                ) : editor.isActive({ textAlign: 'justify' }) ? (
                                                    <AlignJustify className="h-3.5 w-3.5" />
                                                ) : (
                                                    <AlignLeft className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" sideOffset={5} container={bubbleRef.current}>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                                                className={cn(editor.isActive({ textAlign: 'left' }) && 'bg-zinc-100')}
                                            >
                                                <AlignLeft className="h-4 w-4 mr-2" />
                                                Align left
                                                <span className="ml-auto text-xs text-zinc-400">Ctrl+Shift+L</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                                                className={cn(editor.isActive({ textAlign: 'center' }) && 'bg-zinc-100')}
                                            >
                                                <AlignCenter className="h-4 w-4 mr-2" />
                                                Align center
                                                <span className="ml-auto text-xs text-zinc-400">Ctrl+Shift+E</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                                                className={cn(editor.isActive({ textAlign: 'right' }) && 'bg-zinc-100')}
                                            >
                                                <AlignRight className="h-4 w-4 mr-2" />
                                                Align right
                                                <span className="ml-auto text-xs text-zinc-400">Ctrl+Shift+R</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
                                            >
                                                <Indent className="h-4 w-4 mr-2" />
                                                Increase indent
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().liftListItem('listItem').run()}
                                            >
                                                <Outdent className="h-4 w-4 mr-2" />
                                                Decrease indent
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    Align
                                </TooltipContent>
                            </Tooltip>

                            {/* Link */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className={cn('h-7 w-7', editor.isActive('link') && 'bg-zinc-100 text-black')}
                                        onClick={openLinkDialog}
                                    >
                                        <LinkIcon className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    Insert link
                                </TooltipContent>
                            </Tooltip>

                            {/* More Options Dropdown */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                            >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56" sideOffset={5} container={bubbleRef.current}>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().undo().run()}
                                                disabled={!editor.can().undo()}
                                            >
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Undo
                                                <span className="ml-auto text-xs text-zinc-400">Ctrl+Z</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => editor.chain().focus().redo().run()}
                                                disabled={!editor.can().redo()}
                                            >
                                                <RotateCw className="h-4 w-4 mr-2" />
                                                Redo
                                                <span className="ml-auto text-xs text-zinc-400">Ctrl+Shift+Z</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={addImage}>
                                                <ImageIcon className="h-4 w-4 mr-2" />
                                                Insert
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    editor.chain().focus().unsetAllMarks().clearNodes().run();
                                                }}
                                            >
                                                <Eraser className="h-4 w-4 mr-2" />
                                                Clear format
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    const html = editor.getHTML();
                                                    navigator.clipboard.writeText(html);
                                                }}
                                            >
                                                <Copy className="h-4 w-4 mr-2" />
                                                Copy Markdown
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel className="text-xs text-zinc-500">Toolbar position</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => setToolbarPinned(false)}
                                                className={cn(!toolbarPinned && 'bg-zinc-100')}
                                            >
                                                Default
                                                {!toolbarPinned && <span className="ml-auto text-xs">✓</span>}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setToolbarPinned(true)}
                                                className={cn(toolbarPinned && 'bg-zinc-100')}
                                            >
                                                <Pin className="h-4 w-4 mr-2" />
                                                Pinned
                                                {toolbarPinned && <span className="ml-auto text-xs">✓</span>}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    More options
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </BubbleMenu>
            )}

            {/* Refined drag handle */}
            {editable && editor && (
                <DragHandle editor={editor}>
                    <div className="group flex items-center justify-center w-6 h-8 rounded-md hover:bg-zinc-100 transition-colors cursor-grab active:cursor-grabbing">
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            className="text-zinc-300 group-hover:text-zinc-500 transition-colors"
                        >
                            <circle cx="4" cy="2" r="1" fill="currentColor" />
                            <circle cx="8" cy="2" r="1" fill="currentColor" />
                            <circle cx="4" cy="6" r="1" fill="currentColor" />
                            <circle cx="8" cy="6" r="1" fill="currentColor" />
                            <circle cx="4" cy="10" r="1" fill="currentColor" />
                            <circle cx="8" cy="10" r="1" fill="currentColor" />
                        </svg>
                    </div>
                </DragHandle>
            )}
            {/* Editor Content */}
            <EditorContent editor={editor} className="tiptap" />
        </div>
    );
});
