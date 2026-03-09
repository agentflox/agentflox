"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, X } from 'lucide-react';
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

  const handleSave = () => {
    if (!editedPrompt.trim()) {
      toast.error('Instructions cannot be empty');
      return;
    }
    updateMutation.mutate({
      id: agentId,
      systemPrompt: editedPrompt,
    });
  };

  const handleCancel = () => {
    setEditedPrompt(systemPrompt || '');
    setIsEditing(false);
  };

  // Parse and render rich text with mentions, links, tags, etc.
  const renderRichText = (text: string) => {
    if (!text) return <p className="text-muted-foreground">No instructions provided</p>;

    // Split by newlines to preserve structure
    const lines = text.split('\n');
    
    return (
      <div className="space-y-3 text-sm leading-relaxed">
        {lines.map((line, index) => {
          if (!line.trim()) return <br key={index} />;
          
          // Check for numbered lists
          const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
          if (numberedMatch) {
            return (
              <div key={index} className="flex gap-3">
                <span className="text-muted-foreground font-medium">{numberedMatch[1]}.</span>
                <div className="flex-1">
                  {renderInlineContent(numberedMatch[2])}
                </div>
              </div>
            );
          }

          // Check for bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
            const content = line.trim().substring(2);
            return (
              <div key={index} className="flex gap-3">
                <span className="text-muted-foreground">•</span>
                <div className="flex-1">
                  {renderInlineContent(content)}
                </div>
              </div>
            );
          }

          // Regular paragraph
          return (
            <p key={index} className="text-foreground">
              {renderInlineContent(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Match mentions (@username)
    const mentionRegex = /@(\w+)/g;
    // Match links (http://, https://)
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    // Match tags (#tag)
    const tagRegex = /#(\w+)/g;
    // Match bold (**text**)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    // Match italic (*text*)
    const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;

    const allMatches: Array<{ type: string; match: RegExpMatchArray; index: number }> = [];

    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      allMatches.push({ type: 'mention', match, index: match.index });
    }
    while ((match = linkRegex.exec(text)) !== null) {
      allMatches.push({ type: 'link', match, index: match.index });
    }
    while ((match = tagRegex.exec(text)) !== null) {
      allMatches.push({ type: 'tag', match, index: match.index });
    }
    while ((match = boldRegex.exec(text)) !== null) {
      allMatches.push({ type: 'bold', match, index: match.index });
    }
    while ((match = italicRegex.exec(text)) !== null) {
      allMatches.push({ type: 'italic', match, index: match.index });
    }

    // Sort by index
    allMatches.sort((a, b) => a.index - b.index);

    allMatches.forEach(({ type, match, index }) => {
      // Add text before match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }

      // Add the matched element
      switch (type) {
        case 'mention':
          parts.push(
            <span key={`mention-${index}`} className="text-primary font-medium">
              @{match[1]}
            </span>
          );
          break;
        case 'link':
          parts.push(
            <a
              key={`link-${index}`}
              href={match[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {match[0]}
            </a>
          );
          break;
        case 'tag':
          parts.push(
            <span key={`tag-${index}`} className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
              #{match[1]}
            </span>
          );
          break;
        case 'bold':
          parts.push(
            <strong key={`bold-${index}`} className="font-semibold">
              {match[1]}
            </strong>
          );
          break;
        case 'italic':
          parts.push(
            <em key={`italic-${index}`} className="italic">
              {match[1]}
            </em>
          );
          break;
      }

      lastIndex = index + match[0].length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Write your instructions here. Type [checkbox] to specify tools or [@] to mention items."
                className="min-h-[400px] font-mono text-sm"
                disabled={updateMutation.isPending || isReconfiguring}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Write instructions here. Type <span className="font-mono">[checkbox]</span> to specify tools or <span className="font-mono">[@]</span> to mention items.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateMutation.isPending}
                    className="text-sm py-2 px-4"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending || isReconfiguring}
                    className="text-sm py-2 px-4"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {renderRichText(systemPrompt || '')}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

