"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Bot, Info, Minimize2, Maximize2, Plus, Settings2, Trash2,
  ChevronDown, ChevronUp, GripVertical
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ToolCanvasNodeData } from "../../../types/builder";
import { NodeHoverToolbar } from "./NodeHoverToolbar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BsInputCursor } from "react-icons/bs";
import type { InputUiType } from "../../../types/builder";

const INPUT_TYPE_BUTTONS: { label: string; uiType: InputUiType }[] = [
  { label: "T Text", uiType: "text" },
  { label: "≡ Long text", uiType: "long_text" },
  { label: "# Number", uiType: "number" },
  { label: "{} JSON", uiType: "json" },
  { label: "🔗 File to URL", uiType: "file_to_url" },
  { label: "⊞ Table", uiType: "table" },
];

const UI_TYPE_OPTIONS = [
  { value: "text", label: "Text input" },
  { value: "long_text", label: "Long text input" },
  { value: "number", label: "Numeric input" },
  { value: "checkbox", label: "Checkbox" },
  { value: "options", label: "Options dropdown" },
  { value: "text_list", label: "Text list" },
  { value: "json", label: "JSON" },
  { value: "json_list", label: "List of JSONs" },
  { value: "file_to_text", label: "File to text" },
  { value: "file_to_url", label: "File to URL" },
  { value: "files_to_urls", label: "Multiple files to URLs" },
  { value: "api_key", label: "API key input" },
  { value: "oauth_account", label: "OAuth account" },
  { value: "table", label: "Table" },
];

function InputFieldCard({
  input,
  idx,
  totalInputs,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  input: any;
  idx: number;
  totalInputs: number;
  onUpdate: (patch: Record<string, any>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const uiType = input.uiType || "text";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100 bg-zinc-50/60">
        {/* Move controls */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="text-zinc-300 hover:text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-200/50 rounded-sm p-px cursor-pointer flex items-center justify-center transition-colors"
            disabled={idx === 0}
            title="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="text-zinc-300 hover:text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-200/50 rounded-sm p-px cursor-pointer flex items-center justify-center transition-colors"
            disabled={idx === totalInputs - 1}
            title="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Name input */}
        <Input
          value={input.name}
          onChange={(e) => { e.stopPropagation(); onUpdate({ name: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="variable_name"
          className="h-7 text-xs flex-1 border-zinc-200 font-mono"
        />

        {/* Type selector */}
        <Select
          value={uiType}
          onValueChange={(val) => {
            const baseTypeMap: Record<string, string> = {
              text: "string", long_text: "string", number: "number", checkbox: "boolean",
              options: "string", text_list: "array", json: "object", json_list: "array",
              file_to_text: "string", file_to_url: "string", files_to_urls: "array",
              api_key: "string", oauth_account: "string", table: "array",
            };
            onUpdate({ uiType: val, type: baseTypeMap[val] || "string" });
          }}
        >
          <SelectTrigger
            className="h-7 w-36 text-[11px] border-zinc-200"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            {UI_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2.5">
        {/* Description */}
        <Textarea
          value={input.description ?? ""}
          onChange={(e) => { e.stopPropagation(); onUpdate({ description: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Description (optional)"
          className="min-h-[48px] text-[11px] resize-none"
          rows={2}
        />

        {/* Fill mode + Required row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">Fill mode</span>
            <Select
              value={input.fillMode ?? "agent"}
              onValueChange={(val) => onUpdate({ fillMode: val })}
            >
              <SelectTrigger
                className="h-7 w-28 text-[11px]"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="agent" className="text-xs">Agent</SelectItem>
                <SelectItem value="manual" className="text-xs">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">Required</span>
            <Switch
              checked={!!input.required}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Default value */}
        <div>
          <div className="text-[11px] text-zinc-500 mb-1">Default value</div>
          {uiType === "oauth_account" ? (
            <Select
              value={(input.defaultValue as string) || ""}
              onValueChange={(val) => onUpdate({ defaultValue: val })}
            >
              <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <SelectValue placeholder="Select connected account..." />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="demo_oauth_account" className="text-xs">Demo connected account</SelectItem>
              </SelectContent>
            </Select>
          ) : uiType === "checkbox" ? (
            <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
              <span className="text-xs text-zinc-600">Default on?</span>
              <Switch
                checked={Boolean(input.defaultValue)}
                onCheckedChange={(checked) => onUpdate({ defaultValue: checked })}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : uiType === "long_text" ? (
            <Textarea
              value={(input.defaultValue as string) ?? ""}
              onChange={(e) => { e.stopPropagation(); onUpdate({ defaultValue: e.target.value }); }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Type here..."
              className="min-h-[60px] text-xs resize-none"
              rows={2}
            />
          ) : (
            <Input
              value={(input.defaultValue as string) ?? ""}
              onChange={(e) => { e.stopPropagation(); onUpdate({ defaultValue: e.target.value }); }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Default value..."
              className="h-8 text-xs"
            />
          )}
        </div>

        {/* Variable tag */}
        {input.name && (
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-teal-500">→</span>
              <span className="bg-teal-50 text-teal-600 border border-teal-100 rounded px-1.5 py-0.5 text-[9px] font-mono">
                {input.name}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-zinc-100 rounded px-1.5 py-0.5 text-[9px] font-mono text-zinc-500">
              <span>T</span> {uiType === "number" ? "Number" : uiType === "json" ? "JSON" : "String"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableInputFieldCard(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start group/sortable">
      <div
        {...attributes}
        {...listeners}
        className="mt-[6px] shrink-0 text-zinc-300 hover:text-indigo-500 hover:bg-zinc-100 p-1 rounded cursor-grab active:cursor-grabbing transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <InputFieldCard {...props} />
      </div>
    </div>
  );
}

export function SortableSidebarInputWrapper(props: { id: string, children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start group/sortable">
      <div
        {...attributes}
        {...listeners}
        className="mt-[6px] shrink-0 text-zinc-300 hover:text-indigo-500 hover:bg-zinc-100 p-1 rounded cursor-grab active:cursor-grabbing transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        {props.children}
      </div>
    </div>
  );
}

export function InputsNode({ data }: { data: ToolCanvasNodeData }) {
  const isNotebook = data.viewMode === "notebook";
  const isExpanded = isNotebook && data.isExpanded;

  const inputs = Array.isArray(data.inputs) ? data.inputs : [];

  // Measure actual rendered height and report to layout engine
  const nodeRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = nodeRef.current;
    if (!el || !data.onMeasureHeight) return;
    const obs = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h && h > 0) data.onMeasureHeight!(Math.round(h));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [data.onMeasureHeight]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = inputs.findIndex((_, i) => `input-${i}` === active.id);
      const newIndex = inputs.findIndex((_, i) => `input-${i}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const next = arrayMove(inputs, oldIndex, newIndex);
        data.onReorderInputs?.(next);
      }
    }
  };

  // Removed drag handlers for proper text selection
  // Missing required check
  const missingRequired = inputs
    .filter((i) => i.required && i.fillMode === "manual" && !i.defaultValue)
    .map((i) => i.name)
    .filter(Boolean);

  // Collapsed notebook view
  if (isNotebook && !isExpanded) {
    return (
      <div
        ref={nodeRef}
        className="relative w-[600px] cursor-pointer group"
        onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}
      >
        <NodeHoverToolbar canMoveUp={false} canMoveDown={false} isDisabled={false} />
        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />
        <div className="w-[600px] rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-300 transition-all relative overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
              <Bot className="h-4 w-4 group-hover:hidden" />
              <ChevronDown className="h-4 w-4 hidden group-hover:block" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-indigo-700">Inputs</span>
              {inputs.length > 0 && (
                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                  {inputs.map((i) => i.name).filter(Boolean).join(", ")}
                </div>
              )}
            </div>
            {missingRequired.length > 0 && (
              <div className="h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-white">{missingRequired.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Expanded notebook view
  if (isNotebook && isExpanded) {
    return (
      <div ref={nodeRef} className="relative w-[680px] cursor-default bg-white rounded-xl shadow-md border-[2px] border-indigo-400 group">
        <NodeHoverToolbar canMoveUp={false} canMoveDown={false} isDisabled={false} />
        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent" isConnectable={false} />

        {/* Header */}
        <div className="p-4 pb-3 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group/h flex-1"
            onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}
          >
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
              <BsInputCursor className="h-4 w-4 group-hover/h:hidden" />
              <ChevronUp className="h-4 w-4 hidden group-hover/h:block" />
            </div>
            <div>
              <div className="text-sm font-bold text-indigo-700 group-hover/h:text-indigo-500 transition-colors">Inputs</div>
              <div className="text-[11px] text-zinc-500">What you or your agent should pass into this tool</div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 border border-zinc-200 bg-zinc-50 rounded-lg p-0.5 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200/50 text-zinc-500 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); data.onOpen?.(); }}
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-zinc-200 mx-0.5" />
            <button
              onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200/50 text-zinc-500 cursor-pointer"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Missing required warning */}
        {missingRequired.length > 0 && (
          <div className="px-4 pb-3">
            <div className="rounded-lg bg-amber-50/70 border border-amber-100 p-3 flex gap-2 text-[11px] text-amber-800">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <div className="font-semibold mb-1 text-amber-900">Missing required values for:</div>
                <ul className="list-disc list-inside opacity-90 space-y-0.5">
                  {missingRequired.map((name) => <li key={name}>{name}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Input field list — fully interactive */}
        <div
          className="px-4 pb-4 space-y-3 nodrag nopan nowheel"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={inputs.map((_, i) => `input-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              {inputs.map((input, idx) => (
                <SortableInputFieldCard
                  key={`input-${idx}`}
                  id={`input-${idx}`}
                  input={input}
                  idx={idx}
                  totalInputs={inputs.length}
                  onUpdate={(patch: any) => data.onUpdateInput?.(idx, patch)}
                  onDelete={() => data.onDeleteInput?.(idx)}
                  onMoveUp={() => {
                    if (idx === 0) return;
                    const next = [...inputs];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    data.onReorderInputs?.(next);
                  }}
                  onMoveDown={() => {
                    if (idx === inputs.length - 1) return;
                    const next = [...inputs];
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    data.onReorderInputs?.(next);
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add type buttons */}
          <div className="pt-1 border-t border-zinc-100">
            <span className="text-[10px] font-semibold text-zinc-500 mb-2 block">Add type of input:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {INPUT_TYPE_BUTTONS.map(({ label, uiType }) => (
                <button
                  key={uiType}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); data.onAddInput?.(uiType); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="px-2 py-1 rounded-md border border-zinc-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-[11px] font-semibold text-zinc-600 shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); data.onAddInput?.("json"); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-2 py-1 rounded-md border border-zinc-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-[11px] font-semibold text-zinc-600 shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
              >
                ... More
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard flow view
  return (
    <div ref={nodeRef} className="relative w-[380px] cursor-pointer group">
      <NodeHoverToolbar canMoveUp={false} canMoveDown={false} isDisabled={false} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }}
        className="!opacity-0 !w-0 !h-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <div
        onClick={data.onOpen}
        className="w-[380px] text-left rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <BsInputCursor className="h-4 w-4" />
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-sm font-bold text-indigo-700 truncate">
                Inputs
              </span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-indigo-50/20 rounded-b-xl border-t border-indigo-50">
          <div className="text-xs text-zinc-600 leading-relaxed">This node defines the inputs for the tool.</div>
        </div>
      </div>
    </div>
  );
}
