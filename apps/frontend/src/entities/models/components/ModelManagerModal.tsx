'use client';

import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Bot, Check, ChevronDown, ChevronUp, LayoutGrid, List, Plus, Search, Settings2, Brain, MoreVertical, Pencil, Trash2, CircleDollarSign, MessageSquareText, Target, FileText, Info } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { AiModelView, AiModelProvider } from '@agentflox/types';
import { useModels } from '../hooks/useModels';
import {
  filterModels,
  formatCreditBadge,
  formatTokenCount,
  providerLabel,
  sortModels,
  type ModelSort,
} from '../utils';
import { ModelCreateModal } from './ModelCreateModal';
import { ModelEditModal } from './ModelEditModal';
import { ModelDeleteModal } from './ModelDeleteModal';
import { EntityIcon } from '@/entities/shared/components/EntityIcon';
import { LuBrain } from "react-icons/lu";
import { useModelMutations } from '../hooks/useModels';

const sortOptions = [
  {
    label: "Context Window",
    value: "contextWindow"
  },
  {
    label: "Credits Cost",
    value: "cost"
  },
  {
    label: "Max Output Tokens",
    value: "maxOutput"
  },
];

export function ProviderIcon({ provider, className }: { provider: string, className?: string }) {
  if (provider === 'OPENAI') {
    return <Image src="/images/openai-logo.webp" alt="OpenAI" width={16} height={16} className={cn("object-contain", className)} />;
  }
  if (provider === 'ANTHROPIC') {
    return <Image src="/images/anthropic-logo.webp" alt="Anthropic" width={16} height={16} className={cn("object-contain", className)} />;
  }
  if (provider === 'GOOGLE') {
    return <Image src="/images/gemini-logo.webp" alt="Google" width={16} height={16} className={cn("object-contain", className)} />;
  }
  return <LuBrain className={cn("w-4 h-4", className)} />;
}

export function ModelIcon({ model, className, iconSize = 14 }: { model: AiModelView, className?: string, iconSize?: number }) {
  if (model.isCustom) {
    const bg = model.color && model.color !== '#FFFFFF' ? model.color : '#8B5CF6';
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-md overflow-hidden shadow-sm", className)}
        style={{ backgroundColor: bg }}
      >
        {model.icon ? (
          <EntityIcon icon={model.icon} className="text-white" size={iconSize} fallback={Bot} fill />
        ) : (
          <span className="text-white font-bold leading-none select-none" style={{ fontSize: iconSize * 0.75 }}>C</span>
        )}
      </div>
    );
  }
  return <ProviderIcon provider={model.provider} className={className} />;
}

export function ModelManagerModal({
  open,
  onOpenChange,
  selectedModelId,
  onSelect,
  title = "AI Model Manager",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModelId?: string | null;
  onSelect: (model: AiModelView) => void;
  title?: string;
}) {
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<ModelSort>({ id: 'contextWindow', desc: true });
  const [view, setView] = React.useState<'list' | 'grid'>('list');
  const [filters, setFilters] = React.useState<string[]>([]);
  const [previewId, setPreviewId] = React.useState<string | null>(selectedModelId || null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState<AiModelView | null>(null);
  const [showDelete, setShowDelete] = React.useState<AiModelView | null>(null);

  const [contextWindow, setContextWindow] = React.useState([1000, 10000000]);
  const [maxOutputTokens, setMaxOutputTokens] = React.useState([1024, 10000000]);
  const [thinking, setThinking] = React.useState(false);
  const [fileTypes, setFileTypes] = React.useState<string[]>([]);

  const { data: models = [], isLoading } = useModels({ search, enabled: open });

  const filtered = React.useMemo(() => {
    let result = filterModels(models, { search });
    if (filters.length > 0) {
      const selectedProviders = filters.filter(f => f !== 'CUSTOM') as AiModelProvider[];
      const showCustom = filters.includes('CUSTOM');
      result = result.filter(m => {
        if (selectedProviders.length > 0 && showCustom) {
          return selectedProviders.includes(m.provider) || m.isCustom;
        }
        if (showCustom) return m.isCustom;
        if (selectedProviders.length > 0) return selectedProviders.includes(m.provider);
        return true;
      });
    }

    result = result.filter(m => (m.contextWindow ?? 0) >= contextWindow[0] && (m.contextWindow ?? Infinity) <= contextWindow[1]);
    result = result.filter(m => (m.maxOutputTokens ?? 0) >= maxOutputTokens[0] && (m.maxOutputTokens ?? Infinity) <= maxOutputTokens[1]);

    if (thinking) {
      result = result.filter(m => m.supportsThinking);
    }

    if (fileTypes.length > 0) {
      result = result.filter(m => {
        const types = m.inputFileTypes || [];
        return fileTypes.every(ft => {
          if (ft === 'pdf') return types.includes('pdf');
          if (ft === 'images') return types.some(t => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(t));
          if (ft === 'documents') return types.some(t => ['doc', 'docx', 'txt', 'csv'].includes(t));
          if (ft === 'spreadsheets') return types.some(t => ['xls', 'xlsx', 'csv'].includes(t));
          if (ft === 'video') return types.some(t => ['mp4', 'webm', 'mov'].includes(t));
          if (ft === 'audio') return types.some(t => ['mp3', 'wav', 'ogg'].includes(t));
          return true;
        });
      });
    }

    return sortModels(result, sort);
  }, [models, search, filters, sort, contextWindow, maxOutputTokens, thinking, fileTypes]);

  const preview = filtered.find((m) => m.id === previewId) || filtered[0] || null;

  React.useEffect(() => {
    if (selectedModelId) setPreviewId(selectedModelId);
  }, [selectedModelId, open]);

  const toggleFilter = (f: string) => {
    setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const toggleFileType = (f: string) => {
    setFileTypes((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const activeFilterCount = filters.length + (thinking ? 1 : 0) + fileTypes.length +
    (contextWindow[0] > 1000 || contextWindow[1] < 10000000 ? 1 : 0) +
    (maxOutputTokens[0] > 1024 || maxOutputTokens[1] < 10000000 ? 1 : 0);

  const resetAllFilters = () => {
    setFilters([]);
    setFileTypes([]);
    setThinking(false);
    setContextWindow([1000, 10000000]);
    setMaxOutputTokens([1024, 10000000]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-[220px_1fr_300px]">
          {/* Filters */}
          <div className="border-r p-4 overflow-auto w-[240px] shrink-0 z-[11]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-bold text-zinc-900">Filters</span>
              {activeFilterCount > 0 && (
                <button type="button" className="text-xs text-zinc-500 cursor-pointer font-medium hover:text-zinc-800 px-2 py-1 hover:bg-zinc-100 rounded-md" onClick={resetAllFilters}>
                  Reset ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                  <MessageSquareText className="w-3.5 h-3.5" />
                  Context Window
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px]">Filter by the maximum amount of text a model can process at once</TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  min={1000}
                  max={10000000}
                  step={1000}
                  value={contextWindow}
                  onValueChange={setContextWindow}
                  className="[&>span:first-child]:bg-violet-100 [&_[role=slider]]:border-violet-500 [&_[role=slider]]:bg-white [&_[data-slot=slider-range]]:bg-violet-500"
                />
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{contextWindow[0].toLocaleString()}</span>
                  <span>{contextWindow[1].toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                  <Target className="w-3.5 h-3.5" />
                  Max Output Tokens
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px]">Filter by the maximum length of the model's generated response</TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  min={1024}
                  max={10000000}
                  step={1024}
                  value={maxOutputTokens}
                  onValueChange={setMaxOutputTokens}
                  className="[&>span:first-child]:bg-violet-100 [&_[role=slider]]:border-violet-500 [&_[role=slider]]:bg-white [&_[data-slot=slider-range]]:bg-violet-500"
                />
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{maxOutputTokens[0].toLocaleString()}</span>
                  <span>{maxOutputTokens[1].toLocaleString()}</span>
                </div>
              </div>

              <Accordion type="multiple" defaultValue={["provider", "capabilities", "files"]} className="w-full">
                <AccordionItem value="provider" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 cursor-pointer hover:bg-zinc-100 px-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                      Model Provider
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">Filter models by the company or service that provides them (e.g., OpenAI, Anthropic, Google)</TooltipContent>
                      </Tooltip>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pl-1.5">
                    <div className="space-y-2 mt-1">
                      {(['OPENAI', 'ANTHROPIC', 'GOOGLE'] as AiModelProvider[]).map((p) => (
                        <label key={p} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={filters.includes(p)}
                            onChange={() => toggleFilter(p)}
                            className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                          <ProviderIcon provider={p} className="w-4 h-4 shrink-0" />
                          <span className="flex-1 text-zinc-600 text-[13px]">{providerLabel(p)}</span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={filters.includes('CUSTOM')}
                          onChange={() => toggleFilter('CUSTOM')}
                          className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                        <LuBrain className="w-4 h-4 shrink-0 text-amber-600" />
                        <span className="flex-1 text-zinc-600 text-[13px]">Custom Models</span>
                      </label>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="capabilities" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 cursor-pointer hover:bg-zinc-100 px-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                      Additional Capabilities
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">Filter models by special features like thinking capabilities or reasoning modes</TooltipContent>
                      </Tooltip>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pl-1.5">
                    <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={thinking}
                        onChange={(e) => setThinking(e.target.checked)}
                        className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <Brain className="w-4 h-4 shrink-0 text-zinc-600" />
                      <span className="flex-1 text-zinc-600 text-[13px]">Thinking</span>
                    </label>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="files" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 cursor-pointer hover:bg-zinc-100 px-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                      Supported File Types
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">Filter models by the types of files they can process (PDFs, images, documents, etc.)</TooltipContent>
                      </Tooltip>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pl-1.5">
                    <div className="space-y-2 mt-1">
                      {[
                        { id: 'pdf', label: 'PDF' },
                        { id: 'images', label: 'Images' },
                        { id: 'documents', label: 'Documents' },
                        { id: 'spreadsheets', label: 'Spreadsheets' },
                        { id: 'video', label: 'Video' },
                        { id: 'audio', label: 'Audio' },
                        { id: 'other', label: 'Other file types' }
                      ].map((ft) => (
                        <label key={ft.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fileTypes.includes(ft.id)}
                            onChange={() => toggleFileType(ft.id)}
                            className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                          <span className="flex-1 text-zinc-600 text-[13px]">{ft.label}</span>
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          {/* List */}
          <div className="min-h-0 overflow-auto">
            <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-4 bg-white pt-3 pb-2 border-b ml-5 px-3 border-zinc-100">
              <div className="flex flex-1 items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden cursor-text max-w-[200px]">
                <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                <Input
                  variant="ghost"
                  className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                  placeholder="Search models"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 gap-1.5 px-3 text-xs font-medium transition-colors cursor-pointer rounded-full",
                        sort.id !== 'contextWindow' || !sort.desc
                          ? "bg-violet-50 text-violet-700 border-violet-200"
                          : "text-zinc-700 border-zinc-200 bg-white hover:bg-zinc-50"
                      )}
                    >
                      {sort.desc ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">
                        Sort: {sortOptions.find(opt => opt.value === sort.id)?.label || "Sort"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[220px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={8}>
                    <div className="px-2 py-1.5 mb-1">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Sort By</span>
                    </div>
                    <div className="space-y-0.5">
                      {sortOptions.map((opt) => {
                        const isSelected = sort.id === opt.value;
                        return (
                          <div
                            key={opt.value}
                            className={cn(
                              "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors group/item",
                              isSelected ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
                            )}
                            onClick={() => {
                              if (isSelected) {
                                setSort({ ...sort, desc: !sort.desc });
                              } else {
                                setSort({ id: opt.value as any, desc: true });
                              }
                            }}
                          >
                            <div
                              className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSelected) {
                                  setSort({ ...sort, desc: !sort.desc });
                                } else {
                                  setSort({ id: opt.value as any, desc: false });
                                }
                              }}
                            >
                              {isSelected ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col items-center -space-y-1">
                                      <ChevronUp className={`h-3.5 w-3.5 ${sort.desc ? 'text-zinc-800' : 'text-zinc-300'}`} />
                                      <ChevronDown className={`h-3.5 w-3.5 ${sort.desc ? 'text-zinc-300' : 'text-zinc-800'}`} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {sort.desc ? "Descending" : "Ascending"}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                              )}
                            </div>
                            <span className="flex-1">{opt.label}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900" />}
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center bg-zinc-100/80 p-1 rounded-lg">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setView('grid')}
                        className={cn(
                          "flex items-center justify-center h-7 w-9 rounded-md transition-all cursor-pointer",
                          view === 'grid' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                        )}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Grid view</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setView('list')}
                        className={cn(
                          "flex items-center justify-center h-7 w-9 rounded-md transition-all cursor-pointer",
                          view === 'list' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                        )}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>List view</TooltipContent>
                  </Tooltip>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 text-violet-600 border-violet-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                      onClick={() => setShowCreate(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add custom model</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            {isLoading ? (
              <div className="text-sm text-zinc-500 px-8 pb-3">Loading models…</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-zinc-500 px-8 pb-3">No models match your filters.</div>
            ) : view === 'list' ? (
              <div className="space-y-2 px-8 pb-3">
                {filtered.map((m) => {
                  const active = preview?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPreviewId(m.id)}
                      onMouseEnter={() => setPreviewId(m.id)}
                      className={cn(
                        'w-full text-left rounded-xl border px-3 py-3 transition-colors cursor-pointer',
                        active
                          ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1">
                            <ModelIcon model={m} className="w-5 h-5 shrink-0" />
                            {m.displayName}
                            {m.isCustom && (
                              <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-center">
                                Custom
                              </span>
                            )}
                            {m.isDefault && (
                              <span className="text-[10px] font-bold uppercase text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded text-center">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">{providerLabel(m.provider)}</div>
                        </div>
                        <div className="text-right shrink-0 flex items-start gap-3">
                          <div>
                            <div className="text-[11px] text-zinc-500">
                              {formatTokenCount(m.contextWindow)} tokens
                            </div>
                            <div className="text-[11px] text-zinc-600 mt-0.5">{formatCreditBadge(m)}</div>
                          </div>
                          {m.isCustom && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 -mr-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-300"
                                  onClick={(e) => { e.stopPropagation(); }}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEdit(m); }}>
                                  <Pencil className="h-4 w-4 mr-1.5" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDelete(m);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      {active && <Check className="h-4 w-4 text-indigo-600 mt-2" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-8 pb-3">
                {filtered.map((m) => {
                  const active = preview?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPreviewId(m.id)}
                      onMouseEnter={() => setPreviewId(m.id)}
                      className={cn(
                        'rounded-xl border p-3 text-left cursor-pointer',
                        active ? 'border-indigo-400 bg-indigo-50/60' : 'border-zinc-200 hover:bg-zinc-50',
                      )}
                    >
                      <div className="text-sm font-semibold truncate flex items-center gap-1">
                        <ModelIcon model={m} className="w-5 h-5 shrink-0" />
                        {m.displayName}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">{providerLabel(m.provider)}</div>
                      <div className="text-[11px] text-zinc-500 mt-2">{formatCreditBadge(m)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="border-l p-4 overflow-auto bg-zinc-50/40">
            {preview ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1">
                      <ModelIcon model={preview} className="w-6 h-6 shrink-0" iconSize={16} />
                      {preview.displayName}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{providerLabel(preview.provider)}</div>
                  </div>
                  {preview.isCustom && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-300">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setShowEdit(preview)}>
                          <Pencil className="h-4 w-4 mr-1.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={() => setShowDelete(preview)}
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="inline-flex text-[11px] font-normal rounded-full bg-zinc-200/70 px-2.5 py-1">
                  {formatCreditBadge(preview)}
                </div>
                <dl className="space-y-3 text-xs">
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-start">
                    <dt className="text-zinc-500 font-medium flex items-start gap-1.5 whitespace-nowrap">
                      <CircleDollarSign className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Credit usage
                    </dt>
                    <dd className="font-normal">
                      {preview.creditsPer1kInput != null
                        ? (
                          <div className="space-y-0.5">
                            <div>{preview.creditsPer1kInput} credits / 1k input tokens</div>
                            <div>{preview.creditsPer1kOutput ?? '—'} credits / 1k output tokens</div>
                          </div>
                        )
                        : preview.isCustom
                          ? 'BYOK (your key)'
                          : '—'}
                    </dd>
                    <dt className="text-zinc-500 font-medium flex items-center gap-1.5 whitespace-nowrap">
                      <MessageSquareText className="w-3.5 h-3.5 shrink-0" />
                      Context window
                    </dt>
                    <dd className="font-normal">{formatTokenCount(preview.contextWindow)} tokens</dd>
                    <dt className="text-zinc-500 font-medium flex items-center gap-1.5 whitespace-nowrap">
                      <Target className="w-3.5 h-3.5 shrink-0" />
                      Output limit
                    </dt>
                    <dd className="font-normal">{formatTokenCount(preview.maxOutputTokens)} tokens</dd>
                    <dt className="text-zinc-500 font-medium flex items-start gap-1.5 whitespace-nowrap">
                      <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Input files
                    </dt>
                    <dd className="font-normal leading-relaxed">
                      {preview.inputFileTypes?.length ? preview.inputFileTypes.join(', ') : '—'}
                    </dd>
                    <dt className="text-zinc-500 font-medium flex items-center gap-1 whitespace-nowrap">
                      <Brain className="w-3.5 h-3.5 shrink-0" />
                      Thinking
                    </dt>
                    <dd className="font-normal">{preview.supportsThinking ? 'Supported' : 'Not supported'}</dd>
                  </div>
                </dl>
                {preview.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed pt-2 border-t">{preview.description}</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">Select a model to preview details.</div>
            )}
          </div>
        </div>

        <div className="border-t px-5 py-3 flex justify-end gap-2 shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="border border-zinc-200">
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!preview}
            onClick={() => {
              if (!preview) return;
              onSelect(preview);
              onOpenChange(false);
            }}
          >
            Select Model
          </Button>
        </div>
      </DialogContent>
      <ModelCreateModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(id) => {
          setShowCreate(false);
          setPreviewId(id);
        }}
      />
      <ModelEditModal
        model={showEdit}
        open={!!showEdit}
        onOpenChange={(op) => !op && setShowEdit(null)}
      />
      <ModelDeleteModal
        model={showDelete}
        open={!!showDelete}
        onOpenChange={(op) => !op && setShowDelete(null)}
      />
    </Dialog>
  );
}

/** Compact trigger that opens the manager */
export function ModelSelectTrigger({
  model,
  onClick,
  className,
}: {
  model?: AiModelView | null;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer',
        className,
      )}
    >
      <Settings2 className="h-3.5 w-3.5 text-zinc-400" />
      <span className="truncate max-w-[140px]">{model?.displayName || 'Select model'}</span>
    </button>
  );
}
