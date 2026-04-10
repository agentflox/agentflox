"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DescriptionEditor } from '@/entities/shared/components/DescriptionEditor';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface InstructionsTabProps {
  agentId: string;
  systemPrompt: string | null | undefined;
  isReconfiguring: boolean;
  onUpdate?: () => void;
}

export function InstructionsTab({ 
  agentId, 
  systemPrompt, 
  isReconfiguring,
  onUpdate 
}: InstructionsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(systemPrompt || '');
  const containerRef = useRef<HTMLDivElement>(null);

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Instructions updated successfully');
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update instructions');
    },
  });

  const handleSave = useCallback(() => {
    if (editedPrompt === systemPrompt) {
        setIsEditing(false);
        return;
    }
    updateMutation.mutate({
      id: agentId,
      systemPrompt: editedPrompt,
    });
  }, [editedPrompt, systemPrompt, agentId, updateMutation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isEditing && containerRef.current && !containerRef.current.contains(target)) {
        const isPopup = document.querySelector('[data-radix-popper-content-wrapper]')?.contains(target) || 
                        document.querySelector('.tippy-box')?.contains(target) ||
                        (target as Element).closest?.('.bubble-menu');
        if (!isPopup) {
            handleSave();
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, handleSave]);

  return (
    <div ref={containerRef} className="pt-2">
      {isEditing ? (
        <div className="border border-indigo-200 ring-4 ring-indigo-50 rounded-xl shadow-sm overflow-hidden bg-white transition-all -mx-2">
          <div className="p-4">
            <DescriptionEditor
              content={editedPrompt}
              onChange={(content) => setEditedPrompt(content)}
              editable={!updateMutation.isPending && !isReconfiguring}
            />
          </div>
        </div>
      ) : (
        <div 
          className="cursor-text group rounded-xl border border-transparent hover:border-zinc-200 hover:bg-zinc-50/50 p-2 transition-colors relative -mx-2"
          onClick={() => setIsEditing(true)}
        >
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <span className="text-[11px] font-semibold text-zinc-500 bg-white shadow-sm border border-zinc-200 px-2 py-1 rounded-md">Click to edit</span>
          </div>
          {!systemPrompt || systemPrompt.trim() === '' ? (
              <p className="text-zinc-400 text-sm italic">Click to write instructions for this agent...</p>
          ) : (
            <div 
              className="prose prose-sm max-w-none dark:prose-invert w-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: systemPrompt }}
            />
          )}
        </div>
      )}
    </div>
  );
}

