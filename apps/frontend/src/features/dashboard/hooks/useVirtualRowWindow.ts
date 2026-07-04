"use client";

import { useEffect, useState, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export function useScrollAreaViewport(
  scrollAreaRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    setViewport(el ?? scrollAreaRef.current);
  }, [scrollAreaRef, ...deps]);

  return viewport;
}

export function useVirtualRowWindow(
  scrollAreaRef: RefObject<HTMLElement | null>,
  rowCount: number,
  options: {
    enabled?: boolean;
    estimateSize?: number | ((index: number) => number);
    overscan?: number;
    threshold?: number;
    deps?: unknown[];
  } = {}
) {
  const {
    enabled: enabledProp = true,
    estimateSize = 48,
    overscan = 8,
    threshold = 40,
    deps = [],
  } = options;

  const viewport = useScrollAreaViewport(scrollAreaRef, [rowCount, ...deps]);
  const shouldVirtualize = enabledProp && rowCount > threshold;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => viewport,
    estimateSize: typeof estimateSize === "function" ? estimateSize : () => estimateSize,
    overscan,
    enabled: shouldVirtualize,
  });

  const virtualIndices = shouldVirtualize
    ? virtualizer.getVirtualItems().map((item) => item.index)
    : Array.from({ length: rowCount }, (_, i) => i);

  return {
    viewport,
    virtualizer,
    shouldVirtualize,
    virtualIndices,
    totalSize: shouldVirtualize ? virtualizer.getTotalSize() : rowCount * (typeof estimateSize === "number" ? estimateSize : 48),
  };
}
