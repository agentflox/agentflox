"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, AtSign, Smile, ChevronDown, ChevronUp, CheckCircle2, MinusCircle, FileText, CircleDot, Check, Hash, Clock, Flag, Plus, Users, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../../types";
import { AssigneeMultiSelect, AssigneeSingleSelect } from "./AssigneeMultiSelect";
import { VariableTagChips, insertVariable } from "./VariableTagChips";
import { useState, useRef } from "react";
import { Popover as EmojiPopover, PopoverContent as EmojiPopoverContent, PopoverTrigger as EmojiPopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { renderCommentText } from "@/features/dashboard/components/comments/CommentsPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { TemplateCenterModal } from "@/entities/templates/components/TemplateCenterModal";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { TaskPickerPopover } from "@/entities/task/components/TaskPickerPopover";
import { cn } from "@/lib/utils";
import type { ActionConfigState } from "./action-config-types";
import { AutomationTemplatePicker, AutomationListHierarchySelect } from "./AutomationSelectHelpers";

export function AddCommentComposer({
  config,
  onChange,
  scope,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  scope: AutomationScope;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const members = trpc.workspace.getMembers.useQuery(
    {
      id: scope.workspaceId || ""
    },
    { enabled: !!scope.workspaceId },
  );
  const scopedMembers: any[] = members.data ?? [];
  const filtered = scopedMembers.filter((m: any) =>
    !assigneeSearch || m.user?.name?.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const mentionItems: { title: string; type: string }[] = scopedMembers.map((m: any) => ({
    title: m.user?.name || "",
    type: "user",
  }));

  const assigneeId: string | undefined = config.userId;
  const assigneeMember = scopedMembers.find((m: any) => m.user?.id === assigneeId);

  const content = config.content || "";

  return (
    <div className="space-y-2">
      {/* Composer box */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-visible shadow-sm focus-within:ring-1 focus-within:ring-zinc-300 focus-within:border-zinc-300 transition-shadow relative">
        {/* Overlay-rendered text (highlights @mentions) */}
        <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden p-4 text-sm">
          {
            content
              ? renderCommentText(content, mentionItems)
              : <span className="text-zinc-400">Comment or type '/' for commands and AI actions</span>
          }
        </div>

        {/* Transparent caret-visible textarea on top */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange({ ...config, content: e.target.value })
          }
          className="w-full resize-none border-0 focus:outline-none focus:ring-0 bg-transparent text-transparent caret-zinc-900 relative z-10 max-h-[250px] min-h-[80px] p-4 text-sm"
          placeholder=""
          rows={3} />

        {/* Variable chips */}
        <div className="px-3 pb-2 -mt-1">
          <VariableTagChips
            onInsert={(tag) =>
              onChange({ ...config, content: insertVariable(content, tag) })
            } />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <div className="flex items-center gap-1 text-zinc-400">
            {/* + button */}
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600">
              <Plus className="h-4 w-4" />
            </Button>

            {/* @ mention */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700"
              onClick={() => {
                onChange({
                  ...config, content: content + "@"
                });
                textareaRef.current?.focus();
              }}
            >
              <AtSign className="h-4 w-4" />
            </Button>

            {/* Assign */}
            <EmojiPopover open={showAssignModal} onOpenChange={setShowAssignModal} >
              <EmojiPopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-full transition-colors",
                    assigneeId
                      ? "border-[1.5px] border-blue-600 bg-blue-50"
                      : "hover:bg-zinc-100 hover:text-zinc-700"
                  )}
                >
                  {assigneeId && assigneeMember ? (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={assigneeMember.user?.image || ""} />
                      <AvatarFallback className="bg-blue-600 text-white text-[9px] font-semibold">
                        {(assigneeMember.user?.name || "U").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </Button>
              </EmojiPopoverTrigger>
              <EmojiPopoverContent align="center" className="w-[240px] p-0 rounded-xl shadow-xl border-zinc-200">
                <div className="p-2 border-b border-zinc-100">
                  <div className="flex items-center px-2 py-1 gap-2 text-zinc-500">
                    <Search className="h-3.5 w-3.5" />
                    <input
                      placeholder="Search or enter email..."
                      className="flex-1 border-0 text-xs focus:ring-0 outline-none placeholder:text-zinc-400"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)} />
                  </div>
                </div>
                <ScrollArea className="max-h-[260px]">
                  <div className="p-2">
                    {/* Triggered by */}
                    <div
                      className="flex items-center gap-3 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer mb-1 bg-zinc-100/80"
                      onClick={() => { onChange({ ...config, userId: undefined }); setShowAssignModal(false); }}
                    >
                      <div className="h-7 w-7 rounded-full bg-slate-600 flex items-center justify-center text-white border-2 border-white shadow-sm shrink-0">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium text-zinc-900">Triggered by</span>
                    </div>
                    {
                      filtered.length > 0 && (
                        <div className="text-[11px] font-medium text-zinc-500 px-2 py-1">People</div>
                      )
                    }
                    {
                      filtered.map((m: any) => (
                        <div
                          key={m.user?.id}
                          className="flex items-center gap-3 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer mb-1"
                          onClick={() => {
                            onChange({
                              ...config, userId: m.user?.id
                            });
                            setShowAssignModal(false);
                          }}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={
                              m.user?.image || ""} />
                            <AvatarFallback className="bg-slate-700 text-white text-[10px]">
                              {(m.user?.name || "U").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-zinc-700">{m.user?.name}</span>
                        </div>
                      ))
                    }
                  </div>
                </ScrollArea>
              </EmojiPopoverContent>
            </EmojiPopover>

            {/* Emoji */}
            <EmojiPopover open={showEmojiPicker} onOpenChange={setShowEmojiPicker} >
              <EmojiPopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                  <Smile className="h-4 w-4" />
                </Button>
              </EmojiPopoverTrigger>
              <EmojiPopoverContent side="top" align="center" sideOffset={16} className="p-0 border-none shadow-xl w-auto bg-transparent z-50">
                <EmojiPicker
                  theme={Theme.LIGHT}
                  onEmojiClick={(emoji: EmojiClickData) => {
                    onChange({ ...config, content: content + emoji.emoji });
                    setShowEmojiPicker(false);
                    textareaRef.current?.focus();
                  }} />
              </EmojiPopoverContent>
            </EmojiPopover>
          </div>
        </div>
      </div>

      {/* Assignee warning */}
      <div className="flex items-start gap-2 rounded-md bg-[#fdf5d3] p-3 text-sm text-[#9b7328]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
        <p> If the assignee doesn't have access to the task, this action will be skipped.</p>
      </div>
    </div>
  );
}

// 笏笏笏 SendChannelMessageConfig 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function SendChannelMessageConfig({
  config,
  onChange,
  channels,
  scope,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  channels: any[];
  scope: AutomationScope;
}) {
  const [openChannel, setOpenChannel] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = channels.filter((c: any) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedChannel = channels.find((c: any) => c.id === config.channelId);

  return (
    <div className="space-y-4">
      {/* Message textarea with variable chips */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <textarea
          className="w-full resize-none border-0 focus:outline-none focus:ring-0 p-4 text-sm min-h-[100px] max-h-[240px] placeholder:text-zinc-400 text-zinc-800"
          placeholder="Message"
          value={config.content || ""}
          onChange={(e) => onChange({ ...config, content: e.target.value })}
          rows={4} />
        <div className="px-3 pb-3 border-t border-zinc-100 pt-2">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Fields from trigger</p>
          <VariableTagChips
            onInsert={(tag) => onChange({ ...config, content: insertVariable(config.content || "", tag) })} />
        </div>
      </div>

      {/* Channel selector */}
      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">
          Channel <span className="text-red-500">*</span>
        </Label>
        <EmojiPopover open={openChannel} onOpenChange={setOpenChannel}>
          <EmojiPopoverTrigger asChild>
            <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 focus:outline-none cursor-pointer">
              {selectedChannel ? (
                <span className="flex items-center gap-2 text-zinc-900">
                  <Hash className="h-3.5 w-3.5 text-zinc-400" />
                  {selectedChannel.name}
                </span>
              ) : (
                <span className="text-zinc-400">Select channel</span>
              )}
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            </button>
          </EmojiPopoverTrigger>
          <EmojiPopoverContent align="start" className="w-[300px] p-0 rounded-xl shadow-xl border-zinc-200">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
              <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <input
                className="flex-1 text-sm outline-none placeholder:text-zinc-400"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus />
            </div>
            <ScrollArea className="max-h-[280px]">
              {filtered.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-6">No channels found</p>
              ) : filtered.map((ch: any) => (
                <button
                  key={ch.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 text-sm text-left cursor-pointer"
                  onClick={() => { onChange({ ...config, channelId: ch.id }); setOpenChannel(false); setSearch(""); }}
                >
                  <Hash className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="text-zinc-800">{ch.name}</span>
                </button>
              ))}
            </ScrollArea>
          </EmojiPopoverContent>
        </EmojiPopover>
      </div>

      {/* Assignee (optional) */}
      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">Assignee</Label>
        <AssigneeMultiSelect
          value={config.assigneeIds}
          onChange={(assigneeIds) => onChange({ ...config, assigneeIds })}
          scope={scope}
          peopleOnly={true}
          hideHeading={true}
        />
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-md bg-[#fdf5d3] p-3 text-sm text-[#9b7328]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
        <p>If the assignee doesn't have access to the task, this action will be skipped.</p>
      </div>
    </div>
  );
}

// 笏笏笏 SendDirectMessageConfig 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function SendDirectMessageConfig({
  config,
  onChange,
  scope,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  scope: AutomationScope;
  members?: any[];
  currentUserId?: string;
}) {
  return (
    <div className="space-y-4">
      {/* Message textarea with variable chips */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <textarea
          className="w-full resize-none border-0 focus:outline-none focus:ring-0 p-4 text-sm min-h-[100px] max-h-[240px] placeholder:text-zinc-400 text-zinc-800"
          placeholder="Message"
          value={config.content || ""}
          onChange={(e) => onChange({ ...config, content: e.target.value })}
          rows={4}
        />
        <div className="px-3 pb-3 border-t border-zinc-100 pt-2">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Fields from trigger</p>
          <VariableTagChips
            onInsert={(tag) => onChange({ ...config, content: insertVariable(config.content || "", tag) })}
          />
        </div>
      </div>

      {/* User selector */}
      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">
          Send to this user <span className="text-red-500">*</span>
        </Label>
        <AssigneeSingleSelect
          value={config.userId}
          onChange={(userId) => onChange({ ...config, userId })}
          scope={scope}
          placeholder="Select a user"
          peopleOnly={true}
          hideHeading={true}
        />
      </div>
    </div>
  );
}

// 笏笏笏 ApplyTemplateConfig 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function ApplyTemplateConfig({
  config,
  onChange,
  scope,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  scope: AutomationScope;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label className="!text-xs !text-zinc-500 font-medium">
        Template <span className="text-red-500">*</span>
      </Label>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-300 cursor-pointer">
        <span className={config.templateName ? "text-zinc-900" : "text-zinc-500"}>
          {config.templateName || "Select a template"}
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>
      <TemplateCenterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workspaceId={scope.workspaceId}
        mode="select"
        onSelectTemplateOnly={(template) => {
          onChange({ ...config, templateId: template.id, templateName: template.name });
          setModalOpen(false);
        }} />
    </div>
  );
}

// 笏笏笏 EstimateTimeConfig 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function EstimateTimeConfig({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  return (
    <div className="space-y-1.5">
      <Label className="!text-xs !text-zinc-500 font-medium">
        {label} <span className="text-red-500">*</span>
      </Label>
      <EmojiPopover open={open} onOpenChange={setOpen}>
        <EmojiPopoverTrigger asChild>
          <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm focus:outline-none cursor-pointer">
            <span className={value ? "text-zinc-900" : "text-zinc-400"}>
              {value || "Select a time"}
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </button>
        </EmojiPopoverTrigger>
        <EmojiPopoverContent align="start" className="w-[260px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-zinc-900">Add time</span>
              <div className="h-4 w-4 rounded-full border border-zinc-300 flex items-center justify-center text-[10px] text-zinc-400 font-bold cursor-help select-none">?</div>
            </div>
            <Input
              className="h-9 text-sm placeholder:text-zinc-400"
              placeholder="Enter '2h', '50m', etc"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  onChange(input.trim());
                  setInput("");
                  setOpen(false);
                }
              }}
              autoFocus
            />
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 h-8 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
                onClick={() => { setInput(""); setOpen(false); }}
              >
                Cancel
              </button>
              <button
                className="flex-1 h-8 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40"
                disabled={!input.trim()}
                onClick={() => {
                  if (input.trim()) {
                    onChange(input.trim());
                    setInput("");
                    setOpen(false);
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </EmojiPopoverContent>
      </EmojiPopover>
    </div>
  );
}

// 笏笏笏 TrackTimeConfig 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function TrackTimeConfig({
  config,
  onChange,
  scope,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  scope: AutomationScope;
}) {
  return (
    <div className="space-y-4">
      <EstimateTimeConfig
        value={config.duration || ""}
        onChange={(duration) => onChange({ ...config, duration })}
        label="Time"
      />
      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">Tracked for</Label>
        <AssigneeSingleSelect
          value={config.userId}
          onChange={(userId) => onChange({ ...config, userId })}
          scope={scope}
          placeholder="Select a user"
        />
      </div>
      <div className="flex items-start gap-2 rounded-md bg-[#fdf5d3] p-3 text-sm text-[#9b7328]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
        <p>If the assignee doesn't have access to the task, this action will be skipped.</p>
      </div>
    </div>
  );
}

// 笏笏笏 DuplicateTaskConfig 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function DuplicateTaskConfig({
  config,
  onChange,
  scope,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  scope: AutomationScope;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">
          List <span className="text-red-500">*</span>
        </Label>
        <AutomationListHierarchySelect
          value={config.listId}
          onChange={(listId) => onChange({ ...config, listId })}
          scope={scope}
          allowCurrent={true}
          placeholder="Select a List"
        />
      </div>

      {/* Link to original task */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="link-original"
          checked={config.relationshipType === "link"}
          onCheckedChange={(c) => onChange({ ...config, relationshipType: c ? "link" : undefined })}
          className="rounded border-zinc-300 cursor-pointer"
        />
        <label htmlFor="link-original" className="text-xs text-zinc-700 font-medium cursor-pointer">
          Link to original task
        </label>
      </div>
    </div>
  );
}

// 笏笏笏 DateUpdateConfig 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function DateUpdateConfig({
  value,
  onChange,
  label,
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  required?: boolean;
}) {
  const parsed = (() => {
    try {
      return JSON.parse(value || "{}");
    } catch {
      return {};
    }
  })();

  const mode = parsed.mode || "days_after";
  const days = parsed.days ?? "";
  const triggerField = parsed.triggerField || "";
  const exactDate = parsed.exactDate || "";

  const update = (updates: any) => {
    onChange(JSON.stringify({ mode, days, triggerField, exactDate, ...updates }));
  };

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [triggerValueOpen, setTriggerValueOpen] = useState(false);
  const [triggerValueSearch, setTriggerValueSearch] = useState("");

  const formatExactDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const TRIGGER_FIELDS = [
    { id: label.toLowerCase().includes("due") ? "start_date" : "due_date", name: label.toLowerCase().includes("due") ? "Start date" : "Due date" },
    { id: "date_created", name: "Date created" },
    { id: "date_updated", name: "Date updated" },
    { id: "date_done", name: "Date done" },
    { id: "date_closed", name: "Date closed" },
  ];

  const filteredTriggerFields = TRIGGER_FIELDS.filter((f) =>
    f.name.toLowerCase().includes(triggerValueSearch.toLowerCase())
  );

  const selectedTriggerFieldName = TRIGGER_FIELDS.find((f) => f.id === triggerField)?.name;

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>

        {/* Mode Selector */}
        <Select value={mode} onValueChange={(v) => update({ mode: v })}>
          <SelectTrigger className="w-full h-9 bg-white border-zinc-200 text-sm font-normal rounded-md shadow-none hover:bg-zinc-50">
            <SelectValue placeholder="Select a date" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl border-zinc-200 bg-white">
            <SelectItem value="days_after">Days after trigger date</SelectItem>
            <SelectItem value="trigger_date">On trigger date</SelectItem>
            <SelectItem value="trigger_datetime">On trigger date and time</SelectItem>
            <SelectItem value="trigger_field">Fields from trigger</SelectItem>
            <SelectItem value="exact_date">Choose a date</SelectItem>
            <SelectItem value="remove">Remove date</SelectItem>
          </SelectContent>
        </Select>

        {/* Sub-inputs based on mode */}
        {mode === "days_after" && (
          <div className="pt-1">
            <Input
              type="number"
              className="h-9 text-sm border-zinc-200 rounded-md placeholder:text-zinc-400 bg-white"
              placeholder="0"
              value={days}
              onChange={(e) => update({ days: e.target.value ? Number(e.target.value) : "" })}
            />
          </div>
        )}

        {mode === "trigger_field" && (
          <div className="pt-1">
            <EmojiPopover open={triggerValueOpen} onOpenChange={setTriggerValueOpen}>
              <EmojiPopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between h-9 px-3 w-full rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm font-normal text-zinc-700 focus:outline-none cursor-pointer"
                >
                  <span>{selectedTriggerFieldName || "Select Trigger Value"}</span>
                  <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                </button>
              </EmojiPopoverTrigger>
              <EmojiPopoverContent align="start" className="w-[240px] p-2 rounded-xl shadow-xl border-zinc-200 bg-white space-y-2">
                <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2">
                  <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0 mr-1.5" />
                  <input
                    type="text"
                    value={triggerValueSearch}
                    onChange={(e) => setTriggerValueSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-transparent border-0 p-0 text-xs outline-none focus:outline-none placeholder:text-zinc-400"
                    autoFocus
                  />
                </div>
                <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
                  {filteredTriggerFields.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        update({ triggerField: f.id });
                        setTriggerValueOpen(false);
                        setTriggerValueSearch("");
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-normal transition-colors cursor-pointer",
                        triggerField === f.id ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                      )}
                    >
                      {f.name}
                    </button>
                  ))}
                  {filteredTriggerFields.length === 0 && (
                    <div className="py-3 text-center text-xs text-zinc-400">No results</div>
                  )}
                </div>
              </EmojiPopoverContent>
            </EmojiPopover>
          </div>
        )}

        {mode === "exact_date" && (
          <div className="pt-1">
            <EmojiPopover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <EmojiPopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm focus:outline-none cursor-pointer"
                >
                  <span className={exactDate ? "text-zinc-900 font-normal" : "text-zinc-400"}>
                    {exactDate ? formatExactDate(exactDate) : "Select a date"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                </button>
              </EmojiPopoverTrigger>
              <EmojiPopoverContent
                side="bottom"
                align="start"
                sideOffset={-72}
                collisionPadding={16}
                avoidCollisions={true}
                className="w-auto p-0 rounded-2xl shadow-2xl border-zinc-200 bg-white overflow-hidden max-h-[85vh] overflow-y-auto"
              >
                <SingleDateCalendar
                  selectedDate={exactDate ? new Date(exactDate) : undefined}
                  onDateChange={(d) => {
                    update({ exactDate: d ? d.toISOString() : "" });
                    setDatePickerOpen(false);
                  }}
                  showTimeInput={false}
                  className="border-none shadow-none"
                />
              </EmojiPopoverContent>
            </EmojiPopover>
          </div>
        )}
      </div>
    </div>
  );
}

// 笏笏笏 AddRelationshipConfig 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function AddRelationshipConfig({
  config,
  onChange,
  scope,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  scope: AutomationScope;
}) {
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);

  const RELATIONSHIP_TYPES = [
    {
      id: "link",
      label: "Link Task",
      subtitle: "Create a relationship between two tasks",
      icon: CheckCircle2,
      iconColor: "text-zinc-700",
    },
    {
      id: "blocked_by",
      label: "Blocked by",
      subtitle: "Tasks that must be completed before this task",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
    },
    {
      id: "blocks",
      label: "Blocks",
      subtitle: "Tasks that can't start until this task is completed",
      icon: MinusCircle,
      iconColor: "text-rose-500",
    },
    {
      id: "link_doc",
      label: "Link Doc",
      subtitle: "Create a reference to a document",
      icon: FileText,
      iconColor: "text-zinc-700",
    },
  ];

  const selectedType = RELATIONSHIP_TYPES.find((r) => r.id === config.relationshipType);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">
          Relationship type <span className="text-red-500">*</span>
        </Label>
        <Select
          value={config.relationshipType || ""}
          onValueChange={(relationshipType) => onChange({ ...config, relationshipType })}
        >
          <SelectTrigger className="w-full h-9 bg-white border-zinc-200 text-sm hover:bg-zinc-50">
            <SelectValue placeholder="Select a relationship">
              {selectedType && (
                <div className="flex items-center gap-2">
                  <selectedType.icon className={cn("h-4 w-4 shrink-0", selectedType.iconColor)} />
                  <span>{selectedType.label}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-[300px] rounded-xl shadow-xl border-zinc-200 bg-white p-1">
            {RELATIONSHIP_TYPES.map((type) => {
              const IconComp = type.icon;
              return (
                <SelectItem key={type.id} value={type.id} className="py-2 px-2.5 rounded-lg cursor-pointer hover:bg-zinc-50 focus:bg-zinc-50 my-0.5">
                  <div className="flex items-start gap-2.5">
                    <IconComp className={cn("h-4 w-4 mt-0.5 shrink-0", type.iconColor)} />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-medium text-zinc-900 leading-tight">{type.label}</span>
                      <span className="text-[11px] text-zinc-400 leading-snug mt-0.5">{type.subtitle}</span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {config.relationshipType && (
        <div className="space-y-1.5">
          <Label className="!text-xs !text-zinc-500 font-medium">
            {config.relationshipType === "link_doc" ? "Document" : "Task"}
          </Label>
          <TaskPickerPopover
            open={taskPickerOpen}
            onOpenChange={setTaskPickerOpen}
            taskId=""
            workspaceId={scope.workspaceId || ""}
            onSelect={(selectedTaskId) => onChange({ ...config, relatedTaskId: selectedTaskId })}
            trigger={
              <button
                type="button"
                className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm focus:outline-none cursor-pointer"
              >
                <span className={config.relatedTaskId ? "text-zinc-900 font-medium" : "text-zinc-400"}>
                  {config.relatedTaskId ? `Selected Task (${config.relatedTaskId.substring(0, 8)}...)` : "Add task"}
                </span>
                <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

// 笏笏笏 AutomationTemplatePicker 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏


