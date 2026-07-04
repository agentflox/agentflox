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

export function useToolList(initialScope: ToolScope = "owned") {
	const [page, setPage] = useState(1);
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<ToolScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>({});

	const listInput = useMemo(
		() => ({
			query: query.trim() || undefined,
			category: filters.category,
			isPublic: filters.isPublic,
			page,
			pageSize: PAGE_SIZE,
			includeSchema: false,
		}),
		[query, filters.category, filters.isPublic, page],
	);

	const queryResult = trpc.compositeTool.list.useQuery(listInput, {
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	useEffect(() => {
		setPage(1);
	}, [query, scope, filters.category, filters.isPublic]);

	useEffect(() => {
		const params = new URLSearchParams();
		if (query) params.set("q", query);
		params.set("scope", scope);
		if (filters.category) params.set("category", filters.category);
		if (typeof filters.isPublic === "boolean") params.set("isPublic", String(filters.isPublic));
		params.set("page", String(page));
		if (typeof window !== "undefined") {
			const nextUrl = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState(null, "", nextUrl);
		}
	}, [query, scope, filters.category, filters.isPublic, page]);

	const hasNextPage =
		queryResult.data?.items.length === PAGE_SIZE &&
		page * PAGE_SIZE < (queryResult.data?.total ?? 0);
	const hasPreviousPage = page > 1;

	return {
		data: queryResult.data,
		isLoading: queryResult.isLoading,
		isFetching: queryResult.isFetching,
		page,
		pageSize: PAGE_SIZE,
		setPage,
		query,
		setQuery,
		scope,
		setScope,
		filters,
		setFilters,
		hasNextPage,
		hasPreviousPage,
	};
}

