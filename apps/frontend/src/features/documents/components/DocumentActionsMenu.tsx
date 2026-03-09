"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Share2,
  Download,
  Copy,
  Trash2,
  Archive,
  History,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { ShareDocumentModal } from "./ShareDocumentModal";
import { exportDocument, exportToPDF, ExportFormat } from "../utils/exportDocument";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DocumentActionsMenuProps {
  documentId: string;
  documentTitle: string;
  documentContent: string;
  isPublished: boolean;
  isArchived: boolean;
}

export function DocumentActionsMenu({
  documentId,
  documentTitle,
  documentContent,
  isPublished,
  isArchived,
}: DocumentActionsMenuProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const router = useRouter();
  const utils = trpc.useUtils();

  const updateDocument = trpc.document.update.useMutation({
    onSuccess: () => {
      utils.document.get.invalidate({ id: documentId });
    },
  });

  const archiveDocument = trpc.document.archive.useMutation({
    onSuccess: () => {
      toast.success(isArchived ? "Document restored" : "Document archived");
      utils.document.list.invalidate();
      utils.document.get.invalidate({ id: documentId });
    },
  });

  const deleteDocument = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      router.push("/dashboard/docs");
    },
  });

  const handleExport = (format: ExportFormat) => {
    exportDocument(documentTitle, documentContent, format);
  };

  const handlePublishToggle = () => {
    updateDocument.mutate({
      id: documentId,
      isPublished: !isPublished,
    });
    toast.success(isPublished ? "Document unpublished" : "Document published");
  };

  const handleArchive = () => {
    archiveDocument.mutate({
      id: documentId,
      isArchived: !isArchived,
    });
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      deleteDocument.mutate({ id: documentId });
    }
  };

  const handleDuplicate = () => {
    // Implementation for duplicating document
    toast.info("Duplicate feature coming soon");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handlePublishToggle}>
            {isPublished ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Publish
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => handleExport("markdown")}>
            <Download className="mr-2 h-4 w-4" />
            Export as Markdown
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleExport("html")}>
            <Download className="mr-2 h-4 w-4" />
            Export as HTML
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleExport("text")}>
            <Download className="mr-2 h-4 w-4" />
            Export as Text
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => exportToPDF(documentTitle, documentContent)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => router.push(`/dashboard/docs/${documentId}/history`)}>
            <History className="mr-2 h-4 w-4" />
            Version History
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="mr-2 h-4 w-4" />
            {isArchived ? "Restore" : "Archive"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareDocumentModal
        documentId={documentId}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </>
  );
}
