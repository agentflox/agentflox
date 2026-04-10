"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { VarTreeEntry, BranchConditionRule, BranchConditionOperator } from "../../types/builder";
import { BRANCH_OPERATORS } from "../../constants/builder";
import { operatorHasRightValue } from "../../utils/builder";
import { VariableSelectionModal } from "./VariableSelectionModal";

export function BranchConditionRuleRow({
  rule,
  varTree,
  onUpdate,
  onRemove,
}: {
  rule: BranchConditionRule;
  varTree: VarTreeEntry[];
  onUpdate: (patch: Partial<BranchConditionRule>) => void;
  onRemove: () => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setIsWide(e.contentRect.width > 500);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const leftInput = (
    <VariableSelectionModal
      value={rule.leftVariable}
      label={rule.leftLabel}
      varTree={varTree}
      onChange={(val, lbl) => onUpdate({ leftVariable: val, leftLabel: lbl })}
      onClear={() => onUpdate({ leftVariable: "", leftLabel: "" })}
    />
  );

  const operatorSelect = (
    <Select
      value={rule.operator}
      onValueChange={(val) => onUpdate({ operator: val as BranchConditionOperator })}
    >
      <SelectTrigger
        className={cn(
          "h-9 text-[12px] bg-white border-zinc-200 rounded-lg",
          isWide ? "w-44 shrink-0" : "w-full",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BRANCH_OPERATORS.map((op) => (
          <SelectItem key={op.value} value={op.value} className="text-[12px]">
            {op.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const rightInput =
    operatorHasRightValue(rule.operator) && (
      <VariableSelectionModal
        value={rule.rightValue}
        label={rule.rightLabel}
        varTree={varTree}
        onChange={(val, lbl) => onUpdate({ rightValue: val, rightLabel: lbl })}
        onClear={() => onUpdate({ rightValue: "", rightLabel: "" })}
      />
    );

  const deleteBtn = (
    <button
      type="button"
      onClick={onRemove}
      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
    >
      {isWide ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">{leftInput}</div>
          {operatorSelect}
          {rightInput && <div className="flex-1 min-w-0">{rightInput}</div>}
          {deleteBtn}
        </div>
      ) : (
        <div className="space-y-2">
          {leftInput}
          {operatorSelect}
          {rightInput}
          <div className="flex justify-end pt-0.5">{deleteBtn}</div>
        </div>
      )}
    </div>
  );
}
