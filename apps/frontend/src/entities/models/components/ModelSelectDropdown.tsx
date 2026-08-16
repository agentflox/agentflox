'use client';

import React from 'react';
import { Check, Search, Settings2, ChevronUp, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AiModelView } from '@agentflox/types';
import { useDefaultModel, useModels } from '../hooks/useModels';
import { filterModels, formatCreditBadge, sortModels } from '../utils';
import { ModelManagerModal, ModelIcon } from './ModelManagerModal';

export function ModelSelectDropdown({
  modelId,
  onModelChange,
  workspaceId,
  className,
  disabled,
}: {
  modelId?: string | null;
  onModelChange: (modelId: string, model: AiModelView) => void;
  workspaceId?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [managerOpen, setManagerOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const { data: models = [] } = useModels({ enabled: open || !!modelId });
  const { data: defaultModel } = useDefaultModel();

  const selected =
    models.find((m) => m.id === modelId) ||
    (modelId ? null : defaultModel) ||
    null;

  const filtered = sortModels(filterModels(models, { search })).slice(0, 40);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-normal text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer transition-colors',
              className,
            )}
          >
            {selected && (
              <ModelIcon model={selected} className="w-4 h-4 shrink-0" iconSize={12} />
            )}
            <span className="truncate max-w-[160px]">
              {selected?.displayName || 'Model'}
            </span>
            <span className="ml-auto flex flex-col items-center shrink-0 -space-y-1">
              <ChevronUp className="h-3 w-3 text-zinc-400" />
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="p-2 border-b flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden cursor-text">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <Input
                variant="ghost"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 cursor-pointer"
              title="Model settings"
              onClick={() => {
                setOpen(false);
                setManagerOpen(true);
              }}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {filtered.map((m) => {
              const active = selected?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-zinc-100 cursor-pointer',
                    active && 'bg-indigo-50',
                  )}
                  onClick={() => {
                    onModelChange(m.id, m);
                    setOpen(false);
                  }}
                >
                  <ModelIcon model={m} className="w-5 h-5 shrink-0" iconSize={14} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.displayName}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{formatCreditBadge(m)}</div>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <ModelManagerModal
        open={managerOpen}
        onOpenChange={setManagerOpen}
        selectedModelId={selected?.id}
        onSelect={(m) => onModelChange(m.id, m)}
      />
    </>
  );
}
