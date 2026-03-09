"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type ResourceScope = "owned" | "public" | "all";

type FilterState = {
	category?: string;
	isPublic?: boolean;
	priceRange?: [number | undefined, number | undefined];
};

export function useResourceList(initialScope: ResourceScope = "owned") {
	const [page, setPage] = useState(1);
	const pageSize = 12;
	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<ResourceScope>(initialScope);
	const [filters, setFilters] = useState<FilterState>({});

	const listInput = useMemo(
		() => ({
			page,
			pageSize,
			scope,
			query: query.trim() || undefined,
			category: filters.category,
			isPublic: typeof filters.isPublic === "boolean" ? filters.isPublic : undefined,
			minPrice: filters.priceRange?.[0],
			maxPrice: filters.priceRange?.[1],
		}),
		[page, pageSize, scope, query, filters],
	);

	const queryResult = trpc.resource.list.useQuery(listInput as any, {
		staleTime: 30_000,
		placeholderData: keepPreviousData
	});
	const utils = trpc.useUtils();

	useEffect(() => {
		setPage(1);
	}, [query, scope, filters.category, filters.isPublic, filters.priceRange?.[0], filters.priceRange?.[1]]);

	useEffect(() => {
		const params = new URLSearchParams();
		if (query) params.set("q", query);
		if (scope) params.set("scope", scope);
		if (filters.category) params.set("category", filters.category);
		if (typeof filters.isPublic === "boolean") params.set("isPublic", String(filters.isPublic));
		if (filters.priceRange?.[0] != null) params.set("minPrice", String(filters.priceRange[0]));
		if (filters.priceRange?.[1] != null) params.set("maxPrice", String(filters.priceRange[1]));
		params.set("page", String(page));
		if (typeof window !== "undefined") {
			window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
		}
	}, [query, scope, filters.category, filters.isPublic, filters.priceRange, page]);

	useEffect(() => {
		utils.resource.list.prefetch({ ...listInput, page: 1 } as any);
	}, [utils, listInput.scope, listInput.category, listInput.isPublic, listInput.minPrice, listInput.maxPrice, listInput.query]);

	useEffect(() => {
		if ((queryResult.data?.items?.length || 0) === pageSize) {
			utils.resource.list.prefetch({ ...listInput, page: page + 1 } as any);
		}
	}, [utils, queryResult.data?.items?.length, pageSize, page, listInput]);

	return {
		...queryResult,
		page,
		pageSize,
		setPage,
		scope,
		setScope,
		query,
		setQuery,
		filters,
		setFilters,
	};
}



