"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DescriptionEditor } from "@/entities/shared/components/DescriptionEditor";
import { X } from "lucide-react";

interface PostEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: any; // The post message object
  onSave: (title: string, content: string) => Promise<void>;
}

export function PostEditModal({ isOpen, onClose, message, onSave }: PostEditModalProps) {
  const [title, setTitle] = useState(message.title || "");
  const [content, setContent] = useState(message.content || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) return;
    setIsSaving(true);
    try {
      await onSave(title, content);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const modalRoot = typeof document !== 'undefined' ? document.getElementById("channel-post-modal-root") : null;

  const modalContent = (
    <>
      {/* Backdrop — absolute so it fills only the message container */}
      <div
        className="absolute inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Modal card — centered inside the container */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[700px] flex flex-col bg-white rounded-xl shadow-2xl border-0 overflow-hidden max-h-[85%] py-2"
          onClick={(e) => e.stopPropagation()}
        >

          {/* Scrollable Content Area */}
          <div className="flex-col overflow-y-auto">
            {/* Title Input */}
            <div className="px-12 pb-2">
              <Input
                variant="ghost"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post topic"
                className="w-full border-0 h-9 shadow-none text-md font-normal px-0 rounded-none focus:outline-none focus:ring-0 focus-visible:ring-0"
              />
            </div>

            {/* Editor Area */}
            <div className="px-4 pb-2 min-h-[300px]">
              <DescriptionEditor
                content={content}
                onChange={setContent}
                editable={true}
                minHeight={250}
              />
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-end p-3 border-t border-slate-100 bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="text-slate-600 bg-white border border-zinc-200 hover:text-slate-900 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || (!content.trim() && !title.trim())}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 h-9"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (modalRoot) {
    return createPortal(modalContent, modalRoot);
  }

  // Fallback if portal root not found
  return modalContent;
}
