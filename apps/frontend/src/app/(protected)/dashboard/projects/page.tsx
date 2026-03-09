"use client";
import { Plus, X } from "lucide-react";
import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import ProjectCard from "@/entities/projects/components/ProjectCard";
import ProjectFilterSidebar from "@/entities/projects/components/ProjectFilterSidebar";
import { Pagination } from "@/components/ui/pagination";
import { useProjectList } from "@/entities/projects/hooks/useProjectList";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";

import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Filter, Tag } from "lucide-react";
import { INDUSTRY_OPTIONS } from "@/constants/shares";

export default function ProjectsPage() {
	const router = useRouter();
	const {
		data,
		isLoading,
		isFetching,
		page,
		pageSize,
		setPage,
		query,
		setQuery,
		scope,
		setScope,
		filters,
		setFilters,
	} = useProjectList();


	const hasNextPage = (data?.items?.length || 0) === pageSize;
	const hasPreviousPage = page > 1;
	const [showCreateModal, setShowCreateModal] = useState(false);

	const chips = useMemo(() => {
		const result: Array<{ id: string; label: string; onRemove: () => void }> = [];
		if (query) result.push({ id: "q", label: `q: ${query}`, onRemove: () => setQuery("") });
		(filters.industries || []).forEach((ind: string) => {
			result.push({ id: `ind-${ind}`, label: ind, onRemove: () => setFilters((f: any) => ({ ...f, industries: (f.industries || []).filter((x: string) => x !== ind) })) });
		});
		if ((filters as any).status) result.push({ id: "status", label: `status: ${(filters as any).status}`, onRemove: () => setFilters((f: any) => ({ ...f, status: "" as any })) });
		return result;
	}, [query, filters, setFilters, setQuery]);

	const clearAll = () => {
		setQuery("");
		setFilters((f: any) => ({ ...f, industries: [], status: "" as any }));
	};

	const handleOpen = (id: string) => {
		if (!id) return;
		router.push(DASHBOARD_ROUTES.PROJECT(id));
	};

	const handleProjectCreated = useCallback(
		(id: string) => {
			setShowCreateModal(false);
			router.push(DASHBOARD_ROUTES.PROJECT(id));
		},
		[router]
	);


	return (
		<Shell>
			<div className="space-y-6">
				<div className="space-y-6">
					{/* Enhanced Header Component */}
					<PageHeader
						title="Projects"
						description="Create new Projects, filter, and manage your submissions."
						actions={
							<Button
								onClick={() => setShowCreateModal(true)}
								className="max-w-16 group relative overflow-hidden bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 text-white hover:shadow-xl transition-all duration-300 font-semibold px-5 py-2.5 !rounded-full whitespace-nowrap"
							>
								<span className="relative z-10 flex items-center gap-2">
									<Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
								</span>
								<div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
							</Button>
						}
					/>

					<SearchSection
						searchValue={query}
						searchPlaceholder="Search Projects by title or keyword..."
						resultsCount={data?.total ?? 0}
						onSearchChange={setQuery}
						onSearchSubmit={() => setPage(1)}
						onCreateNew={() => setShowCreateModal(true)}
						createButtonText="Create New"
						showFilters={false}
						showSort={false}
					>
						<Select value={scope} onValueChange={(v) => setScope(v as any)}>
							<SelectTrigger className="w-[180px]">
								<Tag className="h-4 w-4 mr-2" />
								<SelectValue placeholder="Scope" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Projects</SelectItem>
								<SelectItem value="owned">Owned by me</SelectItem>
								<SelectItem value="member">Shared with me</SelectItem>
							</SelectContent>
						</Select>

						<Select value={(filters as any).status || "all"} onValueChange={(v) => setFilters((f: any) => ({ ...f, status: v === "all" ? "" : v as any }))}>
							<SelectTrigger className="w-[180px]">
								<Filter className="h-4 w-4 mr-2" />
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="DRAFT">Draft</SelectItem>
								<SelectItem value="PUBLISHED">Published</SelectItem>
								<SelectItem value="ARCHIVED">Archived</SelectItem>
							</SelectContent>
						</Select>

						<Select value={filters.industries[0] || "all"} onValueChange={(v) => setFilters((f: any) => ({ ...f, industries: v === "all" ? [] : [v as any] }))}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Industry" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Any Industry</SelectItem>
								{INDUSTRY_OPTIONS.slice(0, 20).map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SearchSection>

					{/* Filter Chips */}
					{chips.length > 0 && (
						<div className="flex flex-wrap items-center gap-2">
							{chips.map((c) => (
								<button
									key={c.id}
									onClick={c.onRemove}
									className="group inline-flex items-center gap-2 rounded-lg border-2 border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-700 transition-all hover:bg-cyan-100 hover:border-cyan-300 hover:shadow-md"
								>
									<span>{c.label}</span>
									<X className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
								</button>
							))}
							<button
								onClick={clearAll}
								className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
							>
								Clear all
							</button>
						</div>
					)}

					{/* Results Grid */}
					{isLoading ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{Array.from({ length: 9 }).map((_, i) => (
								<div key={i} className="min-h-[220px] animate-pulse rounded-lg border bg-muted/30" />
							))}
						</div>
					) : data?.items && data.items.length > 0 ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{data.items.map((p: any) => (<ProjectCard key={p.id} item={p} onOpen={handleOpen} />))}
						</div>
					) : (
						<div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50">
							<div className="text-center">
								<div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4">
									<Plus className="h-8 w-8 text-cyan-600" />
								</div>
								<h3 className="mt-4 text-lg font-semibold text-gray-900">No Projects found</h3>
								<p className="mb-4 mt-2 text-sm text-muted-foreground">
									{query ? "Try adjusting your search or filters" : "Get started by creating your first project"}
								</p>
								{!query && (
									<Button onClick={() => setShowCreateModal(true)} variant="outline" className="mt-4">
										<Plus className="mr-2 h-4 w-4" />
										Create Your First Project
									</Button>
								)}
							</div>
						</div>
					)}

					{/* Pagination */}
					{data?.items && data.items.length > 0 && (
						<Pagination
							currentPage={page}
							hasNextPage={hasNextPage}
							hasPreviousPage={hasPreviousPage}
							onPageChange={setPage}
							isLoading={isFetching}
						/>
					)}
				</div>
			</div>
			<ProjectCreationModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreated={handleProjectCreated} />
		</Shell>
	);
}
