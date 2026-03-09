"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ChatCreationModal({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreate: (title: string, topic?: string, description?: string) => Promise<void> | void;
  isCreating?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    await onCreate(title.trim(), topic.trim() || undefined, description.trim() || undefined);
    setTitle("");
    setTopic("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create chat</DialogTitle>
          <DialogDescription>Start a new workspace chat.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chat-title">Title</Label>
            <Input id="chat-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sprint planning" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-topic">Topic (optional)</Label>
            <Input id="chat-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What this chat is about" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-description">Description (optional)</Label>
            <Textarea id="chat-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more context for this chat" rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || isCreating}>Create chat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ChatCreationModal;

