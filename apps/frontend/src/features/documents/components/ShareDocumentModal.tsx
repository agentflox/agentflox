"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Copy, Link2, Mail, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareDocumentModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDocumentModal({
  documentId,
  isOpen,
  onClose,
}: ShareDocumentModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "COMMENT" | "EDIT" | "ADMIN">("VIEW");
  const [copied, setCopied] = useState(false);

  const { data: document } = trpc.document.get.useQuery(
    { id: documentId },
    { enabled: isOpen }
  );

  const addCollaborator = trpc.document.addCollaborator.useMutation({
    onSuccess: () => {
      toast.success("Collaborator added successfully");
      setEmail("");
      utils.document.get.invalidate({ id: documentId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add collaborator");
    },
  });

  const removeCollaborator = trpc.document.removeCollaborator.useMutation({
    onSuccess: () => {
      toast.success("Collaborator removed");
      utils.document.get.invalidate({ id: documentId });
    },
  });

  const utils = trpc.useUtils();

  const shareLink = `${window.location.origin}/dashboard/docs/${documentId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCollaborator = () => {
    if (!email) return;

    // In a real implementation, you'd fetch the user by email first
    addCollaborator.mutate({
      documentId,
      userId: email, // This should be the actual user ID
      permission,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Invite others to collaborate on this document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="flex-1" />
              <Button onClick={handleCopyLink} variant="outline">
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Add Collaborator */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add People</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select
                value={permission}
                onValueChange={(value: any) => setPermission(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEW">View</SelectItem>
                  <SelectItem value="COMMENT">Comment</SelectItem>
                  <SelectItem value="EDIT">Edit</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddCollaborator}
                disabled={!email || addCollaborator.isPending}
              >
                <Mail className="mr-2 h-4 w-4" />
                Invite
              </Button>
            </div>
          </div>

          {/* Collaborators List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">People with access</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Document Creator */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <img
                      src={document?.creator.avatar || "/default-avatar.png"}
                      alt={document?.creator.name || "User"}
                    />
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {document?.creator.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {document?.creator.email}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Owner</span>
              </div>

              {/* Collaborators */}
              {document?.collaborators?.map((collab: any) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <img
                        src={collab.user.avatar || "/default-avatar.png"}
                        alt={collab.user.name || "User"}
                      />
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{collab.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {collab.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {collab.permission}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        removeCollaborator.mutate({
                          documentId,
                          userId: collab.userId,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
