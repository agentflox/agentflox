"use client";
import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface UsePrefetchedMaterialsOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

export function usePrefetchedMaterials(options: UsePrefetchedMaterialsOptions) {
  const listInput = useMemo(
    () => ({
      page: options.page,
      pageSize: options.pageSize,
      scope: "all",
      isPublic: true,
      query: options.query?.trim() || undefined,
      category: options.category,
      minPrice: options.minPrice,
      maxPrice: options.maxPrice,
    }),
    [options.page, options.pageSize, options.query, options.category, options.minPrice, options.maxPrice]
  );

  const { data, isLoading, isFetching } = trpc.material.list.useQuery(listInput as any, { staleTime: 30_000 });
  const utils = trpc.useUtils();

  useEffect(() => {
    const base = { ...listInput, page: 1 } as any;
    utils.material.list.prefetch(base);
    utils.material.list.prefetch({ ...base, page: 2 });
  }, [utils, listInput.query, listInput.category, listInput.minPrice, listInput.maxPrice]);

  useEffect(() => {
    if ((data?.items?.length || 0) === options.pageSize) {
      utils.material.list.prefetch({ ...listInput, page: options.page + 1 } as any);
    }
  }, [utils, data?.items?.length, options.pageSize, options.page, listInput]);

  return { data, isLoading, isFetching, listInput };
}

