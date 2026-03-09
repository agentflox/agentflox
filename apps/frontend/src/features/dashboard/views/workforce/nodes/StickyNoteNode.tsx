import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3 } from 'lucide-react';
import { NodeContextMenu } from './NodeContextMenu';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import { useWorkforceStore } from '../store/useWorkforceStore';
import '@/features/dashboard/views/workforce/nodes/sticky-note-editor.css';

/**
 * If content was previously saved as raw markdown (e.g. "**bold**") instead of
 * HTML, convert it so Tiptap renders it correctly.
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

const NOTE_COLORS = [
    {
        bg: 'bg-[#FFFCF0]',
        border: 'border-[#F0E6C0]',
        dot: 'bg-[#E6D5A0]',
        accent: 'bg-[#FDF6D0]',
        value: 'yellow'
    },
    {
        bg: 'bg-[#F0F7FF]',
        border: 'border-[#D0E0FF]',
        dot: 'bg-[#A0C4FF]',
        accent: 'bg-[#E1EFFF]',
        value: 'blue'
    },
    {
        bg: 'bg-[#F2FFF5]',
        border: 'border-[#D0F0D8]',
        dot: 'bg-[#90D8A5]',
        accent: 'bg-[#E5F9EB]',
        value: 'green'
    },
    {
        bg: 'bg-[#FFF0F6]',
        border: 'border-[#FFD0E0]',
        dot: 'bg-[#FFA0C4]',
        accent: 'bg-[#FFEBF2]',
        value: 'pink'
    },
    {
        bg: 'bg-[#F8F2FF]',
        border: 'border-[#E8D8FF]',
        dot: 'bg-[#C4A0FF]',
        accent: 'bg-[#F1E8FF]',
        value: 'purple'
    },
];

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
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all active:scale-90"
    >
        {children}
    </button>
);

export const StickyNoteNode = ({ id, data }: NodeProps) => {
    const { updateNodeData } = useWorkforceStore();
    const [isEditing, setIsEditing] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);

    const colorKey = (data as any)?.stickyNoteColor || 'yellow';
    const colorStyle = NOTE_COLORS.find(c => c.value === colorKey) || NOTE_COLORS[0];
    const content = (data as any)?.stickyNoteContent || '';

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            UnderlineExtension,
        ],
        content: sanitizeContent(content),
        editable: false, // Initial state
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            updateNodeData(id, { stickyNoteContent: editor.getHTML() });
        },
    });

    useEffect(() => {
        if (!editor) return;
        editor.setEditable(isEditing);
        if (isEditing) {
            editor.commands.focus('end');
        }
    }, [editor, isEditing]);

    const handleNodeClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className={cn(
                "rounded-[24px] border border-white/50 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_15px_45px_-10px_rgba(0,0,0,0.1)] group transition-all duration-500 min-w-[240px] min-h-[120px] pointer-events-auto relative",
                colorStyle.bg,
                isEditing && "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] -translate-y-1 z-50 nodrag scale-[1.02]",
                (data as any)?.skipped && "opacity-40 grayscale pointer-events-none"
            )}
            style={{ width: '280px' }}
            onClick={handleNodeClick}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
        >
            {/* Outer premium border effect */}
            <div className={cn("absolute inset-0 rounded-[24px] border-2 opacity-50 pointer-events-none", colorStyle.border)} />

            {/* Subtle inner glow */}
            <div className="absolute inset-[1px] rounded-[23px] border border-white/40 pointer-events-none" />

            {/* Folder-like accent */}
            <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none rounded-tr-[24px] rounded-bl-[100px]", colorStyle.dot)} />

            {/* Formatting toolbar */}
            {isEditing && editor && (
                <div
                    ref={toolbarRef}
                    className="absolute -top-12 left-0 right-0 bg-white rounded-xl shadow-md border border-zinc-200 p-1.5 flex items-center gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 nodrag nopan"
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div className="relative">
                        <div
                            className={cn("h-5 w-5 rounded-full mx-1 cursor-pointer transition-transform hover:scale-110", colorStyle.dot)}
                            onMouseDown={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowColorPicker(p => !p);
                            }}
                        />
                        {showColorPicker && (
                            <div className="absolute top-8 left-0 bg-white rounded-xl shadow-xl border border-zinc-200 p-2 flex gap-1.5 z-[60] nodrag nopan">
                                {NOTE_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onMouseDown={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            updateNodeData(id, { stickyNoteColor: c.value });
                                            setShowColorPicker(false);
                                        }}
                                        className={cn("h-6 w-6 rounded-full border-2", c.dot, colorKey === c.value ? "border-zinc-800 scale-110" : "border-transparent")}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-zinc-200" />

                    <ToolbarButton title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
                        <Bold className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
                        <Italic className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
                        <Underline className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-4 bg-zinc-200" />

                    <ToolbarButton title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>
                        <List className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton title="Ordered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                        <ListOrdered className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-4 bg-zinc-200" />

                    <ToolbarButton title="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                        <Heading1 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton title="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                        <Heading2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton title="H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                        <Heading3 className="h-4 w-4" />
                    </ToolbarButton>
                </div>
            )}

            <div className="relative p-3 pointer-events-auto">
                <div
                    className="nodrag nopan text-[13px] text-zinc-700 min-h-[60px] cursor-text leading-relaxed prose prose-sm max-w-none border-none outline-none tiptap sticky-note-editor"
                    onClick={() => { if (!isEditing) setIsEditing(true); }}
                >
                    {editor ? (
                        <EditorContent
                            editor={editor}
                            className="min-h-[60px] focus:outline-none border-none outline-none"
                            onBlur={(e) => {
                                // If focus moves to something inside this component (like the toolbar), don't close.
                                if (toolbarRef.current?.contains(e.relatedTarget as Node)) {
                                    return;
                                }
                                // Small timeout to allow potential clicks to settle
                                setTimeout(() => setIsEditing(false), 200);
                            }}
                        />
                    ) : (
                        <span className="text-zinc-400 italic">Enter a note...</span>
                    )}
                </div>

                {!isEditing && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <NodeContextMenu nodeId={id} />
                    </div>
                )}
            </div>
        </div>
    );
};

StickyNoteNode.displayName = 'StickyNoteNode';