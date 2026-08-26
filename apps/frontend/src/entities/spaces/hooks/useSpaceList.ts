"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type SpaceScope = "owned" | "member" | "all";
export type SpaceStatus = "active" | "archived";

export type FilterState = {
	status?: SpaceStatus | "";
	workspaceId?: string;
};

export interface UseSpaceListOptions {
	/**
	 * Initial scope for filtering spaces
	 * @default "owned"
	 */
	initialScope?: SpaceScope;

	/**
	 * Initial page number
	 * @default 1
	 */
	initialPage?: number;

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

export function useSpaceList(options: UseSpaceListOptions = {}) {
	const {
		initialScope = "owned",
		initialPage = 1,
		pageSize: initialPageSize = 12,
		initialFilters = { status: "active" },
		debounceMs = 0,
		syncWithUrl = true,
		includeCounts = true,
		enablePrefetch = true,
	} = options;

	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [scope, setScope] = useState<SpaceScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>(initialFilters);

	// Sync pageSize when option changes
	useEffect(() => {
		if (options.pageSize && options.pageSize !== pageSize) {
			setPageSize(options.pageSize);
		}
	}, [options.pageSize]);

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
			scope,
			status: filters.status || undefined,
			workspaceId: filters.workspaceId || undefined,
			includeCounts,
		};
	}, [page, pageSize, debouncedQuery, scope, filters.status, filters.workspaceId, includeCounts]);

	const queryResult = trpc.space.list.useQuery(listInput, {
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	const utils = trpc.useUtils();

	// Prefetch first page
	useEffect(() => {
		if (!enablePrefetch) return;
		utils.space.list.prefetch({ ...listInput, page: 1 });
	}, [utils, listInput, enablePrefetch]);

	// Prefetch next page if current page is full
	useEffect(() => {
		if (!enablePrefetch) return;
		if ((queryResult.data?.items?.length || 0) === pageSize) {
			utils.space.list.prefetch({ ...listInput, page: page + 1 });
		}
	}, [utils, queryResult.data?.items?.length, pageSize, page, listInput, enablePrefetch]);

	// Sync with URL parameters if enabled
	useEffect(() => {
		if (!syncWithUrl) return;

		const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
		if (query) params.set("q", query); else params.delete("q");
		if (scope && scope !== "owned") params.set("scope", scope); else params.delete("scope");
		if (filters.status && filters.status !== "active") params.set("status", filters.status); else params.delete("status");
		if (filters.workspaceId) params.set("workspaceId", filters.workspaceId); else params.delete("workspaceId");
		if (page > 1) params.set("page", String(page)); else params.delete("page");
		if (pageSize !== 12) params.set("pageSize", String(pageSize)); else params.delete("pageSize");

		if (typeof window !== "undefined") {
			const search = params.toString();
			const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
			window.history.replaceState(null, "", newUrl);
		}
	}, [query, scope, filters.status, filters.workspaceId, page, pageSize, syncWithUrl]);

	const total = queryResult.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return {
		// Query result
		data: queryResult.data,
		isLoading: queryResult.isLoading,
		isFetching: queryResult.isFetching,
		isError: queryResult.isError,
		error: queryResult.error,
		refetch: queryResult.refetch,

		// Pagination
		page,
		pageSize,
		setPage,
		setPageSize,
		totalPages,
		total,

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
		spaces: queryResult.data?.items ?? [],
	};
}


