"use client";

import React from "react";
import {
  type EdgeProps,
  getStraightPath,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlusEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, markerEnd, data } = props;
  const [hovered, setHovered] = React.useState(false);

  // For vertical connections: clean straight line.
  // For horizontally-offset connections (branches): a 3-segment orthogonal path
  // that goes straight down, turns horizontal at midpoint, then straight down again.
  // This matches the reference design exactly and avoids getSmoothStepPath's backward-U routing.
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (Math.abs(targetX - sourceX) > 30) {
    const midY = (sourceY + targetY) / 2;
    edgePath = `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = midY;
  } else {
    [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  }

  const onPlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (data as any)?.onPlus?.();
  };

  return (
    <>
      <path
        id={id}
        className={cn(
          "fill-none transition-colors",
          hovered ? "stroke-indigo-400 stroke-[2.5]" : "stroke-indigo-300 stroke-[2]"
        )}
        d={edgePath}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          role="button"
          tabIndex={0}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            width: 56,
            height: 56,
            pointerEvents: "all",
          }}
          className="nodrag nopan flex items-center justify-center cursor-pointer"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onPlusClick}
        >
          <span
            className={cn(
              "h-9 w-9 rounded-full bg-white border border-indigo-200 shadow-sm hover:shadow-md transition-all flex items-center justify-center pointer-events-none",
              hovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            aria-hidden
          >
            <Plus className="h-4 w-4 text-indigo-600" />
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
