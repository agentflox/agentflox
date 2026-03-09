"use client";

import { useState } from "react";
import Shell from "@/components/layout/Shell";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";

export default function DocsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: documents, isLoading } = trpc.document.list.useQuery({
    query: searchQuery || undefined,
    parentId: null,
    isArchived: false,
  });

  const createDocument = trpc.document.create.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/docs/${data.id}`);
    },
  });

  const handleCreateDocument = () => {
    // For now, create with a default workspace - you can extend this to select workspace
    createDocument.mutate({
      workspaceId: "default", // Replace with actual workspace selection
      title: "Untitled Document",
      content: "",
    });
  };

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader
          title="Documents"
          description="Create and organize your documentation"
          actions={
            <Button onClick={handleCreateDocument} disabled={createDocument.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          }
        />

        <SearchSection
          searchValue={searchQuery}
          searchPlaceholder="Search documents..."
          resultsCount={documents?.items.length ?? 0}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => { }}
          onCreateNew={handleCreateDocument}
          createButtonText="New Document"
          showFilters={false}
          showSort={false}
        />

        {/* Documents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-lg border bg-muted"
              />
            ))}
          </div>
        ) : documents && documents.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.items.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/dashboard/docs/${doc.id}`)}
                className="group cursor-pointer rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {doc.icon ? (
                      <span className="text-2xl">{doc.icon}</span>
                    ) : (
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-primary">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Updated{" "}
                        {formatDistanceToNow(new Date(doc.updatedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {doc.children && doc.children.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Folder className="h-4 w-4" />
                    <span>{doc.children.length} sub-documents</span>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <img
                    src={doc.creator.avatar || "/default-avatar.png"}
                    alt={doc.creator.name || "User"}
                    className="h-6 w-6 rounded-full"
                  />
                  <span className="text-sm text-muted-foreground">
                    {doc.creator.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first document
            </p>
            <Button onClick={handleCreateDocument}>
              <Plus className="mr-2 h-4 w-4" />
              Create Document
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}
