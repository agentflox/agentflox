"use client";

import { Fragment, type ReactNode, type RefObject, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedTableBodyProps {
  scrollRef: RefObject<HTMLElement | null>;
  rowCount: number;
  enabled?: boolean;
  estimateSize?: number;
  overscan?: number;
  colSpan?: number;
  renderRow: (index: number) => ReactNode;
}

/**
 * Virtualizes flat table body rows inside an external scroll parent.
 * Uses spacer <tr> rows so output is valid inside <tbody>.
 * Falls back to rendering all rows when disabled or rowCount <= 40.
 */
export function VirtualizedTableBody({
  scrollRef,
  rowCount,
  enabled = true,
  estimateSize = 44,
  overscan = 8,
  colSpan = 20,
  renderRow,
}: VirtualizedTableBodyProps) {
  const shouldVirtualize = enabled && rowCount > 40;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
    enabled: shouldVirtualize,
  });

  if (!shouldVirtualize) {
    return (
      <>
        {Array.from({ length: rowCount }, (_, i) => (
          <Fragment key={i}>{renderRow(i)}</Fragment>
        ))}
      </>
    );
  }

  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;

  return (
    <>
      {paddingTop > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      )}
      {items.map((virtualRow) => (
        <Fragment key={virtualRow.key}>{renderRow(virtualRow.index)}</Fragment>
      ))}
      {paddingBottom > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      )}
    </>
  );
}

interface VirtualizedDivRowsProps {
  scrollRef: RefObject<HTMLElement | null>;
  rowCount: number;
  enabled?: boolean;
  estimateSize?: number | ((index: number) => number);
  overscan?: number;
  className?: string;
  renderRow: (index: number) => ReactNode;
}

/**
 * Virtualizes block/div rows inside a Radix ScrollArea viewport (or any scroll parent).
 * Falls back to rendering all rows when disabled or rowCount <= 40.
 */
export function VirtualizedDivRows({
  scrollRef,
  rowCount,
  enabled = true,
  estimateSize = 48,
  overscan = 8,
  className,
  renderRow,
}: VirtualizedDivRowsProps) {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el =
      scrollRef.current?.querySelector?.("[data-radix-scroll-area-viewport]") ?? scrollRef.current;
    setViewport(el as HTMLElement | null);
  }, [scrollRef, rowCount]);

  const shouldVirtualize = enabled && rowCount > 40;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => viewport,
    estimateSize: typeof estimateSize === "function" ? estimateSize : () => estimateSize,
    overscan,
    enabled: shouldVirtualize,
  });

  if (!shouldVirtualize) {
    return (
      <div className={className}>
        {Array.from({ length: rowCount }, (_, i) => (
          <Fragment key={i}>{renderRow(i)}</Fragment>
        ))}
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div className={className} style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
      {items.map((virtualRow) => (
        <div
          key={virtualRow.key}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          {renderRow(virtualRow.index)}
        </div>
      ))}
    </div>
  );
}

/** @deprecated Use VirtualizedTableBody with scrollRef instead */
export const VirtualizedListRows = VirtualizedTableBody;
