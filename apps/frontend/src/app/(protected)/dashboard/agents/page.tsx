"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Plus, Bot, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { Pagination } from "@/components/ui/pagination";

export default function AgentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const handleCreateAgent = () => {
    router.push('/dashboard/agents/create');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const { data, isLoading, isFetching, refetch } = trpc.agent.list.useQuery({
    query: searchQuery || undefined,
    status: statusFilter !== "all" ? [statusFilter as any] : undefined,
    agentType: typeFilter !== "all" ? [typeFilter as any] : undefined,
    includeRelations: true,
    page,
    pageSize,
  });

  const deleteAgent = trpc.agent.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });


  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader
          title="AI Agents"
          description="Create and manage autonomous AI agents"
          actions={
            <Button onClick={handleCreateAgent}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          }
        />

        <SearchSection
          searchValue={searchQuery}
          searchPlaceholder="Search agents..."
          resultsCount={data?.total ?? 0}
          onSearchChange={handleSearchChange}
          onSearchSubmit={() => { }}
          onCreateNew={handleCreateAgent}
          createButtonText="Create Agent"
          showFilters={false}
          showSort={false}
        >
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="TASK_EXECUTOR">Task Executor</SelectItem>
              <SelectItem value="WORKFLOW_MANAGER">Workflow Manager</SelectItem>
              <SelectItem value="DATA_ANALYST">Data Analyst</SelectItem>
              <SelectItem value="CODE_GENERATOR">Code Generator</SelectItem>
              <SelectItem value="CONTENT_CREATOR">Content Creator</SelectItem>
              <SelectItem value="GENERAL_ASSISTANT">General Assistant</SelectItem>
            </SelectContent>
          </Select>
        </SearchSection>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <EmptyState
            title="No agents found"
            message={
              searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first AI agent"
            }
            actionButton={
              <Button onClick={handleCreateAgent}>
                <Plus className="h-4 w-4 mr-2" />
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.items.map((agent) => (
              <Card
                key={agent.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{agent.avatar || "🤖"}</div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {agent.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{agent.agentType}</Badge>
                      <Badge
                        variant={
                          agent.status === "ACTIVE"
                            ? "default"
                            : agent.status === "DRAFT"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    {'_count' in agent && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {(agent as any)._count?.executions || 0} executions
                        </span>
                        <span>
                          {(agent as any)._count?.tasks || 0} tasks
                        </span>
                      </div>
                    )}
                    {agent.tags && agent.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {agent.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {agent.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{agent.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > data.pageSize && (
          <div className="mt-8">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(data.total / data.pageSize)}
              hasNextPage={page * data.pageSize < data.total}
              hasPreviousPage={page > 1}
              onPageChange={setPage}
              isLoading={isLoading || isFetching}
            />
          </div>
        )}
      </div>
    </Shell>
  );
}

