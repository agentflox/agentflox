"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { WorkforceFilterValues, WorkforceScope } from "../types";
import { keepPreviousData } from "@tanstack/react-query";

export interface UseWorkforceListOptions {
	initialScope?: WorkforceScope;
	initialPage?: number;
	pageSize?: number;
	includeCounts?: boolean;
	syncWithUrl?: boolean;
	initialFilters?: WorkforceFilterValues;
}

export function useWorkforceList(
	initialScopeOrOptions: WorkforceScope | UseWorkforceListOptions = "owned",
	legacyOptions: { includeCounts?: boolean } = {}
) {
	const options: UseWorkforceListOptions =
		typeof initialScopeOrOptions === "string"
			? { initialScope: initialScopeOrOptions, ...legacyOptions }
			: initialScopeOrOptions;

	const {
		initialScope = "owned",
		initialPage = 1,
		pageSize: initialPageSize = 12,
		includeCounts = false,
		syncWithUrl = true,
		initialFilters = { status: "", mode: "" },
	} = options;

	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<WorkforceScope>(initialScope);
	const [filters, setFilters] = useState<WorkforceFilterValues>(initialFilters);

	useEffect(() => {
		if (options.pageSize && options.pageSize !== pageSize) {
			setPageSize(options.pageSize);
		}
	}, [options.pageSize]);

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
			scope,
			query: query.trim() || undefined,
			status: filters.status || undefined,
			mode: filters.mode || undefined,
			includeCounts,
		}),
		[page, pageSize, scope, query, filters.status, filters.mode, includeCounts]
	);

	const queryResult = trpc.workforce.list.useQuery(listInput as any, {
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	useEffect(() => {
		if (!syncWithUrl) return;
		const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
		if (query) params.set("q", query); else params.delete("q");
		if (scope && scope !== "owned") params.set("scope", scope); else params.delete("scope");
		if (filters.status) params.set("status", filters.status); else params.delete("status");
		if (filters.mode) params.set("mode", filters.mode); else params.delete("mode");
		if (page > 1) params.set("page", String(page)); else params.delete("page");
		if (pageSize !== 12) params.set("pageSize", String(pageSize)); else params.delete("pageSize");
		if (typeof window !== "undefined") {
			const url = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState(null, "", url);
		}
	}, [query, scope, filters.status, filters.mode, page, pageSize, syncWithUrl]);

	const total = (queryResult.data as any)?.total ?? 0;
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
		refetch: queryResult.refetch,
	};
}

