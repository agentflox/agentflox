"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { SkillScope, SkillFilterState } from "../types";

export interface UseSkillListOptions {
  initialScope?: SkillScope;
  initialCategory?: string;
  initialPage?: number;
  pageSize?: number;
  syncWithUrl?: boolean;
  initialFilters?: SkillFilterState;
}

export function useSkillList(options: UseSkillListOptions = {}) {
  const {
    initialScope = "all",
    initialCategory = "all",
    initialPage = 1,
    pageSize: initialPageSize = 12,
    syncWithUrl = true,
    initialFilters = {},
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SkillScope>(initialScope);
  const [category, setCategory] = useState<string>(initialCategory);
  const [status, setStatus] = useState<string>(initialFilters.status || "all");
  const [sortBy, setSortBy] = useState<"updatedAt" | "name" | "displayName" | "createdAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (options.pageSize && options.pageSize !== pageSize) {
      setPageSize(options.pageSize);
    }
  }, [options.pageSize]);

  const listInput = useMemo(
    () => ({
      page,
      pageSize,
      query: query.trim() || undefined,
      scope,
      category: category !== "all" ? category : undefined,
      status: status !== "all" ? status : undefined,
      sortBy,
      sortOrder,
    }),
    [page, pageSize, query, scope, category, status, sortBy, sortOrder]
  );

  const { data, isLoading, isFetching, error, refetch } = trpc.skill.list.useQuery(listInput, {
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: categoriesData } = trpc.skill.categories.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: statsData } = trpc.skill.stats.useQuery(undefined, {
    staleTime: 60_000,
  });

  const utils = trpc.useUtils();

  useEffect(() => {
    const base = { ...listInput, page: 1 };
    utils.skill.list.prefetch(base);
    utils.skill.list.prefetch({ ...base, page: 2 });
  }, [utils, listInput]);

  useEffect(() => {
    if ((data?.items?.length || 0) === pageSize) {
      utils.skill.list.prefetch({ ...listInput, page: page + 1 });
    }
  }, [utils, data?.items?.length, pageSize, page, listInput]);

  useEffect(() => {
    if (!syncWithUrl || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    if (query) params.set("q", query);
    else params.delete("q");

    if (scope && scope !== "all") params.set("scope", scope);
    else params.delete("scope");

    if (category && category !== "all") params.set("category", category);
    else params.delete("category");

    if (status && status !== "all") params.set("status", status);
    else params.delete("status");

    if (page > 1) params.set("page", String(page));
    else params.delete("page");

    if (pageSize !== 12) params.set("pageSize", String(pageSize));
    else params.delete("pageSize");

    const search = params.toString();
    const nextUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [query, scope, category, status, page, pageSize, syncWithUrl]);

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

  return {
    data,
    items: (data?.items || []) as any[],
    isLoading,
    isFetching,
    error,
    refetch,
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
    status,
    setStatus,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    categories: categoriesData || [],
    stats: statsData,
    builtInCount: data?.builtInCount ?? 0,
    ownedCount: data?.ownedCount ?? 0,
  };
}
