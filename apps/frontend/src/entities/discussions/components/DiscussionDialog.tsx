'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DiscussionForm } from './DiscussionForm';
import { useDiscussions } from '@/entities/discussions/hooks/useDiscussions';
import { PostTopic, PostType } from '@agentflox/database/src/generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface DiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  teamId?: string;
  onCreated?: () => void;
}

export function DiscussionDialog({ open, onOpenChange, projectId, teamId, onCreated }: DiscussionDialogProps) {
  const feedType: 'global' | 'project' | 'team' = projectId ? 'project' : teamId ? 'team' : 'global';
  const feedId = projectId || teamId;
  const { createPost } = useDiscussions(feedType, feedId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({
    title,
    content,
    topic,
    tags = []
  }: {
    title: string
    content: string
    topic?: PostTopic
    tags?: string[]
  }) => {
    if (!title.trim() || !content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createPost.mutateAsync({
        id: uuidv4(),
        topic: topic,
        tags,
        title: title.trim(),
        content: content.trim(),
        ...(projectId ? { projectId } : {}),
        ...(teamId ? { teamId } : {}),
        type: PostType.DISCUSSION
      } as any);
      onCreated?.();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Create discussion</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <DiscussionForm
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            placeholder="Start a new discussion..."
            autoFocus
            feedType={feedType}
            feedId={feedId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}


