"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { VarTreeEntry, VarLeaf, VarSection } from "../../types/builder";
import { branchEntryIcon, branchTypeColor, branchTypeIcon } from "../../utils/builder";

export function VariableSelectionModal({
  value,
  label,
  varTree,
  onChange,
  onClear,
  placeholder = "Select variable or input a constant value",
}: {
  value: string;
  label: string;
  varTree: VarTreeEntry[];
  onChange: (val: string, lbl: string) => void;
  onClear: () => void;
  placeholder?: string;
}) {
  const isVar = value.startsWith("inputs.") || value.startsWith("steps.");
  const displayLabel = isVar ? label : value;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [inputValue, setInputValue] = React.useState(displayLabel || "");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [highlightedIdx, setHighlightedIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const openTimestampRef = React.useRef<number>(0);

  React.useEffect(() => {
    setInputValue(displayLabel || "");
  }, [displayLabel]);

  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectLeaf = (leaf: VarLeaf) => {
    onChange(leaf.value, leaf.label);
    setOpen(false);
    setQuery("");
  };

  const filteredTree = React.useMemo(() => {
    if (!query) return varTree;
    const q = query.toLowerCase();
    const filterSections = (secs: VarSection[]) =>
      secs
        .map((s) => ({
          ...s,
          leaves: s.leaves.filter(
            (l) =>
              l.field.toLowerCase().includes(q) ||
              l.type.toLowerCase().includes(q) ||
              l.label.toLowerCase().includes(q),
          ),
        }))
        .filter((s) => s.leaves.length > 0);
    return varTree
      .map((entry) => ({
        ...entry,
        sections: filterSections(entry.sections),
      }))
      .filter((e) => e.sections.length > 0);
  }, [varTree, query]);

  const allLeaves: VarLeaf[] = React.useMemo(() => {
    const collect = (secs: VarSection[], prefix: string) =>
      secs.flatMap((s) => (collapsed[`${prefix}:${s.id}`] ? [] : s.leaves));
    return filteredTree.flatMap((entry) => collect(entry.sections, entry.nodeId));
  }, [filteredTree, collapsed]);

  const renderLeaves = (leaves: VarLeaf[], indent: number) =>
    leaves.map((leaf) => {
      const flatIdx = allLeaves.indexOf(leaf);
      const isHighlighted = flatIdx === highlightedIdx;
      return (
        <button
          key={leaf.value}
          type="button"
          className={cn(
            "w-full flex items-center gap-2.5 pr-4 py-1.5 text-left transition-colors cursor-pointer",
            isHighlighted ? "bg-violet-50" : "hover:bg-zinc-50",
          )}
          style={{ paddingLeft: indent }}
          onClick={() => selectLeaf(leaf)}
          onMouseEnter={() => setHighlightedIdx(flatIdx)}
        >
          <span className="h-4 w-4 rounded flex items-center justify-center bg-amber-50 border border-amber-100 shrink-0">
            {branchTypeIcon(leaf.type)}
          </span>
          <span className="flex-1 text-[12px] text-zinc-700 font-medium">{leaf.field}</span>
          <span className={cn("text-[11px] font-semibold", branchTypeColor(leaf.type))}>
            {leaf.type}
          </span>
        </button>
      );
    });

  const renderSection = (sec: VarSection, collapseKey: string, indent: number) => {
    const isOpen = collapsed[collapseKey] !== true;
    return (
      <div key={sec.id}>
        <button
          type="button"
          className="w-full flex items-center gap-2 py-1.5 hover:bg-zinc-50 transition-colors cursor-pointer"
          style={{ paddingLeft: indent - 8, paddingRight: 16 }}
          onClick={() => toggleCollapse(collapseKey)}
        >
          <div className="h-4 w-4 rounded flex items-center justify-center bg-violet-50 border border-violet-100 shrink-0">
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              className="text-violet-500"
            >
              <path
                d="M1 2.5L4 5.5L7 2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{
                  transform: isOpen ? "none" : "rotate(-90deg)",
                  transformOrigin: "50% 50%",
                  transition: "transform 0.15s",
                }}
              />
            </svg>
          </div>
          <span className="flex-1 text-[12px] font-medium text-zinc-600 text-left">
            {sec.label}
          </span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Object
          </span>
        </button>
        {isOpen && renderLeaves(sec.leaves, indent + 16)}
      </div>
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      openTimestampRef.current = Date.now();
      setOpen(true);
      setHighlightedIdx(0);
    } else {
      const elapsed = Date.now() - openTimestampRef.current;
      if (elapsed < 150) return;
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex items-center h-10 border rounded-lg bg-white px-3 gap-2 transition-all cursor-pointer",
            open ? "border-violet-400 ring-2 ring-violet-100" : "border-zinc-200 hover:border-zinc-300",
          )}
          onPointerDown={(e) => {
            if (!open) {
              e.preventDefault();
              handleOpenChange(true);
            }
          }}
          onClick={(e) => open && e.stopPropagation()}
        >
          {isVar && (
            <span className="text-[9px] font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded uppercase shrink-0 tracking-wide">
              VAR
            </span>
          )}
          <input
            className={cn(
              "flex-1 text-[12px] bg-transparent outline-none min-w-0",
              inputValue ? "text-zinc-800" : "text-zinc-400",
            )}
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value;
              setInputValue(val);
              onChange(val, val);
            }}
            onFocus={() => {
              if (!open) handleOpenChange(true);
            }}
            placeholder={placeholder}
          />
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClear();
                setOpen(false);
              }}
              className="shrink-0 h-4 w-4 rounded flex items-center justify-center text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        className="p-0 w-[360px] rounded-xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              ref={inputRef}
              autoFocus
              className="w-full h-9 pl-8 pr-3 text-[13px] bg-zinc-50 rounded-lg border border-zinc-100 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 transition-all placeholder:text-zinc-400"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightedIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIdx((i) => Math.min(i + 1, allLeaves.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIdx((i) => Math.max(i - 1, 0));
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (allLeaves[highlightedIdx]) {
                    selectLeaf(allLeaves[highlightedIdx]);
                    return;
                  }
                  if (query.trim()) {
                    onChange(query.trim(), query.trim());
                    setOpen(false);
                    setQuery("");
                  }
                }
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
            />
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
          {filteredTree.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-zinc-400">
              {query ? "No variables match" : "No variables available"}
            </div>
          ) : (
            filteredTree.map((entry) => (
              <div key={entry.nodeId}>
                <div className="flex items-center gap-2.5 px-3 py-2 bg-zinc-50 border-b border-zinc-100">
                  <div className="h-5 w-5 rounded flex items-center justify-center bg-white border border-zinc-200 shadow-sm shrink-0">
                    {branchEntryIcon(entry.nodeType)}
                  </div>
                  <span className="flex-1 text-[12px] font-semibold text-zinc-800">
                    {entry.nodeName}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Object
                  </span>
                </div>
                {entry.sections.map((sec) =>
                  renderSection(sec, `${entry.nodeId}:${sec.id}`, 24),
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 px-3 py-2 border-t border-zinc-100 bg-zinc-50/50">
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
            <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">
              ↑
            </kbd>
            <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">
              ↓
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
            <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">
              ↵
            </kbd>
            Insert
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
            <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">
              Esc
            </kbd>
            Close/Exit
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
