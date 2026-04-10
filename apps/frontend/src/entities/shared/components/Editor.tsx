"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit as Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table/row";
import { TableCell } from "@tiptap/extension-table/cell";
import { TableHeader } from "@tiptap/extension-table/header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import './editor.css';

interface EditorProps {
  documentId?: string;
  agentId?: string;
  initialContent: string;
  editable?: boolean;
  onContentChange?: (content: string) => void;
  editorClassName?: string;
}

export function Editor({
  documentId,
  agentId,
  initialContent,
  editable = true,
  onContentChange,
  editorClassName,
}: EditorProps) {
  const utils = trpc.useUtils();
  const timeoutRef = useRef<NodeJS.Timeout>();

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
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing or type / for commands...",
      }),
      Image.configure({ inline: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Table.configure({ table: { resizable: true } }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: initialContent || "",
    editable,
    editorProps: {
      attributes: {
        class:
          editorClassName ||
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert focus:outline-none max-w-none min-h-[500px] px-4 py-4",
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onContentChange?.(content);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (documentId) {
          updateDocument.mutate({ id: documentId, content });
        } else if (agentId) {
          updateAgent.mutate({ id: agentId, systemPrompt: content });
        }
      }, 2000);
    },
  });

  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  // Track active formatting states efficiently via useEditorState
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
    <div className="flex flex-col h-full">
      {editable && (
        <BubbleMenu editor={editor} options={{ placement: "top", offset: 8, flip: true }}>
          <div className="bubble-menu">
            {/* Inline marks */}
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().toggleBold()}
              className={isBold ? "bg-muted" : ""}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().toggleItalic()}
              className={isItalic ? "bg-muted" : ""}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().toggleStrike()}
              className={isStrike ? "bg-muted" : ""}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              disabled={!editor.can().toggleCode()}
              className={isCode ? "bg-muted" : ""}
            >
              <Code className="h-3.5 w-3.5" />
            </Button>

            <Sep />

            {/* Lists */}
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

            {/* Block-level */}
            <Button
              variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={isBlockquote ? "bg-muted" : ""}
            >
              <Quote className="h-3.5 w-3.5" />
            </Button>

            <Sep />

            {/* Insert */}
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

            {/* History */}
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

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}