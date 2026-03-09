"use client";

import { trpc } from "@/lib/trpc";
import { FileText, Plus, ChevronRight, ChevronDown, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DocumentsSidebarProps {
  currentDocId?: string;
  workspaceId?: string;
}

export function DocumentsSidebar({ currentDocId, workspaceId }: DocumentsSidebarProps) {
  const router = useRouter();
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  const { data: documents } = trpc.document.list.useQuery({
    workspaceId,
    parentId: null,
    isArchived: false,
  });

  const createDocument = trpc.document.create.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/docs/${data.id}`);
    },
  });

  const toggleExpand = (docId: string) => {
    setExpandedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleCreateDocument = () => {
    createDocument.mutate({
      workspaceId: workspaceId || "default",
      title: "Untitled Document",
      content: "",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Documents</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateDocument}
            disabled={createDocument.isPending}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-2">
        {documents?.items.map((doc) => (
          <DocumentItem
            key={doc.id}
            doc={doc}
            currentDocId={currentDocId}
            isExpanded={expandedDocs.has(doc.id)}
            onToggleExpand={() => toggleExpand(doc.id)}
            onNavigate={(id) => router.push(`/dashboard/docs/${id}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface DocumentItemProps {
  doc: any;
  currentDocId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (id: string) => void;
  level?: number;
}

function DocumentItem({
  doc,
  currentDocId,
  isExpanded,
  onToggleExpand,
  onNavigate,
  level = 0,
}: DocumentItemProps) {
  const hasChildren = doc.children && doc.children.length > 0;
  const isActive = doc.id === currentDocId;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors ${
          isActive ? "bg-accent font-medium" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="hover:bg-muted rounded p-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}

        <div
          onClick={() => onNavigate(doc.id)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {doc.icon ? (
            <span className="text-sm">{doc.icon}</span>
          ) : hasChildren ? (
            <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{doc.title}</span>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {doc.children.map((child: any) => (
            <DocumentItem
              key={child.id}
              doc={child}
              currentDocId={currentDocId}
              isExpanded={false}
              onToggleExpand={() => {}}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
