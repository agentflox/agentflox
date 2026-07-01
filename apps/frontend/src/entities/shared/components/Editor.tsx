"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import FileHandler from '@tiptap/extension-file-handler';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Mention from '@tiptap/extension-mention';
import Color from '@tiptap/extension-color';
import { TextStyleKit as TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Youtube from '@tiptap/extension-youtube';
import { Selection } from '@tiptap/extensions';
import { SlashCommand } from './SlashCommand';
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import DragHandle from '@tiptap/extension-drag-handle-react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  GripHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import './editor.css';

interface EditorProps {
  documentId?: string;
  agentId?: string;
  initialContent: string;
  editable?: boolean;
  onContentChange?: (content: string) => void;
  editorClassName?: string;
  // Initial / floor height in px. The editor starts at this height and the
  // user can never resize below it. Defaults to 300.
  minHeight?: number;
  // Optional ceiling in px for manual resizing. If omitted, the user can
  // drag the resize handle to grow the editor without an upper bound.
  maxHeight?: number;
  // Set to false to hide the drag-to-resize handle entirely (fixed height
  // editors, e.g. comment boxes).
  resizable?: boolean;
  placeholder?: string;
}

export function Editor({
  documentId,
  agentId,
  initialContent,
  editable = true,
  onContentChange,
  editorClassName,
  minHeight = 300,
  maxHeight,
  resizable = true,
  placeholder = "Start writing or type / for commands...",
}: EditorProps) {
  const utils = trpc.useUtils();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const [height, setHeight] = useState(minHeight);
  const isResizing = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Keep the current height in sync if minHeight/maxHeight change after
  // mount (e.g. parent toggles a "compact" vs "expanded" layout), without
  // clobbering a height the user has manually dragged to, except where it
  // now falls outside the new bounds.
  useEffect(() => {
    setHeight((prev) => {
      let next = Math.max(prev, minHeight);
      if (maxHeight !== undefined) next = Math.min(next, maxHeight);
      return next;
    });
  }, [minHeight, maxHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const editorTop = editorRef.current?.getBoundingClientRect().top || 0;
    let newHeight = Math.max(minHeight, e.clientY - editorTop);
    if (maxHeight !== undefined) newHeight = Math.min(newHeight, maxHeight);
    setHeight(newHeight);
  }, [minHeight, maxHeight]);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "default";
  }, [handleMouseMove]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "ns-resize";
  }, [handleMouseMove, stopResizing]);

  // Clean up listeners if the component unmounts mid-drag.
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  const updateDocument = trpc.document.update.useMutation({
    onSuccess: () => {
      if (documentId) utils.document.get.invalidate({ id: documentId });
    },
  });

  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: () => {
      if (agentId) utils.agent.get.invalidate({ id: agentId });
    },
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline hover:text-blue-800" },
      }),
      TableKit.configure({
        table: { resizable: true },
      }),
      TaskList,
      BulletList,
      OrderedList,
      ListItem,
      Selection.configure({
        className: 'selection',
      }),
      TaskItem.configure({ nested: true }),
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
            if (htmlContent) return false;
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
        suggestion: {
          char: '@',
          render() {
            return {
              onStart(props) {
                const mention = (props.editor as any).storage?.mention;
                if (mention) {
                  mention.open('people', props.range);
                }
              },
              onExit() {
              },
              onKeyDown() {
                return false;
              },
            };
          },
        },
      }),
      SlashCommand,
    ],
    content: initialContent || "",
    editable,
    editorProps: {
      attributes: {
        class:
          editorClassName ||
          "prose prose-sm dark:prose-invert focus:outline-none max-w-none px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onContentChange?.(content);

      if (documentId || agentId) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (documentId) updateDocument.mutate({ id: documentId, content });
          if (agentId) updateAgent.mutate({ id: agentId, description: content });
        }, 1000);
      }
    },
  });

  const {
    isBold, isItalic, isStrike, isCode,
    isBulletList, isOrderedList, isTaskList,
    isBlockquote, canUndo, canRedo,
  } = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return {
        isBold: false, isItalic: false, isStrike: false, isCode: false,
        isBulletList: false, isOrderedList: false, isTaskList: false,
        isBlockquote: false, canUndo: false, canRedo: false,
      };
      return {
        isBold: ctx.editor.isActive("bold"),
        isItalic: ctx.editor.isActive("italic"),
        isStrike: ctx.editor.isActive("strike"),
        isCode: ctx.editor.isActive("code"),
        isBulletList: ctx.editor.isActive("bulletList"),
        isOrderedList: ctx.editor.isActive("orderedList"),
        isTaskList: ctx.editor.isActive("taskList"),
        isBlockquote: ctx.editor.isActive("blockquote"),
        canUndo: ctx.editor.can().undo(),
        canRedo: ctx.editor.can().redo(),
      };
    },
  });

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  const Sep = () => <div className="w-px h-4 bg-border mx-0.5 shrink-0" />;

  return (
    <div className="flex flex-col">
      {editable && (
        <BubbleMenu
          editor={editor}
          appendTo={() => document.body}
          options={{ placement: "top", offset: 8, flip: true }}
        >
          <div className="bubble-menu shadow-md border rounded-md bg-white flex items-center p-1" style={{ zIndex: 99999 }}>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={isBold ? "bg-muted" : ""}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={isItalic ? "bg-muted" : ""}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={isStrike ? "bg-muted" : ""}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={isCode ? "bg-muted" : ""}
            >
              <Code className="h-3.5 w-3.5" />
            </Button>

            <Sep />

            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={isBulletList ? "bg-muted" : ""}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={isOrderedList ? "bg-muted" : ""}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={isTaskList ? "bg-muted" : ""}
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </Button>

            <Sep />

            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={isBlockquote ? "bg-muted" : ""}
            >
              <Quote className="h-3.5 w-3.5" />
            </Button>

            <Sep />

            <Button variant="ghost" size="sm" onClick={setLink}>
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={addImage}>
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            >
              <TableIcon className="h-3.5 w-3.5" />
            </Button>

            <Sep />

            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!canUndo}
            >
              <Undo className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!canRedo}
            >
              <Redo className="h-3.5 w-3.5" />
            </Button>
          </div>
        </BubbleMenu>
      )}

      <div
        ref={editorRef}
        className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 rounded-md bg-white"
        style={{ height: `${height}px` }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Drag-to-resize handle. Clamped between minHeight and maxHeight. */}
      {resizable && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize editor"
          onMouseDown={startResizing}
          className={cn(
            "flex items-center justify-center h-3 cursor-ns-resize select-none group",
            "text-slate-300 hover:text-slate-500 transition-colors",
          )}
        >
          <GripHorizontal className="h-3.5 w-3.5" />
        </div>
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
    </div>
  );
}