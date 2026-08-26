"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type ToolScope = "owned" | "all";

type FilterState = {
	category?: string;
	isPublic?: boolean;
};

const PAGE_SIZE = 12;

export interface UseToolListOptions {
	initialScope?: ToolScope;
	initialPage?: number;
	pageSize?: number;
	syncWithUrl?: boolean;
	initialFilters?: FilterState;
}

export function useToolList(initialScopeOrOptions: ToolScope | UseToolListOptions = "owned") {
	const options: UseToolListOptions =
		typeof initialScopeOrOptions === "string"
			? { initialScope: initialScopeOrOptions }
			: initialScopeOrOptions;

	const {
		initialScope = "owned",
		initialPage = 1,
		pageSize: initialPageSize = 12,
		syncWithUrl = true,
		initialFilters = {},
	} = options;

	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<ToolScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>(initialFilters);

	useEffect(() => {
		if (options.pageSize && options.pageSize !== pageSize) {
			setPageSize(options.pageSize);
		}
	}, [options.pageSize]);

	const listInput = useMemo(
		() => ({
			query: query.trim() || undefined,
			category: filters.category,
			isPublic: filters.isPublic,
			page,
			pageSize,
			includeSchema: false,
		}),
		[query, filters.category, filters.isPublic, page, pageSize],
	);

	const queryResult = trpc.compositeTool.list.useQuery(listInput, {
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	useEffect(() => {
		if (!syncWithUrl) return;
		const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
		if (query) params.set("q", query); else params.delete("q");
		if (scope && scope !== "owned") params.set("scope", scope); else params.delete("scope");
		if (filters.category) params.set("category", filters.category); else params.delete("category");
		if (typeof filters.isPublic === "boolean") params.set("isPublic", String(filters.isPublic)); else params.delete("isPublic");
		if (page > 1) params.set("page", String(page)); else params.delete("page");
		if (pageSize !== 12) params.set("pageSize", String(pageSize)); else params.delete("pageSize");
		if (typeof window !== "undefined") {
			const search = params.toString();
			const nextUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
			window.history.replaceState(null, "", nextUrl);
		}
	}, [query, scope, filters.category, filters.isPublic, page, pageSize, syncWithUrl]);

	const total = queryResult.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return {
		data: queryResult.data,
		isLoading: queryResult.isLoading,
		isFetching: queryResult.isFetching,
		page,
		pageSize,
		setPage,
		setPageSize,
		totalPages,
		total,
		query,
		setQuery,
		scope,
		setScope,
		filters,
		setFilters,
		hasNextPage: page < totalPages,
		hasPreviousPage: page > 1,
	};
}

