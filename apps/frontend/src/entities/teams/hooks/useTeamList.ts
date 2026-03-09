"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type TeamScope = "all" | "owned" | "participated";

export function useTeamList() {
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<TeamScope>("owned");
  const [filters, setFilters] = useState<{ industries: string[]; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "" }>({ industries: [], status: "" as any });

  const listInput = useMemo(
    () => ({
      page,
      pageSize,
      query: query.trim() || undefined,
      scope,
      industry: filters.industries?.length ? filters.industries : undefined,
      status: (filters.status || undefined) as any,
    }),
    [page, pageSize, query, scope, filters]
  );

  const { data, isLoading, isFetching } = trpc.team.list.useQuery(listInput as any, {
    staleTime: 30_000,
    placeholderData: keepPreviousData
  });
  const utils = trpc.useUtils();

  useEffect(() => { setPage(1); }, [query, scope, filters]);

  useEffect(() => {
    const base = { ...listInput, page: 1 } as any;
    utils.team.list.prefetch(base);
    utils.team.list.prefetch({ ...base, page: 2 });
  }, [utils, listInput.query, listInput.scope, listInput.industry, listInput.status]);

  useEffect(() => {
    if ((data?.items?.length || 0) === pageSize) {
      utils.team.list.prefetch({ ...listInput, page: page + 1 } as any);
    }
  }, [utils, data?.items?.length, pageSize, page, listInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (scope) params.set("scope", scope);
    if (filters.status) params.set("status", String(filters.status));
    params.set("page", String(page));
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }, [query, scope, page, filters.status]);

  return {
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
  };
}


