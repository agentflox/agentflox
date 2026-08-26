"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Sparkles,
  Zap,
  Bot,
  Workflow,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  PenSquare,
  Trash2,
  Copy,
  Eye,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { LazyDataTable as DataTable } from "@/components/ui/lazy-data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { UsageQuotaBanner } from "@/features/usage/components/UsageQuotaBanner";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import {
  SkillCard,
  SkillDetailModal,
  SkillCreationModal,
  useSkillList,
  SkillScope,
  SkillSummary,
} from "@/entities/skills";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SkillsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  const urlViewMode = (searchParams.get("view") === "list" ? "list" : "grid") as "grid" | "list";
  const [viewMode, setViewMode] = useState<"grid" | "list">(urlViewMode);

  const initialPage = useMemo(() => {
    const p = searchParams.get("page");
    const num = p ? parseInt(p, 10) : 1;
    return isNaN(num) || num < 1 ? 1 : num;
  }, [searchParams]);

  const initialPageSize = useMemo(() => {
    const ps = searchParams.get("pageSize");
    const fallback = urlViewMode === "grid" ? 12 : 10;
    const num = ps ? parseInt(ps, 10) : fallback;
    return isNaN(num) || num < 1 ? fallback : num;
  }, [searchParams, urlViewMode]);

  const initialQuery = searchParams.get("q") || "";
  const initialScope = (searchParams.get("scope") as SkillScope) || "all";
  const initialCategory = searchParams.get("category") || "all";

  const {
    items,
    isLoading,
    isFetching,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total,
    query,
    setQuery,
    scope,
    setScope,
    category,
    setCategory,
    categories,
    stats,
    builtInCount,
    ownedCount,
  } = useSkillList({
    initialScope,
    initialCategory,
    initialPage,
    pageSize: initialPageSize,
    syncWithUrl: true,
  });

  // Modal states
  const [creationModalOpen, setCreationModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillSummary | null>(null);
  const [skillToEdit, setSkillToEdit] = useState<SkillSummary | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedGridIds, setSelectedGridIds] = useState<Set<string>>(new Set());

  // Mutations
  const deleteMutation = trpc.skill.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Skill deleted successfully" });
      utils.skill.list.invalidate();
      utils.skill.categories.invalidate();
      utils.skill.stats.invalidate();
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast({ title: "Failed to delete skill", description: err.message, variant: "destructive" });
    },
  });

  const duplicateMutation = trpc.skill.duplicate.useMutation({
    onSuccess: () => {
      toast({ title: "Skill duplicated to your custom skills!" });
      utils.skill.list.invalidate();
      utils.skill.categories.invalidate();
      utils.skill.stats.invalidate();
      setScope("custom");
    },
    onError: (err) => {
      toast({ title: "Failed to duplicate skill", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenDetail = (skill: SkillSummary) => {
    setSelectedSkill(skill);
    setDetailModalOpen(true);
  };

  const handleEditSkill = (skill: SkillSummary) => {
    setSkillToEdit(skill);
    setCreationModalOpen(true);
  };

  const handleDeletePrompt = (skill: SkillSummary) => {
    setDeleteTarget({ id: skill.id, name: skill.displayName || skill.name });
    setDeleteModalOpen(true);
  };

  const handleDuplicateSkill = (skill: SkillSummary) => {
    duplicateMutation.mutate({ id: skill.id });
  };

  const handleCreateNew = () => {
    setSkillToEdit(null);
    setCreationModalOpen(true);
  };

  const handleSelectGridItem = (id: string, selected: boolean) => {
    setSelectedGridIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Table Columns Definition for List View
  const columns: ColumnDef<SkillSummary>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "displayName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Skill Name" />,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => handleOpenDetail(item)}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg shadow-xs transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: item.color ? `${item.color}15` : undefined,
                  borderColor: item.color ? `${item.color}35` : undefined,
                }}
              >
                {item.icon || "⚡"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {item.displayName || item.name}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    v{item.version || "1.0.0"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-sm">
                  {item.description || item.schema?.purpose || item.name}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        cell: ({ row }) => {
          const cat = row.original.category || "custom";
          return (
            <Badge variant="secondary" className="capitalize text-xs font-medium">
              {cat}
            </Badge>
          );
        },
      },
      {
        id: "capabilities",
        header: "Capabilities",
        cell: ({ row }) => {
          const schema = row.original.schema;
          const stepsCount = Array.isArray(schema?.workflow) ? schema.workflow.length : 0;
          const triggersCount = schema?.triggerExamples?.length || 0;
          return (
            <div className="flex items-center gap-2">
              {stepsCount > 0 && (
                <Badge variant="outline" className="text-[11px] gap-1 px-2 py-0.5 text-muted-foreground">
                  <Workflow className="h-3 w-3" />
                  {stepsCount} steps
                </Badge>
              )}
              {triggersCount > 0 && (
                <Badge variant="outline" className="text-[11px] gap-1 px-2 py-0.5 text-muted-foreground">
                  <Layers className="h-3 w-3" />
                  {triggersCount} triggers
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "isBuiltIn",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Origin" />,
        cell: ({ row }) => {
          const isBuiltIn = row.original.isBuiltIn;
          const owner = row.original.owner;
          if (isBuiltIn) {
            return (
              <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                Built-in
              </Badge>
            );
          }
          return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="h-4 w-4">
                <AvatarImage src={owner?.image || owner?.avatar || undefined} />
                <AvatarFallback className="text-[9px]">
                  {owner?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{owner?.name || "Custom"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenDetail(item)}>
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicateSkill(item)}>
                  <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                  Duplicate
                </DropdownMenuItem>
                {!item.isBuiltIn && (
                  <>
                    <DropdownMenuItem onClick={() => handleEditSkill(item)}>
                      <PenSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeletePrompt(item)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  return (
    <Shell>
      <div className="flex flex-col space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          title="AI Skills"
          description="Explore built-in capabilities and compose custom modular skills for your autonomous agents and workflows."
        >
          <div className="flex items-center gap-3">
            <Button onClick={handleCreateNew} className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              Create Skill
            </Button>
          </div>
        </PageHeader>
        {/* Stats Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Skills</span>
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.total ?? builtInCount + ownedCount}
            </div>
            <p className="text-[11px] text-muted-foreground">Active capabilities available</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Built-in Core</span>
              <Sparkles className="h-4 w-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {builtInCount}
            </div>
            <p className="text-[11px] text-muted-foreground">System-verified skills</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Custom Skills</span>
              <Bot className="h-4 w-4 text-violet-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {ownedCount}
            </div>
            <p className="text-[11px] text-muted-foreground">User-authored skills</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Categories</span>
              <Workflow className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {categories.length || 5}
            </div>
            <p className="text-[11px] text-muted-foreground">Domain specializations</p>
          </div>
        </div>

        {/* Scope Tabs & Search Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
            {/* Scope Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60">
              <button
                type="button"
                onClick={() => {
                  setScope("all");
                  setPage(1);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                  scope === "all"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Skills ({builtInCount + ownedCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope("builtIn");
                  setPage(1);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all gap-1.5 inline-flex items-center",
                  scope === "builtIn"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="h-3 w-3 text-sky-500" />
                Built-in ({builtInCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope("custom");
                  setPage(1);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all gap-1.5 inline-flex items-center",
                  scope === "custom"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Bot className="h-3 w-3 text-violet-500" />
                Custom ({ownedCount})
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
              <Button
                variant={category === "all" ? "primary" : "outline"}
                size="sm"
                className="h-8 text-xs rounded-lg px-3"
                onClick={() => {
                  setCategory("all");
                  setPage(1);
                }}
              >
                All Domains
              </Button>
              {categories.map((c) => (
                <Button
                  key={c.category}
                  variant={category === c.category ? "primary" : "outline"}
                  size="sm"
                  className="h-8 text-xs rounded-lg px-3 capitalize gap-1.5"
                  onClick={() => {
                    setCategory(c.category);
                    setPage(1);
                  }}
                >
                  {c.category}
                  <span className="opacity-70 text-[10px]">({c.count})</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Search & View Mode Bar */}
          <SearchSection
            query={query}
            onQueryChange={(val) => {
              setQuery(val);
              setPage(1);
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            placeholder="Search skills by name, description, tags, workflow..."
          />
        </div>

        {/* Content Section */}
        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl border border-border/60 bg-card p-5 animate-pulse space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-4 bg-muted rounded" />
                    <div className="h-5 w-16 bg-muted rounded-full" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 bg-muted rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-5/6 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DataTableSkeleton columns={6} rows={8} />
          )
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 text-2xl">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-foreground">No AI Skills Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1.5 mb-6">
              {query
                ? `No skills match "${query}". Try adjusting your keywords or active scope filters.`
                : scope === "custom"
                  ? "You haven't created any custom skills yet. Author a custom skill or duplicate a built-in skill to get started."
                  : "No skills are currently available in this category."}
            </p>
            <div className="flex items-center gap-3">
              {query && (
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  Clear Search
                </Button>
              )}
              <Button size="sm" onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Custom Skill
              </Button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((skill) => (
              <SkillCard
                key={skill.id}
                item={skill}
                onOpen={handleOpenDetail}
                onEdit={handleEditSkill}
                onDelete={handleDeletePrompt}
                onDuplicate={handleDuplicateSkill}
                isSelected={selectedGridIds.has(skill.id)}
                onSelect={handleSelectGridItem}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <DataTable
              columns={columns}
              data={items}
            />
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pt-4 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              hasNextPage={page < totalPages}
              hasPreviousPage={page > 1}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <SkillDetailModal
        skill={selectedSkill}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onEdit={handleEditSkill}
        onDuplicate={handleDuplicateSkill}
      />

      {/* Creation / Edit Modal */}
      <SkillCreationModal
        open={creationModalOpen}
        onOpenChange={setCreationModalOpen}
        skillToEdit={skillToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ id: deleteTarget.id });
          }
        }}
        title="Delete AI Skill"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </Shell>
  );
}
