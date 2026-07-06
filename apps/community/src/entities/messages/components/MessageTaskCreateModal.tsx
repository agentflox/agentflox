'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, CheckSquare, Loader2, CalendarDays, CalendarCheck,
  ChevronRight, Briefcase, Layers, FolderKanban, MapPin, Flag, Search, Check,
  Circle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SingleDateCalendar } from '@/components/ui/date-picker';
import { format } from 'date-fns';

// ─── Priority config ─────────────────────────────────────────────────────────
const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent', color: 'text-red-600',    bg: 'bg-red-50',    dot: 'bg-red-500'    },
  { value: 'HIGH',   label: 'High',   color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  { value: 'NORMAL', label: 'Normal', color: 'text-blue-600',   bg: 'bg-blue-50',   dot: 'bg-blue-400'   },
  { value: 'LOW',    label: 'Low',    color: 'text-zinc-500',   bg: 'bg-zinc-100',  dot: 'bg-zinc-400'   },
] as const;
type Priority = typeof PRIORITIES[number]['value'];

// ─── Destination ─────────────────────────────────────────────────────────────
type DestType = 'workspace' | 'space' | 'project';
interface Destination {
  type: DestType; id: string; name: string;
  workspaceId?: string; spaceId?: string;
}

// ─── Destination tree (Popover-based) ────────────────────────────────────────
function DestinationPopover({
  selected, onSelect,
}: {
  selected: Destination | null;
  onSelect: (d: Destination | null) => void;
}) {
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: wsData } = trpc.workspace.list.useQuery({ scope: 'all', page: 1, pageSize: 50 }, { enabled: open });
  const { data: spData } = trpc.space.list.useQuery({ scope: 'all', page: 1, pageSize: 50, includeCounts: false }, { enabled: open });
  const { data: prData } = trpc.project.list.useQuery({ scope: 'all', page: 1, pageSize: 50 }, { enabled: open });

  const workspaces = (wsData?.items ?? []) as any[];
  const spaces     = (spData?.items ?? []) as any[];
  const projects   = (prData?.items ?? []) as any[];
  const q          = search.trim().toLowerCase();

  const rowCls = (active: boolean) => cn(
    'flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer text-left',
    active ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-700 hover:bg-zinc-50',
  );

  const pick = (d: Destination) => { onSelect(d); setOpen(false); setSearch(''); };

  const chip = cn(
    'flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-semibold transition-all border cursor-pointer select-none whitespace-nowrap',
    selected ? 'bg-indigo-50 text-indigo-700 border-transparent' : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300 hover:text-zinc-600',
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={chip}>
          <MapPin className="h-3 w-3" />
          {selected ? (
            <>
              {selected.type === 'workspace' && <Briefcase className="h-2.5 w-2.5 shrink-0" />}
              {selected.type === 'space'     && <Layers className="h-2.5 w-2.5 shrink-0" />}
              {selected.type === 'project'   && <FolderKanban className="h-2.5 w-2.5 shrink-0" />}
              <span className="truncate max-w-[72px]">{selected.name}</span>
              <span className="opacity-50 hover:opacity-100 leading-none" onClick={e => { e.stopPropagation(); onSelect(null); }}>×</span>
            </>
          ) : 'Destination'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[300px] p-0 rounded-2xl shadow-2xl border-zinc-200 overflow-hidden" sideOffset={6}>
        {/* Search */}
        <div className="p-2 border-b border-zinc-100">
          <div className="flex h-8 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 gap-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Search className="h-3 w-3 text-zinc-400 shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…" className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-zinc-400" />
          </div>
        </div>

        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-0.5">
            {workspaces.filter(w => !q || w.name?.toLowerCase().includes(q)).map(ws => {
              const wsSpaces   = spaces.filter(s => s.workspaceId === ws.id && (!q || s.name?.toLowerCase().includes(q)));
              const wsProjects = projects.filter(p => p.workspaceId === ws.id && !p.spaceId && (!q || p.name?.toLowerCase().includes(q)));
              const isExp      = expanded[ws.id] ?? true;

              return (
                <div key={ws.id}>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => setExpanded(prev => ({ ...prev, [ws.id]: !isExp }))}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors shrink-0">
                      <ChevronRight className={cn('h-3 w-3 transition-transform', isExp && 'rotate-90')} />
                    </button>
                    <button type="button" onClick={() => pick({ type: 'workspace', id: ws.id, name: ws.name })} className={rowCls(selected?.type === 'workspace' && selected.id === ws.id)}>
                      <Briefcase className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate flex-1">{ws.name}</span>
                      {selected?.type === 'workspace' && selected.id === ws.id && <Check className="h-3 w-3 text-indigo-600 shrink-0" />}
                    </button>
                  </div>

                  {isExp && (
                    <div className="ml-5 space-y-0.5">
                      {wsSpaces.map(sp => {
                        const spProjects = projects.filter(p => p.spaceId === sp.id && (!q || p.name?.toLowerCase().includes(q)));
                        const spExp      = expanded[`sp-${sp.id}`] ?? true;
                        return (
                          <div key={sp.id}>
                            <div className="flex items-center gap-0.5">
                              {spProjects.length > 0
                                ? <button type="button" onClick={() => setExpanded(prev => ({ ...prev, [`sp-${sp.id}`]: !spExp }))}
                                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors shrink-0">
                                    <ChevronRight className={cn('h-3 w-3 transition-transform', spExp && 'rotate-90')} />
                                  </button>
                                : <span className="w-5 shrink-0" />}
                              <button type="button" onClick={() => pick({ type: 'space', id: sp.id, name: sp.name, workspaceId: ws.id })} className={rowCls(selected?.type === 'space' && selected.id === sp.id)}>
                                <Layers className="h-3 w-3 text-violet-500 shrink-0" />
                                <span className="truncate flex-1">{sp.name}</span>
                                {selected?.type === 'space' && selected.id === sp.id && <Check className="h-3 w-3 text-indigo-600 shrink-0" />}
                              </button>
                            </div>
                            {spExp && spProjects.map(pr => (
                              <div key={pr.id} className="ml-5">
                                <button type="button" onClick={() => pick({ type: 'project', id: pr.id, name: pr.name, workspaceId: ws.id, spaceId: sp.id })} className={rowCls(selected?.type === 'project' && selected.id === pr.id)}>
                                  <FolderKanban className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span className="truncate flex-1">{pr.name}</span>
                                  {selected?.type === 'project' && selected.id === pr.id && <Check className="h-3 w-3 text-indigo-600 shrink-0" />}
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {wsProjects.map(pr => (
                        <button key={pr.id} type="button" onClick={() => pick({ type: 'project', id: pr.id, name: pr.name, workspaceId: ws.id })} className={rowCls(selected?.type === 'project' && selected.id === pr.id)}>
                          <FolderKanban className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="truncate flex-1">{pr.name}</span>
                          {selected?.type === 'project' && selected.id === pr.id && <Check className="h-3 w-3 text-indigo-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface MessageInlineTaskCreateProps {
  messageContent: string;
  isOwnMessage: boolean;
  onClose: () => void;
}

// ─── Inline Card ─────────────────────────────────────────────────────────────
export function MessageInlineTaskCreate({ messageContent, isOwnMessage, onClose }: MessageInlineTaskCreateProps) {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState(messageContent);
  const [priority, setPriority]       = useState<Priority | null>(null);
  const [statusId, setStatusId]       = useState<string | null>(null);
  const [startDate, setStartDate]     = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate]         = useState<Date | undefined>(undefined);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [descOpen, setDescOpen]       = useState(false);

  const cardRef  = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Load statuses — use workspace statuses when destination is a workspace,
  // fall back to system statuses when none selected
  const workspaceId = destination?.type === 'workspace' ? destination.id : destination?.workspaceId;
  const { data: statuses = [] } = trpc.taskStatus.list.useQuery(
    { workspaceId: workspaceId ?? undefined },
    { enabled: true },
  );

  // Auto-focus title on mount
  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 50); }, []);

  // Click-outside closes the card
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Ignore clicks inside Radix portals (Popovers)
      const target = e.target as HTMLElement;
      if (target.closest('[data-radix-popper-content-wrapper]')) return;
      if (cardRef.current && !cardRef.current.contains(target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const createTask = trpc.task.create.useMutation({
    onSuccess: () => { toast.success('Task created', { description: title }); onClose(); },
    onError: err => toast.error('Failed to create task', { description: err.message }),
  });

  const handleSave = useCallback(async () => {
    const t = title.trim();
    if (!t || createTask.isPending) return;
    await createTask.mutateAsync({
      title: t,
      description: description || undefined,
      priority: priority ?? undefined,
      statusId: statusId ?? undefined,
      startDate: startDate ?? undefined,
      dueDate: dueDate ?? undefined,
      workspaceId: destination?.type === 'workspace' ? destination.id : destination?.workspaceId,
      spaceId: destination?.type === 'space' ? destination.id : destination?.spaceId,
      projectId: destination?.type === 'project' ? destination.id : undefined,
    });
  }, [title, description, priority, statusId, startDate, dueDate, destination, createTask]);

  const selectedP = PRIORITIES.find(p => p.value === priority);
  const selectedS = (statuses as any[]).find(s => s.id === statusId);

  const chip = (active: boolean, activeClass: string) => cn(
    'flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-semibold transition-all border cursor-pointer select-none whitespace-nowrap',
    active ? `${activeClass} border-transparent` : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300 hover:text-zinc-600',
  );

  return (
    <div
      ref={cardRef}
      className={cn(
        'mt-2 w-full max-w-[340px] rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-black/8 overflow-hidden',
        'animate-in fade-in slide-in-from-top-1 duration-200',
        isOwnMessage ? 'ml-auto' : 'mr-auto',
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
        <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
          <CheckSquare className="h-3 w-3 text-white" />
        </div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 flex-1">New Task</span>
        <button type="button" onClick={onClose} className="p-1 rounded-full text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Title ── */}
      <div className="px-3 pb-1.5">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSave(); }
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Task title…"
          className="w-full text-[14px] font-semibold text-zinc-900 placeholder:text-zinc-300 bg-transparent border-none outline-none focus:ring-0 leading-snug"
        />
      </div>

      {/* ── Description toggle ── */}
      <div className="px-3 pb-2">
        <button type="button" onClick={() => setDescOpen(v => !v)}
          className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
          {descOpen ? '− Hide description' : '+ Add description'}
        </button>
        {descOpen && (
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description…"
            rows={3}
            className="mt-1.5 w-full text-[12px] text-zinc-700 placeholder:text-zinc-300 bg-zinc-50 rounded-lg border border-zinc-200 px-2.5 py-2 outline-none focus:ring-2 focus:ring-indigo-400/20 resize-none"
          />
        )}
      </div>

      <div className="mx-3 h-px bg-zinc-100" />

      {/* ── Chips row ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap">

        {/* Status */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip(!!statusId, 'bg-zinc-100 text-zinc-700')}>
              <Circle
                className="h-2.5 w-2.5 shrink-0"
                style={selectedS ? { color: selectedS.color, fill: selectedS.color } : undefined}
              />
              {selectedS ? selectedS.name : 'Status'}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-44 p-1.5 rounded-xl shadow-xl border-zinc-200" sideOffset={4}>
            {(statuses as any[]).map(s => (
              <button key={s.id} type="button"
                onClick={() => setStatusId(statusId === s.id ? null : s.id)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer text-zinc-700 hover:bg-zinc-50">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.name}
                {statusId === s.id && <Check className="h-3 w-3 ml-auto text-indigo-600" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Priority */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip(!!priority, `${selectedP?.bg} ${selectedP?.color}`)}>
              {priority
                ? <><span className={cn('w-1.5 h-1.5 rounded-full shrink-0', selectedP?.dot)} />{selectedP?.label}</>
                : <><Flag className="h-3 w-3" />Priority</>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-36 p-1.5 rounded-xl shadow-xl border-zinc-200" sideOffset={4}>
            {PRIORITIES.map(p => (
              <button key={p.value} type="button" onClick={() => setPriority(priority === p.value ? null : p.value)}
                className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer',
                  priority === p.value ? `${p.bg} ${p.color}` : 'text-zinc-700 hover:bg-zinc-50')}>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', p.dot)} />
                {p.label}
                {priority === p.value && <Check className="h-3 w-3 ml-auto" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Start date */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip(!!startDate, 'bg-emerald-50 text-emerald-700')}>
              <CalendarDays className="h-3 w-3" />
              {startDate ? format(startDate, 'MMM d') : 'Start'}
              {startDate && (
                <span className="leading-none opacity-60 hover:opacity-100 cursor-pointer"
                  onClick={e => { e.stopPropagation(); setStartDate(undefined); }}>×</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-auto p-0 rounded-xl shadow-xl border-zinc-200 overflow-hidden" sideOffset={4}>
            <SingleDateCalendar
              selectedDate={startDate}
              onDateChange={setStartDate}
              showTimeInput={false}
              className="border-none shadow-none rounded-xl"
            />
          </PopoverContent>
        </Popover>

        {/* Due date */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip(!!dueDate, 'bg-rose-50 text-rose-700')}>
              <CalendarCheck className="h-3 w-3" />
              {dueDate ? format(dueDate, 'MMM d') : 'Due'}
              {dueDate && (
                <span className="leading-none opacity-60 hover:opacity-100 cursor-pointer"
                  onClick={e => { e.stopPropagation(); setDueDate(undefined); }}>×</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-auto p-0 rounded-xl shadow-xl border-zinc-200 overflow-hidden" sideOffset={4}>
            <SingleDateCalendar
              selectedDate={dueDate}
              onDateChange={setDueDate}
              showTimeInput={false}
              className="border-none shadow-none rounded-xl"
            />
          </PopoverContent>
        </Popover>

        {/* Destination */}
        <DestinationPopover selected={destination} onSelect={setDestination} />
      </div>

      <div className="mx-3 h-px bg-zinc-100" />

      {/* ── Footer ── */}
      <div className="flex items-center justify-end gap-2 px-3 py-2.5">
        <button type="button" onClick={onClose}
          className="text-[12px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer px-2">
          Cancel
        </button>
        <button type="button"
          disabled={!title.trim() || createTask.isPending}
          onClick={() => void handleSave()}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 transition-all cursor-pointer shadow-sm">
          {createTask.isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <><CheckSquare className="h-3 w-3" />Create</>}
        </button>
      </div>
    </div>
  );
}
