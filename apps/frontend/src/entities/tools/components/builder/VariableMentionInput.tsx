"use client";

import React from "react";
import { Search, X, Braces, Code2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { VarTreeEntry, VarLeaf, VarSection } from "../../types/builder";
import { branchEntryIcon, branchTypeColor, branchTypeIcon } from "../../utils/builder";

export function VariableMentionInput({
  value,
  onChange,
  varTree,
  placeholder = "Type '{{' to select variable",
  className,
  multiline = false,
}: {
  value: string;
  onChange: (val: string) => void;
  varTree: VarTreeEntry[];
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [highlightedIdx, setHighlightedIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const openTimestampRef = React.useRef<number>(0);

  // Shared style constants — must be IDENTICAL on both backdrop and input
  const SHARED_FONT: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: '0.75rem',   // 12px – text-xs
    lineHeight: '1rem',    // 16px – matches text-xs
    letterSpacing: 'normal',
    wordSpacing: 'normal',
    boxSizing: 'border-box',
  };
  const TEXTAREA_PAD: React.CSSProperties = {
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    paddingLeft: '0.75rem',
    paddingRight: '2rem', // pr-8 for the braces icon
  };
  const INPUT_PAD: React.CSSProperties = {
    paddingTop: '0.625rem',
    paddingBottom: '0.625rem',
    paddingLeft: '0.75rem',
    paddingRight: '2rem',
  };

  const renderHighlights = (text: string) => {
    if (!text) return null;
    const regex = /(\{\{.*?\}\})/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        return (
          <mark key={i} className="bg-[#dcfce7] text-transparent rounded-sm">
            {part}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const toggleCollapse = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectLeaf = (leaf: VarLeaf) => {
    const input = inputRef.current;
    if (!input) {
      onChange(value + `{{${leaf.value}}}`);
      setOpen(false);
      setQuery("");
      return;
    }

    const cursor = input.selectionStart ?? value.length;
    // Check if the 2 chars before cursor are "{{"
    const textBefore = value.slice(0, cursor);
    const textAfter = value.slice(cursor);

    let newValue = "";
    if (textBefore.endsWith("{{")) {
      newValue = textBefore + leaf.value + "}}" + textAfter;
    } else {
      newValue = textBefore + `{{${leaf.value}}}` + textAfter;
    }

    onChange(newValue);
    setOpen(false);
    setQuery("");

    // Restore focus
    setTimeout(() => {
      input.focus();
      const newCursor = newValue.length - textAfter.length;
      input.setSelectionRange(newCursor, newCursor);
    }, 10);
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
          <span className={cn("text-[11px] font-semibold", branchTypeColor(leaf.type))} style={{ display: 'inline-block', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-violet-500">
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
          <span className="flex-1 text-[12px] font-medium text-zinc-600 text-left">{sec.label}</span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Object</span>
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
    <div className="relative flex items-center w-full group transition-all">
      {multiline ? (
        <div className="relative w-full h-full flex">
          {/* Backdrop: must be pixel-identical to Textarea in font + padding */}
          <div
            ref={backdropRef}
            className={cn("absolute inset-0 pointer-events-none whitespace-pre-wrap break-words text-transparent bg-transparent overflow-hidden min-h-[120px] z-0", className)}
            style={{ ...SHARED_FONT, ...TEXTAREA_PAD }}
          >
            {renderHighlights(value)}
            <br />
          </div>
          <Textarea
            ref={inputRef as any}
            value={value}
            onScroll={handleScroll}
            onChange={(e) => {
              onChange(e.target.value);
              if (e.target.value.endsWith("{{")) {
                setOpen(true);
              }
            }}
            onClick={() => {
              if (!value && !open) {
                setOpen(true);
              }
            }}
            placeholder={placeholder}
            className={cn("bg-transparent border-none shadow-none focus-visible:ring-0 min-h-[120px] relative z-10 w-full h-full resize-y", className)}
            style={{ ...SHARED_FONT, ...TEXTAREA_PAD }}
          />
        </div>
      ) : (
        <div className="relative w-full h-full flex">
          {/* Backdrop: must be pixel-identical to Input in font + padding */}
          <div
            ref={backdropRef}
            className={cn("absolute inset-0 pointer-events-none whitespace-pre overflow-hidden text-transparent bg-transparent h-10 z-0", className)}
            style={{ ...SHARED_FONT, ...INPUT_PAD }}
          >
            {renderHighlights(value)}
          </div>
          <Input
            ref={inputRef as any}
            value={value}
            onScroll={handleScroll}
            onChange={(e) => {
              onChange(e.target.value);
              if (e.target.value.endsWith("{{")) {
                setOpen(true);
              }
            }}
            onClick={() => {
              if (!value && !open) {
                setOpen(true);
              }
            }}
            placeholder={placeholder}
            className={cn("h-10 bg-transparent border-none shadow-none focus-visible:ring-0 relative z-10 w-full", className)}
            style={{ ...SHARED_FONT, ...INPUT_PAD }}
          />
        </div>
      )}
      <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "absolute right-2.5 text-zinc-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity",
              multiline ? "top-3" : "top-1/2 -translate-y-1/2"
            )}
            onClick={() => setOpen(true)}
          >
            <Braces className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="p-0 w-[360px] rounded-xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col z-50"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2 border-b border-zinc-100 bg-white">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                ref={searchInputRef}
                autoFocus
                className="w-full h-9 pl-8 pr-3 text-[13px] bg-zinc-50 rounded-lg border border-zinc-100 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 transition-all placeholder:text-zinc-400"
                placeholder="Search variables..."
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
                  }
                  if (e.key === "Escape") {
                    setOpen(false);
                    setQuery("");
                    inputRef.current?.focus();
                  }
                }}
              />
            </div>
          </div>

          <div className="overflow-y-auto bg-white" style={{ maxHeight: 320 }}>
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
                    <span className="flex-1 text-[12px] font-semibold text-zinc-800">{entry.nodeName}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Object</span>
                  </div>
                  {entry.sections.map((sec) => renderSection(sec, `${entry.nodeId}:${sec.id}`, 24))}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
