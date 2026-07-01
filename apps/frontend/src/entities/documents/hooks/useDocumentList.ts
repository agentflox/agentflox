"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type DocumentScope = "all" | "owned" | "member";
export type DocumentStatus = "active" | "archived";

export type FilterState = {
	status?: DocumentStatus | "";
	workspaceId?: string;
	parentId?: string | null;
};

export interface UseDocumentListOptions {
	/**
	 * Initial scope for filtering documents
	 * @default "all"
	 */
	initialScope?: DocumentScope;

	/**
	 * Number of items per page
	 * @default 12
	 */
	pageSize?: number;

	/**
	 * Initial filters
	 */
	initialFilters?: FilterState;

	/**
	 * Debounce delay for search query in milliseconds
	 * @default 0 (no debounce)
	 */
	debounceMs?: number;

	/**
	 * Whether to sync state with URL parameters
	 * @default true
	 */
	syncWithUrl?: boolean;

	/**
	 * Whether to include counts in the response
	 * @default true
	 */
	includeCounts?: boolean;

	/**
	 * Whether to prefetch next page
	 * @default true
	 */
	enablePrefetch?: boolean;
}

export function useDocumentList(options: UseDocumentListOptions = {}) {
	const {
		initialScope = "all",
		pageSize = 12,
		initialFilters = { status: "active", parentId: null },
		debounceMs = 0,
		syncWithUrl = true,
		includeCounts = true,
		enablePrefetch = true,
	} = options;

	const [page, setPage] = useState(1);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [scope, setScope] = useState<DocumentScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>(initialFilters);

	// Debounce search query
	useEffect(() => {
		if (debounceMs === 0) {
			setDebouncedQuery(query);
			return;
		}

		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [query, debounceMs]);

	const listInput = useMemo(() => {
		const trimmedQuery = debouncedQuery.trim();

		return {
			page,
			pageSize,
			query: trimmedQuery || undefined,
			parentId: filters.parentId,
			isArchived: filters.status === "archived" ? true : filters.status === "active" ? false : undefined,
			workspaceId: filters.workspaceId || undefined,
		};
	}, [page, pageSize, debouncedQuery, filters.status, filters.workspaceId, filters.parentId]);

	const queryResult = trpc.document.list.useQuery(listInput, {
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	const utils = trpc.useUtils();

	// Reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [debouncedQuery, scope, filters.status, filters.workspaceId, filters.parentId]);

	// Prefetch first page
	useEffect(() => {
		if (!enablePrefetch) return;
		utils.document.list.prefetch({ ...listInput, page: 1 });
	}, [utils, listInput, enablePrefetch]);

	// Prefetch next page if current page is full
	useEffect(() => {
		if (!enablePrefetch) return;
		if ((queryResult.data?.items?.length || 0) === pageSize) {
			utils.document.list.prefetch({ ...listInput, page: page + 1 });
		}
	}, [utils, queryResult.data?.items?.length, pageSize, page, listInput, enablePrefetch]);

	// Sync with URL parameters
	useEffect(() => {
		if (!syncWithUrl) return;

		const params = new URLSearchParams();
		if (query) params.set("q", query);
		if (scope) params.set("scope", scope);
		if (filters.status) params.set("status", filters.status);
		if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
		params.set("page", String(page));

		if (typeof window !== "undefined") {
			const url = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState(null, "", url);
		}
	}, [query, scope, filters.status, filters.workspaceId, page, syncWithUrl]);

	return {
		// Query result
		data: queryResult.data,
		isLoading: queryResult.isLoading,
		isError: queryResult.isError,
		error: queryResult.error,
		refetch: queryResult.refetch,

		// Pagination
		page,
		pageSize,
		setPage,
		totalPages: queryResult.data ? Math.ceil((queryResult.data as any).total / pageSize) : 0,
		total: (queryResult.data as any)?.total ?? 0,

		// Search
		query,
		setQuery,
		debouncedQuery,

		// Filters
		scope,
		setScope,
		filters,
		setFilters,

		// Items
		documents: queryResult.data?.items ?? [],
	};
}


