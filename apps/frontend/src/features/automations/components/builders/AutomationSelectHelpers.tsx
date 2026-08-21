"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, MinusCircle, ChevronUp, ChevronRight, CircleDot, Diamond, ClipboardList, FileText, Check, Flag, Ban, AlertTriangle, BookOpen, Briefcase, CheckCircle2, Building2, Network, Folder as FolderIconLucide, ListChecks, Lock, Type, Search } from "lucide-react";
import { ALL_FIELDS } from "@/entities/task/constants/fieldTypes";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../../types";
import { useState, useMemo } from "react";
import { Popover as EmojiPopover, PopoverContent as EmojiPopoverContent, PopoverTrigger as EmojiPopoverTrigger } from "@/components/ui/popover";
import { TemplateCenterModal } from "@/entities/templates/components/TemplateCenterModal";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { TaskPickerPopover } from "@/entities/task/components/TaskPickerPopover";
import { cn } from "@/lib/utils";
import type { ActionConfigState } from "./action-config-types";

export function AutomationTemplatePicker({
  templateId,
  templateName,
  onChange,
  scope,
}: {
  templateId?: string;
  templateName?: string;
  onChange: (id: string, name?: string) => void;
  scope: AutomationScope;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-white hover:bg-zinc-50 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
      >
        <span className={templateName || templateId ? "text-zinc-900" : "text-zinc-400"}>
          {templateName || templateId || "Select a template"}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      <TemplateCenterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workspaceId={scope.workspaceId}
        mode="select"
        onSelectTemplateOnly={(template) => {
          onChange(template.id, template.name);
          setModalOpen(false);
        }}
      />
    </>
  );
}


const PRIORITY_OPTIONS = [
  { id: "URGENT", label: "Urgent", fullLabel: "Urgent priority", color: "text-red-600", fillColor: "fill-red-600" },
  { id: "HIGH", label: "High", fullLabel: "High priority", color: "text-amber-500", fillColor: "fill-amber-500" },
  { id: "NORMAL", label: "Normal", fullLabel: "Normal priority", color: "text-blue-500", fillColor: "fill-blue-500" },
  { id: "LOW", label: "Low", fullLabel: "Low priority", color: "text-zinc-400", fillColor: "fill-zinc-400" },
];

export function AutomationPrioritySelect({
  value,
  onChange,
  placeholder = "Select a priority",
}: {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = PRIORITY_OPTIONS.find((p) => p.id === value);

  return (
    <EmojiPopover open={open} onOpenChange={setOpen}>
      <EmojiPopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <Flag className={cn("h-4 w-4 shrink-0", selected.color, selected.fillColor)} />
                <span className="truncate text-sm text-zinc-900">{selected.fullLabel}</span>
              </>
            ) : (
              <span className="text-zinc-400">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </EmojiPopoverTrigger>
      <EmojiPopoverContent align="start" className="w-[180px] p-1.5 rounded-xl shadow-xl border-zinc-200 bg-white">
        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">Priority</div>
        <div className="space-y-0.5">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-normal transition-colors cursor-pointer text-zinc-700 hover:bg-zinc-100/70",
                value === p.id && "bg-zinc-100 font-medium text-zinc-900"
              )}
            >
              <Flag className={cn("h-3.5 w-3.5 shrink-0", p.color, p.fillColor)} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        <Separator className="my-1.5" />
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-normal text-zinc-600 hover:bg-zinc-100/70 transition-colors cursor-pointer"
        >
          <Ban className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span>Clear</span>
        </button>
      </EmojiPopoverContent>
    </EmojiPopover>
  );
}


const RELATIONSHIP_OPTIONS = [
  {
    id: "link",
    label: "Link Task",
    desc: "Link the new task to the triggered task",
    icon: CheckCircle2,
    iconColor: "text-zinc-700",
  },
  {
    id: "blocked_by",
    label: "Blocked by",
    desc: "The new task will wait for the triggered task to complete",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  {
    id: "blocks",
    label: "Blocks",
    desc: "The new task will block the triggered task",
    icon: MinusCircle,
    iconColor: "text-rose-500",
  },
];

export function AutomationRelationshipSelect({
  value = "link",
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = RELATIONSHIP_OPTIONS.find((r) => r.id === value) || RELATIONSHIP_OPTIONS[0];

  return (
    <EmojiPopover open={open} onOpenChange={setOpen}>
      <EmojiPopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-zinc-50"
        >
          <span className="flex items-center gap-2 truncate">
            <selected.icon className={cn("h-4 w-4 shrink-0", selected.iconColor)} />
            <span className="text-sm text-zinc-900">{selected.label}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </EmojiPopoverTrigger>
      <EmojiPopoverContent align="start" className="w-[340px] p-1.5 rounded-xl shadow-xl border-zinc-200 bg-white">
        <div className="space-y-1">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors cursor-pointer hover:bg-zinc-100/70",
                value === opt.id && "bg-zinc-100"
              )}
            >
              <opt.icon className={cn("h-4 w-4 shrink-0 mt-0.5", opt.iconColor)} />
              <div>
                <div className="text-xs font-medium text-zinc-900">{opt.label}</div>
                <div className="text-[11px] text-zinc-500 leading-snug">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </EmojiPopoverContent>
    </EmojiPopover>
  );
}


const TASK_TYPE_OPTIONS = [
  { id: "TASK", label: "Task", icon: CircleDot },
  { id: "MILESTONE", label: "Milestone", icon: Diamond },
  { id: "FORM_RESPONSE", label: "Form Response", icon: ClipboardList },
  { id: "MEETING_NOTE", label: "Meeting Note", icon: FileText },
];

export function AutomationTaskTypeSelect({
  value = "TASK",
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = TASK_TYPE_OPTIONS.find((t) => t.id === value) || TASK_TYPE_OPTIONS[0];

  return (
    <EmojiPopover open={open} onOpenChange={setOpen}>
      <EmojiPopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-zinc-50"
        >
          <span className="flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-0.5 border border-zinc-200 text-xs font-medium text-zinc-800">
            <selected.icon className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
            <span>{selected.label}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </EmojiPopoverTrigger>
      <EmojiPopoverContent align="start" className="w-[200px] p-1.5 rounded-xl shadow-xl border-zinc-200 bg-white">
        <div className="space-y-0.5">
          {TASK_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-normal text-zinc-800 hover:bg-zinc-100/70 transition-colors cursor-pointer",
                value === opt.id && "bg-zinc-100 font-medium"
              )}
            >
              <div className="flex items-center gap-2">
                <opt.icon className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <span>{opt.label}</span>
              </div>
              {value === opt.id && <Check className="h-3.5 w-3.5 text-zinc-800 stroke-[2.5]" />}
            </button>
          ))}
        </div>
      </EmojiPopoverContent>
    </EmojiPopover>
  );
}


export function getCustomFieldMeta(field?: any) {
  if (!field) return { icon: Type, color: "text-purple-600" };
  const rawType = ((field.config as any)?.fieldType || field.type || "").toUpperCase();
  const rawName = (field.name || "").toLowerCase();

  if (rawName === "summary" || rawType === "SUMMARY") {
    return { icon: Type, color: "text-purple-600" };
  }

  const found = ALL_FIELDS.find(
    (f) => f.type.toUpperCase() === rawType || f.id.toUpperCase() === rawType || f.label.toUpperCase() === rawType
  );
  if (found) {
    return { icon: found.icon, color: found.color };
  }
  return { icon: Type, color: "text-purple-600" };
}

export function AutomationCustomFieldSelect({
  value,
  onChange,
  fields = [],
  placeholder = "Select a custom field",
}: {
  value?: string;
  onChange: (val: string) => void;
  fields?: any[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedField = fields.find((f: any) => f.id === value);
  const selectedMeta = getCustomFieldMeta(selectedField);
  const SelectedIcon = selectedMeta.icon;

  const filteredFields = fields.filter((f: any) =>
    (f.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <EmojiPopover open={open} onOpenChange={setOpen}>
      <EmojiPopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-50/80 transition-colors text-left cursor-pointer"
        >
          {selectedField ? (
            <div className="flex items-center gap-2 min-w-0">
              <SelectedIcon className={cn("h-4 w-4 shrink-0", selectedMeta.color)} />
              <span className="truncate text-zinc-900 font-normal">{selectedField.name}</span>
            </div>
          ) : (
            <span className="text-zinc-500 font-normal">{placeholder}</span>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-zinc-500 shrink-0 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0 ml-2" />
          )}
        </button>
      </EmojiPopoverTrigger>
      <EmojiPopoverContent
        className="w-[var(--radix-popover-trigger-width,300px)] min-w-[240px] p-0 shadow-lg rounded-lg border border-zinc-200 bg-white overflow-hidden"
        align="start"
      >
        <div className="p-2 border-b border-zinc-100">
          <div className="flex items-center gap-2 px-2.5 h-8 bg-zinc-50/70 border border-zinc-200 rounded-md focus-within:border-zinc-300">
            <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-400 text-zinc-800"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[220px] overflow-y-auto p-1 space-y-0.5">
          {filteredFields.length > 0 ? (
            filteredFields.map((field: any) => {
              const meta = getCustomFieldMeta(field);
              const Icon = meta.icon;
              const isSelected = field.id === value;
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => {
                    onChange(field.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left text-sm transition-colors cursor-pointer",
                    isSelected ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
                  <span className="truncate flex-1">{field.name}</span>
                </button>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-zinc-400">
              No custom fields found
            </div>
          )}
        </div>
      </EmojiPopoverContent>
    </EmojiPopover>
  );
}


export function UpdateTaskTypeConfig({
  config,
  onChange,
  scope,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  scope: AutomationScope;
}) {
  const [open, setOpen] = useState(false);

  const { data: taskTypes = [] } = trpc.task.listTaskTypes.useQuery(
    { workspaceId: scope.workspaceId || undefined },
    { enabled: !!scope.workspaceId }
  );

  const DEFAULT_TASK_TYPES = [
    { id: "task", name: "Task", icon: CircleDot },
    { id: "milestone", name: "Milestone", icon: Diamond },
    { id: "form_response", name: "Form Response", icon: ClipboardList },
    { id: "meeting_note", name: "Meeting Note", icon: FileText },
  ];

  const typesList = taskTypes.length > 0
    ? taskTypes.map((t: any) => ({
      id: t.id,
      name: t.name,
      icon: t.name.toLowerCase().includes("milestone")
        ? Diamond
        : t.name.toLowerCase().includes("form")
          ? ClipboardList
          : t.name.toLowerCase().includes("meeting")
            ? FileText
            : CircleDot,
    }))
    : DEFAULT_TASK_TYPES;

  const selectedId = config.taskTypeId || typesList[0]?.id || "task";
  const selectedType = typesList.find((t) => t.id === selectedId) || typesList[0];
  const SelectedIcon = selectedType?.icon || CircleDot;

  return (
    <div className="space-y-1.5">
      <EmojiPopover open={open} onOpenChange={setOpen}>
        <EmojiPopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center h-10 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-sm focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100/70 border border-zinc-200/60 text-xs font-medium text-zinc-800">
              <SelectedIcon className="h-3.5 w-3.5 text-zinc-600" />
              <span>{selectedType?.name || "Task"}</span>
            </div>
          </button>
        </EmojiPopoverTrigger>
        <EmojiPopoverContent align="start" className="w-[220px] p-1.5 rounded-xl shadow-xl border-zinc-200 bg-white">
          <div className="space-y-0.5">
            {typesList.map((t) => {
              const IconComp = t.icon;
              const isSelected = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange({ ...config, taskTypeId: t.id });
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left",
                    isSelected ? "bg-zinc-100 text-zinc-900 font-semibold" : "text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>{t.name}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-zinc-900 shrink-0" />}
                </button>
              );
            })}
          </div>
        </EmojiPopoverContent>
      </EmojiPopover>
    </div>
  );
}


type LocationOption = {
  key: string;
  label: string;
  kind: "space" | "project" | "team" | "folder";
  depth: number;
};

export function AutomationLocationSelect({
  value,
  onChange,
  scope,
  placeholder = "Select a Location",
}: {
  value?: string;
  onChange: (key: string) => void;
  scope: AutomationScope;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: spacesData } = trpc.space.list.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );
  const { data: projectsData } = trpc.project.list.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );
  const { data: teamsData } = trpc.team.list.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );
  const { data: foldersData } = trpc.folder.byContext.useQuery(
    { workspaceId: scope.workspaceId || "" } as any,
    { enabled: !!scope.workspaceId }
  );

  const spaces = spacesData?.items || [];
  const projects = projectsData?.items || [];
  const teams = teamsData?.items || [];
  const folders = foldersData?.items || [];

  const destinationOptions = useMemo<LocationOption[]>(() => {
    const opts: LocationOption[] = [];
    spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: "space", label: s.name, depth: 0 }));
    projects.forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: "project", label: p.name, depth: p.spaceId ? 1 : 0 }));
    teams.forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: "team", label: t.name, depth: t.spaceId ? 1 : 0 }));
    folders.forEach((f: any) => {
      const depth = f.parentId ? 2 : f.spaceId || f.projectId || f.teamId ? 1 : 0;
      opts.push({ key: `FOLDER:${f.id}`, kind: "folder", label: f.name, depth });
    });
    return opts;
  }, [spaces, projects, teams, folders]);

  const treeNodes = useMemo(() => {
    const spaceNodes = spaces.map((space: any) => {
      const sid = space.id;
      const underSpace = destinationOptions.filter(o =>
        (o.kind === "project" || o.kind === "team") &&
        (projects.find((p: any) => p.id === o.key.split(":")[1])?.spaceId === sid ||
          teams.find((t: any) => t.id === o.key.split(":")[1])?.spaceId === sid)
      );
      const foldersUnder = destinationOptions.filter(
        o => o.kind === "folder" &&
          folders.find((f: any) => f.id === o.key.split(":")[1])?.spaceId === sid &&
          !folders.find((f: any) => f.id === o.key.split(":")[1])?.projectId &&
          !folders.find((f: any) => f.id === o.key.split(":")[1])?.teamId
      );
      const children: LocationOption[] = [
        ...underSpace.map(o => ({ ...o, depth: 1 })),
        ...foldersUnder.map(o => ({ ...o, depth: 1 })),
      ];
      return { key: `SPACE:${sid}`, name: space.name, children };
    });

    const rootItems = destinationOptions.filter(o => {
      if (o.kind === "project") return !projects.find((p: any) => p.id === o.key.split(":")[1])?.spaceId;
      if (o.kind === "team") return !teams.find((t: any) => t.id === o.key.split(":")[1])?.spaceId;
      if (o.kind === "folder") {
        const f = folders.find((f: any) => f.id === o.key.split(":")[1]);
        return !f?.spaceId && !f?.projectId && !f?.teamId;
      }
      return false;
    }).map(o => ({ ...o, depth: 0 }));

    return { spaceNodes, rootItems };
  }, [destinationOptions, spaces, projects, teams, folders]);

  const selectedOpt = destinationOptions.find(o => o.key === value);

  const kindIcon = (kind: string) => {
    if (kind === "space") return <Network className="size-3.5 text-slate-400 shrink-0" />;
    if (kind === "project") return <Briefcase className="size-3.5 text-indigo-400 shrink-0" />;
    if (kind === "team") return <Building2 className="size-3.5 text-blue-400 shrink-0" />;
    return <FolderIconLucide className="size-3.5 text-slate-400 shrink-0" />;
  };

  const filteredSpaces = treeNodes.spaceNodes.filter(
    s => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.children.some(c => c.label.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredRoot = treeNodes.rootItems.filter(
    r => !search.trim() || r.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <EmojiPopover open={open} onOpenChange={setOpen}>
      <EmojiPopoverTrigger asChild>
        <button
          type="button"
          className="h-9 w-full border border-input bg-white text-sm text-zinc-700 rounded-md px-3 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className={cn("truncate text-left flex items-center gap-1.5", !selectedOpt && "text-zinc-400")}>
            {selectedOpt ? (
              <>
                {kindIcon(selectedOpt.kind)}
                <span>{selectedOpt.label}</span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className="size-4 opacity-50 shrink-0" />
        </button>
      </EmojiPopoverTrigger>
      <EmojiPopoverContent align="start" className="w-[340px] p-0 shadow-lg rounded-xl overflow-hidden border-zinc-200">
        <div className="p-2 border-b border-slate-100">
          <div className="flex items-center rounded-md border border-zinc-200 px-2 h-8">
            <Search className="size-3.5 text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search locations..."
              className="w-full bg-transparent px-2 text-xs outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filteredSpaces.map(space => (
            <div key={space.key}>
              <button
                type="button"
                onClick={() => { onChange(space.key); setOpen(false); setSearch(""); }}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 text-left text-[13px] cursor-pointer hover:bg-slate-50 px-3",
                  value === space.key && "bg-indigo-50 text-indigo-700"
                )}
              >
                <span className="flex items-center gap-2">
                  <Network className="size-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-xs">{space.name}</span>
                </span>
                {value === space.key && <Check className="size-3.5 text-indigo-600 shrink-0" />}
              </button>
              {space.children
                .filter(c => !search.trim() || c.label.toLowerCase().includes(search.toLowerCase()))
                .map(child => (
                  <button
                    type="button"
                    key={child.key}
                    onClick={() => { onChange(child.key); setOpen(false); setSearch(""); }}
                    className={cn(
                      "w-full flex items-center justify-between py-1.5 text-left text-xs cursor-pointer hover:bg-slate-50",
                      value === child.key && "bg-indigo-50 text-indigo-700"
                    )}
                    style={{ paddingLeft: `${child.depth * 14 + 14}px` }}
                  >
                    <span className="flex items-center gap-2">
                      {kindIcon(child.kind)}
                      <span>{child.label}</span>
                    </span>
                    {value === child.key && <Check className="size-3.5 text-indigo-600 shrink-0 mr-1" />}
                  </button>
                ))
              }
            </div>
          ))}
          {filteredRoot.map(item => (
            <button
              type="button"
              key={item.key}
              onClick={() => { onChange(item.key); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full flex items-center justify-between py-1.5 text-left text-xs cursor-pointer hover:bg-slate-50 px-3",
                value === item.key && "bg-indigo-50 text-indigo-700"
              )}
            >
              <span className="flex items-center gap-2">
                {kindIcon(item.kind)}
                <span>{item.label}</span>
              </span>
              {value === item.key && <Check className="size-3.5 text-indigo-600 shrink-0" />}
            </button>
          ))}
          {filteredSpaces.length === 0 && filteredRoot.length === 0 && (
            <div className="py-4 text-center text-xs text-zinc-400">No locations found</div>
          )}
        </div>
      </EmojiPopoverContent>
    </EmojiPopover>
  );
}


export function AutomationListHierarchySelect({
  value,
  onChange,
  scope,
  allowCurrent = true,
  placeholder = "Select a List",
}: {
  value?: string;
  onChange: (listId: string) => void;
  scope: AutomationScope;
  allowCurrent?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const { data: listsData } = trpc.list.byContext.useQuery(
    { workspaceId: scope.workspaceId || "" } as any,
    { enabled: !!scope.workspaceId }
  );

  const { data: workspaceData } = trpc.workspace.get.useQuery(
    { id: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );

  const effectiveProjects = workspaceData?.projects || [];
  const effectiveTeams = workspaceData?.teams || [];

  // 笏笏笏 Recent 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏Lists from localStorage
  const [recentListIds, setRecentListIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("agentflox-recent-lists");
      if (stored) setRecentListIds(JSON.parse(stored));
    } catch { }
  }, []);

  const addToRecents = (listId: string) => {
    if (!listId || listId === "current" || listId === "personal" || listId === "CREATE_NEW_LIST") return;
    const next = [listId, ...recentListIds.filter((id) => id !== listId)].slice(0, 5);
    setRecentListIds(next);
    try {
      localStorage.setItem("agentflox-recent-lists", JSON.stringify(next));
    } catch { }
  };

  // 笏笏笏 Group 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏Lists Hierarchy matching TaskCreationModal.tsx
  const hierarchy = useMemo(() => {
    const rawLists = listsData?.items || [];
    const spacesMap = new Map<string, { id: string; name: string; projects: Map<string, any>; teams: Map<string, any>; folders: Map<string, any>; lists: any[] }>();
    const rootProjectsMap = new Map<string, { id: string; name: string; folders: Map<string, any>; lists: any[] }>();
    const rootTeamsMap = new Map<string, { id: string; name: string; folders: Map<string, any>; lists: any[] }>();
    const rootFoldersMap = new Map<string, { id: string; name: string; lists: any[] }>();
    const rootLists: any[] = [];

    const getTeamName = (id: string) => effectiveTeams.find((t: any) => t.id === id)?.name || "Team";
    const getProjectName = (id: string) => effectiveProjects.find((p: any) => p.id === id)?.name || "Project";

    rawLists.forEach((list: any) => {
      const folderObj = list.folder ? { id: list.folder.id, name: list.folder.name, lists: [] } : null;

      if (list.spaceId) {
        if (!spacesMap.has(list.spaceId)) {
          spacesMap.set(list.spaceId, { id: list.spaceId, name: list.space?.name || "Space", projects: new Map(), teams: new Map(), folders: new Map(), lists: [] });
        }
        const space = spacesMap.get(list.spaceId)!;

        if (list.projectId) {
          if (!space.projects.has(list.projectId)) space.projects.set(list.projectId, { id: list.projectId, name: list.project?.name || getProjectName(list.projectId), folders: new Map(), lists: [] });
          const project = space.projects.get(list.projectId)!;
          if (folderObj) {
            if (!project.folders.has(folderObj.id)) project.folders.set(folderObj.id, { ...folderObj });
            project.folders.get(folderObj.id)!.lists.push(list);
          } else {
            project.lists.push(list);
          }
        } else if (list.teamId) {
          if (!space.teams.has(list.teamId)) space.teams.set(list.teamId, { id: list.teamId, name: getTeamName(list.teamId), folders: new Map(), lists: [] });
          const team = space.teams.get(list.teamId)!;
          if (folderObj) {
            if (!team.folders.has(folderObj.id)) team.folders.set(folderObj.id, { ...folderObj });
            team.folders.get(folderObj.id)!.lists.push(list);
          } else {
            team.lists.push(list);
          }
        } else if (folderObj) {
          if (!space.folders.has(folderObj.id)) space.folders.set(folderObj.id, { ...folderObj });
          space.folders.get(folderObj.id)!.lists.push(list);
        } else {
          space.lists.push(list);
        }
      } else if (list.projectId) {
        if (!rootProjectsMap.has(list.projectId)) rootProjectsMap.set(list.projectId, { id: list.projectId, name: list.project?.name || getProjectName(list.projectId), folders: new Map(), lists: [] });
        const project = rootProjectsMap.get(list.projectId)!;
        if (folderObj) {
          if (!project.folders.has(folderObj.id)) project.folders.set(folderObj.id, { ...folderObj });
          project.folders.get(folderObj.id)!.lists.push(list);
        } else {
          project.lists.push(list);
        }
      } else if (list.teamId) {
        if (!rootTeamsMap.has(list.teamId)) rootTeamsMap.set(list.teamId, { id: list.teamId, name: getTeamName(list.teamId), folders: new Map(), lists: [] });
        const team = rootTeamsMap.get(list.teamId)!;
        if (folderObj) {
          if (!team.folders.has(folderObj.id)) team.folders.set(folderObj.id, { ...folderObj });
          team.folders.get(folderObj.id)!.lists.push(list);
        } else {
          team.lists.push(list);
        }
      } else if (folderObj) {
        if (!rootFoldersMap.has(folderObj.id)) rootFoldersMap.set(folderObj.id, { ...folderObj });
        rootFoldersMap.get(folderObj.id)!.lists.push(list);
      } else {
        rootLists.push(list);
      }
    });

    return {
      spaces: Array.from(spacesMap.values()),
      projects: Array.from(rootProjectsMap.values()),
      teams: Array.from(rootTeamsMap.values()),
      folders: Array.from(rootFoldersMap.values()),
      lists: rootLists,
    };
  }, [listsData?.items, effectiveProjects, effectiveTeams]);

  const recentLists = useMemo(() => {
    if (!listsData?.items) return [];
    return recentListIds
      .map((id) => listsData.items.find((l: any) => l.id === id))
      .filter(Boolean) as any[];
  }, [recentListIds, listsData?.items]);

  const toggleNode = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedLabel = useMemo(() => {
    if (value === "current") return "Current List";
    if (value === "personal") return "Personal List";
    if (!value) return placeholder;
    for (const r of recentLists) {
      if (r.id === value) return r.name;
    }
    for (const space of hierarchy.spaces) {
      for (const list of space.lists) {
        if (list.id === value) return list.name;
      }
      for (const proj of Array.from(space.projects.values() as any)) {
        for (const list of (proj as any).lists) {
          if (list.id === value) return list.name;
        }
        for (const folder of Array.from((proj as any).folders.values() as any)) {
          for (const list of (folder as any).lists) {
            if (list.id === value) return list.name;
          }
        }
      }
      for (const team of Array.from(space.teams.values() as any)) {
        for (const list of (team as any).lists) {
          if (list.id === value) return list.name;
        }
        for (const folder of Array.from((team as any).folders.values() as any)) {
          for (const list of (folder as any).lists) {
            if (list.id === value) return list.name;
          }
        }
      }
      for (const folder of Array.from(space.folders.values() as any)) {
        for (const list of (folder as any).lists) {
          if (list.id === value) return list.name;
        }
      }
    }
    for (const list of hierarchy.lists) {
      if (list.id === value) return list.name;
    }
    return value;
  }, [value, recentLists, hierarchy, placeholder]);

  const q = search.trim().toLowerCase();

  const filteredRecentLists = recentLists.filter((l) =>
    !q || l.name.toLowerCase().includes(q)
  );

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
    if (id && id !== "current" && id !== "personal") {
      addToRecents(id);
    }
  };

  return (
    <EmojiPopover open={open} onOpenChange={setOpen}>
      <EmojiPopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-9 w-full bg-white border border-zinc-200 text-sm rounded-lg px-3 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors text-left",
            !value && "text-zinc-400"
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        </button>
      </EmojiPopoverTrigger>
      <EmojiPopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-[280px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white overflow-hidden max-h-[380px] flex flex-col z-50"
      >
        {/* Search */}
        <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 mx-2.5 mt-2.5 mb-1.5 shrink-0 focus-within:border-zinc-400">
          <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0 mr-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent border-0 p-0 text-xs outline-none placeholder:text-zinc-400"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 py-1">
          {/* Personal List */}
          {(!q || "personal list".includes(q)) && (
            <>
              <button
                type="button"
                onClick={() => handleSelect("personal")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                  value === "personal" && "bg-zinc-100 font-semibold"
                )}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-zinc-600 shrink-0" />
                  <span className="text-zinc-800">Personal List</span>
                </div>
                {value === "personal" && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
              </button>
              <Separator className="my-1" />
            </>
          )}

          {/* Recents */}
          {filteredRecentLists.length > 0 && (
            <div className="px-1 py-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">Recents</div>
              {filteredRecentLists.map((l: any) => {
                const isSelected = value === l.id;
                return (
                  <button
                    key={`recent-${l.id}`}
                    type="button"
                    onClick={() => handleSelect(l.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                      isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ListChecks className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{l.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {l.taskCount !== undefined && l.taskCount > 0 && (
                        <span className="text-[11px] text-zinc-400">{l.taskCount}</span>
                      )}
                      {isSelected && <Check className="h-4 w-4 text-zinc-900 shrink-0" />}
                    </div>
                  </button>
                );
              })}
              <Separator className="my-1" />
            </div>
          )}

          {/* Spaces Hierarchy */}
          {hierarchy.spaces.length > 0 && (
            <div className="px-1 py-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">Spaces</div>
              {hierarchy.spaces.map((space: any) => {
                const isSpaceCollapsed = collapsedNodes.has(`space-${space.id}`);
                return (
                  <div key={`space-${space.id}`} className="space-y-0.5">
                    <div
                      className="px-2 py-1.5 text-xs font-semibold text-zinc-800 flex items-center gap-2 cursor-pointer hover:bg-zinc-50 rounded-md transition-colors select-none"
                      onClick={(e) => toggleNode(e, `space-${space.id}`)}
                    >
                      <div className="h-4 w-4 rounded bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        <Users className="h-2.5 w-2.5" />
                      </div>
                      <span className="truncate flex-1">{space.name}</span>
                    </div>

                    {!isSpaceCollapsed && (
                      <div className="space-y-0.5">
                        {/* Space's Folders */}
                        {Array.from(space.folders.values() as any).map((folder: any) => {
                          const isFolderCollapsed = collapsedNodes.has(`folder-${folder.id}`);
                          return (
                            <div key={`folder-${folder.id}`} className="space-y-0.5">
                              <div
                                className="px-2 pl-6 py-1 text-xs text-zinc-700 flex items-center gap-2 cursor-pointer hover:bg-zinc-50 rounded-md transition-colors select-none"
                                onClick={(e) => toggleNode(e, `folder-${folder.id}`)}
                              >
                                <FolderIconLucide className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                <span className="truncate flex-1">{folder.name}</span>
                              </div>

                              {!isFolderCollapsed &&
                                folder.lists.map((list: any) => {
                                  const isSelected = value === list.id;
                                  if (q && !list.name.toLowerCase().includes(q)) return null;
                                  return (
                                    <button
                                      key={`flist-${list.id}`}
                                      type="button"
                                      onClick={() => handleSelect(list.id)}
                                      className={cn(
                                        "w-full flex items-center justify-between px-2 pl-9 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                                        isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <ListChecks className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                        <span className="truncate">{list.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {list.taskCount !== undefined && list.taskCount > 0 && (
                                          <span className="text-[11px] text-zinc-400">{list.taskCount}</span>
                                        )}
                                        {isSelected && <Check className="h-4 w-4 text-zinc-900 shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          );
                        })}

                        {/* Direct Space Lists */}
                        {space.lists.map((list: any) => {
                          const isSelected = value === list.id;
                          if (q && !list.name.toLowerCase().includes(q)) return null;
                          return (
                            <button
                              key={`slist-${list.id}`}
                              type="button"
                              onClick={() => handleSelect(list.id)}
                              className={cn(
                                "w-full flex items-center justify-between px-2 pl-6 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                                isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <ListChecks className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                <span className="truncate">{list.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {list.taskCount !== undefined && list.taskCount > 0 && (
                                  <span className="text-[11px] text-zinc-400">{list.taskCount}</span>
                                )}
                                {isSelected && <Check className="h-4 w-4 text-zinc-900 shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </EmojiPopoverContent>
    </EmojiPopover>
  );
}


const STATUS_FALLBACK_OPTIONS = [
  { id: "skip", label: "Skip this action", display: "skip this action" },
  { id: "first", label: "Use the first status available", display: "use the first status available" },
  { id: "create", label: "Create a new status", display: "create a new status" },
];

export function StatusFallbackWarning({
  value = "skip",
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const currentOption = STATUS_FALLBACK_OPTIONS.find((o) => o.id === value) || STATUS_FALLBACK_OPTIONS[0];

  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-[#fdf5d3] p-3 text-sm text-[#9b7328]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
      <div className="flex-1">
        <p className="leading-snug">
          If the status doesn't exist in the List, then:
        </p>
        <EmojiPopover open={open} onOpenChange={setOpen}>
          <EmojiPopoverTrigger asChild>
            <button
              type="button"
              className="inline-block mt-0.5 underline decoration-dashed decoration-[#cbb36c] underline-offset-4 font-semibold text-[#8c651e] hover:text-[#6e4e13] cursor-pointer focus:outline-none"
            >
              {currentOption.display}
            </button>
          </EmojiPopoverTrigger>
          <EmojiPopoverContent align="start" className="w-[230px] p-1.5 rounded-xl shadow-xl border-zinc-200 bg-white z-50">
            <div className="space-y-0.5">
              {STATUS_FALLBACK_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
                    opt.id === currentOption.id && "bg-zinc-100/80 font-medium text-zinc-800"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </EmojiPopoverContent>
        </EmojiPopover>
      </div>
    </div>
  );
}

