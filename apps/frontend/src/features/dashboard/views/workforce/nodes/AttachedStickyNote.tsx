import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkforceStore } from '../store/useWorkforceStore';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import '@/features/dashboard/views/workforce/nodes/sticky-note-editor.css';

const NOTE_COLORS = [
    {
        bg: 'bg-[#FFFCF0]',
        border: 'border-[#E6DAB0]',
        dot: 'bg-[#E6D5A0]',
        value: 'yellow'
    },
    {
        bg: 'bg-[#F0F7FF]',
        border: 'border-[#C0D8FF]',
        dot: 'bg-[#A0C4FF]',
        value: 'blue'
    },
    {
        bg: 'bg-[#F2FFF5]',
        border: 'border-[#C0E8CC]',
        dot: 'bg-[#90D8A5]',
        value: 'green'
    },
    {
        bg: 'bg-[#FFF0F6]',
        border: 'border-[#FFC8DA]',
        dot: 'bg-[#FFA0C4]',
        value: 'pink'
    },
    {
        bg: 'bg-[#F8F2FF]',
        border: 'border-[#E0D0FF]',
        dot: 'bg-[#C4A0FF]',
        value: 'purple'
    },
];

/**
 * If content was previously saved as raw markdown instead of HTML,
 * do a best-effort conversion so Tiptap renders it correctly.
 */
function sanitizeContent(raw: string): string {
    if (!raw) return '';
    if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
    return raw
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/~~(.+?)~~/g, '<s>$1</s>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
}

// Toolbar button that uses onMouseDown to avoid stealing editor focus
const ToolbarButton = ({
    title,
    onClick,
    children,
}: {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
}) => (
    <button
        type="button"
        title={title}
        onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }}
        className="h-5 w-5 flex items-center justify-center rounded hover:bg-black/10 text-zinc-600 transition-colors"
    >
        {children}
    </button>
);

export function AttachedStickyNote({ nodeId, data }: { nodeId: string; data: any }) {
    const { updateNodeData } = useWorkforceStore();
    const [isEditing, setIsEditing] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);

    const colorKey = data?.stickyNoteColor || 'yellow';
    const colorStyle = NOTE_COLORS.find(c => c.value === colorKey) || NOTE_COLORS[0];
    const content = data?.stickyNoteContent || '';

    const setContent = (val: string) => {
        updateNodeData(nodeId, { stickyNoteContent: val });
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            UnderlineExtension,
        ],
        content: sanitizeContent(content),
        editable: false,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
    });

    // Sync editable state with Tiptap when toggling editing mode
    useEffect(() => {
        if (!editor) return;
        editor.setEditable(isEditing);
        if (isEditing) {
            editor.commands.focus('end');
        }
    }, [editor, isEditing]);

    if (!data?.stickyNoteVisible) return null;

    return (
        <div
            className={cn(
                'rounded-xl border shadow-[0_2px_10px_rgba(0,0,0,0.03)] mb-3 transition-all duration-300 relative nodrag nopan',
                colorStyle.bg, colorStyle.border,
                isEditing && 'shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-50 scale-[1.01]'
            )}
            style={{ width: '100%' }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
        >
            {/* Formatting toolbar — shown when editing */}
            {isEditing && editor && (
                <div
                    ref={toolbarRef}
                    className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-black/5 flex-wrap"
                    onMouseDown={e => e.stopPropagation()}
                >
                    {/* Color dot */}
                    <div className="relative mr-1">
                        <div
                            className={cn('h-4 w-4 rounded-full cursor-pointer transition-transform hover:scale-110', colorStyle.dot)}
                            onMouseDown={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowColorPicker(p => !p);
                            }}
                        />
                        {showColorPicker && (
                            <div className="absolute top-6 -left-2 bg-white rounded-lg shadow-xl border border-zinc-200 p-2 flex gap-1.5 z-50">
                                {NOTE_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onMouseDown={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            updateNodeData(nodeId, { stickyNoteColor: c.value });
                                            setShowColorPicker(false);
                                        }}
                                        className={cn('h-5 w-5 rounded-full border-2', c.dot, colorKey === c.value ? 'border-zinc-800 scale-110' : 'border-transparent')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <ToolbarButton title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
                        <Bold className="h-3 w-3" />
                    </ToolbarButton>
                    <ToolbarButton title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
                        <Italic className="h-3 w-3" />
                    </ToolbarButton>
                    <ToolbarButton title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
                        <Underline className="h-3 w-3" />
                    </ToolbarButton>

                    <div className="w-px h-3 bg-zinc-200 mx-0.5" />

                    <ToolbarButton title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>
                        <List className="h-3 w-3" />
                    </ToolbarButton>
                    <ToolbarButton title="Ordered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                        <ListOrdered className="h-3 w-3" />
                    </ToolbarButton>

                    <div className="w-px h-3 bg-zinc-200 mx-0.5" />

                    <ToolbarButton title="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                        <Heading1 className="h-3 w-3" />
                    </ToolbarButton>
                    <ToolbarButton title="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                        <Heading2 className="h-3 w-3" />
                    </ToolbarButton>
                    <ToolbarButton title="H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                        <Heading3 className="h-3 w-3" />
                    </ToolbarButton>
                </div>
            )}

            {/* Content area */}
            <div
                className="relative p-3 nodrag nopan text-[12px] text-zinc-700 min-h-[40px] cursor-text leading-relaxed prose prose-sm max-w-none tiptap sticky-note-editor"
                onClick={() => { if (!isEditing) setIsEditing(true); }}
            >
                {editor ? (
                    <EditorContent
                        editor={editor}
                        className="min-h-[40px] focus:outline-none border-none outline-none ring-0 shadow-none"
                        onBlur={(e) => {
                            if (toolbarRef.current?.contains(e.relatedTarget as Node)) {
                                return;
                            }
                            // Small delay so toolbar clicks register before blur hides the editor
                            setTimeout(() => setIsEditing(false), 200);
                        }}
                    />
                ) : (
                    <span className="text-zinc-400/70 italic">Enter a note...</span>
                )}
            </div>
        </div>
    );
}
