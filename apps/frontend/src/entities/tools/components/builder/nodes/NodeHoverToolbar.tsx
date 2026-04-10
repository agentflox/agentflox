"use client";

import React from "react";
import { ArrowUp, ArrowDown, Copy, CircleSlash } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function NodeHoverToolbar({
  canMoveUp,
  canMoveDown,
  isDisabled,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onToggleDisabled,
}: {
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDisabled?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onToggleDisabled?: () => void;
}) {
  const hasAny = Boolean(onMoveUp || onMoveDown || onDuplicate || onToggleDisabled);
  if (!hasAny) return null;

  const IconButton = ({
    label,
    disabled,
    onClick,
    icon,
  }: {
    label: string;
    disabled?: boolean;
    onClick?: () => void;
    icon: React.ReactNode;
  }) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick?.();
            }}
            className={cn(
              "h-8 w-8 rounded-lg border border-zinc-200 bg-white shadow-sm flex items-center justify-center transition-colors",
              disabled
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900",
            )}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="absolute -left-11 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <IconButton
        label="Move up"
        disabled={!canMoveUp}
        onClick={onMoveUp}
        icon={<ArrowUp className="h-4 w-4" />}
      />
      <IconButton
        label="Move down"
        disabled={!canMoveDown}
        onClick={onMoveDown}
        icon={<ArrowDown className="h-4 w-4" />}
      />
      <IconButton
        label="Duplicate"
        disabled={!onDuplicate}
        onClick={onDuplicate}
        icon={<Copy className="h-4 w-4" />}
      />
      <IconButton
        label={isDisabled ? "Enable node" : "Disable node"}
        disabled={!onToggleDisabled}
        onClick={onToggleDisabled}
        icon={<CircleSlash className="h-4 w-4" />}
      />
    </div>
  );
}
