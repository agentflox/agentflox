"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc";
import { DocsLayout } from "@/features/documents/components/DocsLayout";
import { DocumentsSidebar } from "@/features/documents/components/DocumentsSidebar";
import { DocumentEditor } from "@/features/documents/components/DocumentEditor";
import { DocumentActionsMenu } from "@/features/documents/components/DocumentActionsMenu";
import { DocumentErrorBoundary } from "@/features/documents/components/DocumentErrorBoundary";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ docId: string }>;
}

export default function DocumentPage({ params }: PageProps) {
  const { docId } = use(params);
  const [title, setTitle] = useState("");
  const debouncedTitle = useDebounce(title, 1000);

  const { data: document, isLoading } = trpc.document.get.useQuery({ id: docId });

  const updateDocument = trpc.document.update.useMutation();

  useEffect(() => {
    if (document) {
      setTitle(document.title);
    }
  }, [document]);

  useEffect(() => {
    if (debouncedTitle && document && debouncedTitle !== document.title) {
      updateDocument.mutate({
        id: docId,
        title: debouncedTitle,
      });
    }
  }, [debouncedTitle]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Document not found</h1>
          <p className="text-muted-foreground">
            The document you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DocumentErrorBoundary>
      <DocsLayout
        documentTitle={document.title}
        actions={
          <DocumentActionsMenu
            documentId={docId}
            documentTitle={document.title}
            documentContent={document.content}
            isPublished={document.isPublished}
            isArchived={document.isArchived}
          />
        }
        sidebar={
          <DocumentsSidebar
            currentDocId={docId}
            workspaceId={document.workspaceId}
          />
        }
      >
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Document Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Document"
          className="text-4xl font-bold border-none focus-visible:ring-0 px-0 mb-8"
        />

        {/* Document Editor */}
        <DocumentEditor
          documentId={docId}
          initialContent={document.content}
          editable={true}
        />
      </div>
      </DocsLayout>
    </DocumentErrorBoundary>
  );
}
