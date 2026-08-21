"use client";

import { useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Calendar, Info, Search, Plus, ChevronDown, ChevronUp, Type, Flag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ALL_FIELDS } from "@/entities/task/constants/fieldTypes";
import { AddCustomFieldModal } from "@/entities/task/components/AddCustomFieldModal";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import type { AutomationScope } from "../../types";
import type { AutomationTriggerTypeV1 } from "../../triggerCatalog";
import { Checkbox } from "@/components/ui/checkbox";

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgent", color: "text-red-600", fillColor: "fill-red-500" },
  { value: "HIGH", label: "High", color: "text-orange-600", fillColor: "fill-orange-500" },
  { value: "NORMAL", label: "Normal", color: "text-blue-600", fillColor: "fill-blue-500" },
  { value: "LOW", label: "Low", color: "text-zinc-500", fillColor: "fill-zinc-400" },
  { value: "NONE", label: "No Priority", color: "text-zinc-400", fillColor: "" },
];

export type TriggerConfigState = {
  customFieldId?: string;
  fromValue?: string;
  toValue?: string;
  runOnCreate?: boolean;
  runOnUpdate?: boolean;
  fromStatusId?: string | string[];
  toStatusId?: string | string[];
  assigneeIds?: string[];
  tag?: string;
  cronExpression?: string;
  cronRepeat?: string;
  cronCustomInterval?: number;
  cronCustomPeriod?: "Day" | "Week" | "Month" | "Year";
  cronCustomDays?: string[];
  cronTime?: string;
  cronStartDate?: string;
  cronTimezone?: string;
  cronEnds?: string;
  dateMode?: "before" | "after";
  dateAmount?: number;
  dateUnit?: "Hours" | "Days" | "Weeks";
  dateField?: "start_date" | "due_date";
  fromTaskTypeId?: string;
  toTaskTypeId?: string;
  fromPriority?: string;
  toPriority?: string;
};

const ANY = "__any__";
const EMPTY = "__empty__";

import { CronBuilder } from "./CronBuilder";
import { StatusMultiSelect } from "./StatusMultiSelect";
import { AssigneeMultiSelect } from "./AssigneeMultiSelect";
import { TagTriggerSelect } from "./TagTriggerSelect";

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return <p className="text-xs italic text-red-500 mt-1">{message}</p>;
}

function getCustomFieldMeta(field?: any) {
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

function CustomFieldSelect({
  value,
  onChange,
  fields,
  workspaceId,
  scope,
}: {
  value?: string;
  onChange: (id: string) => void;
  fields: any[];
  workspaceId?: string;
  scope: AutomationScope;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const selectedField = fields.find((f: any) => f.id === value);
  const selectedMeta = getCustomFieldMeta(selectedField);
  const SelectedIcon = selectedMeta.icon;

  const filteredFields = fields.filter((f: any) =>
    (f.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-50/80 transition-colors text-left cursor-pointer"
          >
            {selectedField ? (
              <div className="flex items-center gap-2 min-w-0">
                <SelectedIcon className={cn("h-4 w-4 shrink-0", selectedMeta.color)} />
                <span className="truncate text-zinc-900 font-normal">{selectedField.name}</span>
              </div>
            ) : (
              <span className="text-zinc-500 font-normal">Create a new custom field</span>
            )}
            {open ? (
              <ChevronUp className="h-4 w-4 text-zinc-500 shrink-0 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0 ml-2" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
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

          <div className="border-t border-zinc-100 p-1 bg-white">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAddModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors font-normal cursor-pointer"
            >
              <Plus className="h-4 w-4 text-zinc-600 shrink-0" />
              <span>Create new field</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {workspaceId && (
        <AddCustomFieldModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          workspaceId={workspaceId}
          taskId=""
          spaceId={scope.spaceId}
          projectId={scope.projectId}
          teamId={scope.teamId}
          folderId={scope.folderId}
          listId={scope.listId}
        />
      )}
    </>
  );
}

function DateCustomFieldSelect({
  value,
  onChange,
  fields,
}: {
  value?: string;
  onChange: (id: string) => void;
  fields: any[];
}) {
  const [open, setOpen] = useState(false);

  const isDateField = (f: any) => {
    const rawType = ((f.config as any)?.fieldType || f.type || "").toUpperCase();
    return rawType === "DATE" || rawType === "DATETIME" || (f.name || "").toLowerCase().includes("date");
  };

  const dateFields = fields.filter(isDateField);
  const selectedField = dateFields.find((f: any) => f.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
            {selectedField ? (
              <span className="truncate text-zinc-900 font-normal">{selectedField.name}</span>
            ) : (
              <span className="italic text-zinc-800 font-normal">No Date Custom Fields available</span>
            )}
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-zinc-500 shrink-0 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0 ml-2" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width,280px)] min-w-[200px] p-1.5 shadow-lg rounded-xl border border-zinc-200 bg-white"
        align="start"
      >
        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          CUSTOM FIELDS
        </div>
        {dateFields.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-zinc-700 italic">
            No Date Custom Fields available
          </div>
        ) : (
          <div className="space-y-0.5 mt-1">
            {dateFields.map((f: any) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onChange(f.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer",
                  f.id === value ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
                )}
              >
                <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TriggerConfigFields({
  triggerType,
  scope,
  config,
  onChange,
  mode,
  agentConditions,
  onAgentConditionsChange,
}: {
  triggerType: AutomationTriggerTypeV1;
  scope: AutomationScope;
  config: TriggerConfigState;
  onChange: (next: TriggerConfigState) => void;
  mode: "classic" | "agent";
  agentConditions: string;
  onAgentConditionsChange: (v: string) => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const fields = trpc.customFields.list.useQuery(
    { workspaceId: scope.workspaceId, spaceId: scope.spaceId, projectId: scope.projectId, teamId: scope.teamId },
    { enabled: !!scope.workspaceId && (triggerType === "CUSTOM_FIELD_CHANGED" || triggerType === "DATE_CUSTOM_FIELD_ARRIVES") },
  );
  const statuses = trpc.taskStatus.list.useQuery(
    { workspaceId: scope.workspaceId },
    { enabled: !!scope.workspaceId && triggerType === "TASK_STATUS_CHANGED" },
  );

  const { data: taskTypes = [] } = trpc.task.listTaskTypes.useQuery(
    { workspaceId: scope.workspaceId || undefined },
    { enabled: !!scope.workspaceId && triggerType === "TASK_TYPE_CHANGED" },
  );

  const selectedField = (fields.data ?? []).find((f: any) => f.id === config.customFieldId);
  const effectiveType = selectedField ? ((selectedField.config as any)?.fieldType ?? selectedField.type) : undefined;
  const getFieldOptions = () => {
    if (!selectedField) return [];
    if (["DROPDOWN", "CUSTOM_DROPDOWN", "CATEGORIZE", "LABELS", "SENTIMENT"].includes(effectiveType)) {
      return (selectedField.config as any)?.options || [];
    }
    if (effectiveType === "TSHIRT_SIZE") {
      return [
        { id: 'xs', name: 'XS' },
        { id: 's', name: 'S' },
        { id: 'm', name: 'M' },
        { id: 'l', name: 'L' },
        { id: 'xl', name: 'XL' }
      ];
    }
    return [];
  };
  const fieldOptions = getFieldOptions();

  return (
    <div className="space-y-3">
      {triggerType === "CUSTOM_FIELD_CHANGED" && (
        <div>
          <Label className="!text-xs !text-zinc-500 font-normal">
            Field <span className="text-red-500">*</span>
          </Label>
          <CustomFieldSelect
            value={config.customFieldId}
            onChange={(customFieldId) => onChange({ ...config, customFieldId })}
            fields={fields.data ?? []}
            workspaceId={scope.workspaceId}
            scope={scope}
          />
          <FieldError show={!config.customFieldId} message="Field is empty" />
        </div>
      )}

      {triggerType === "DATE_CUSTOM_FIELD_ARRIVES" && (
        <div className="space-y-3">
          <DateCustomFieldSelect
            value={config.customFieldId}
            onChange={(customFieldId) => onChange({ ...config, customFieldId })}
            fields={fields.data ?? []}
          />
          <div className="p-3.5 rounded-lg bg-zinc-100/80 text-xs text-zinc-700 leading-relaxed font-normal">
            <span className="font-semibold text-zinc-900">Note:</span> Once the date arrives, this trigger will run for all tasks in this location that aren&apos;t marked as Closed.
          </div>
        </div>
      )}

      {triggerType === "CUSTOM_FIELD_CHANGED" && (
        <div className="space-y-3">
          <div>
            <Label className="!text-xs !text-zinc-500 font-normal">From</Label>
            {fieldOptions.length > 0 ? (
              <Select
                value={config.fromValue || ""}
                onValueChange={(fromValue) => onChange({ ...config, fromValue })}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any</SelectItem>
                  <SelectItem value={EMPTY}>Field is empty</SelectItem>
                  {fieldOptions.map((opt: any) => (
                    <SelectItem key={opt.id || opt.value || opt.name} value={opt.value || opt.name || opt.id}>
                      {opt.name || opt.label || opt.value || opt.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="mt-1 h-9"
                placeholder="Any"
                value={config.fromValue === ANY || config.fromValue === EMPTY ? "" : (config.fromValue || "")}
                onChange={(e) => onChange({ ...config, fromValue: e.target.value || ANY })}
              />
            )}
            <FieldError show={!config.fromValue} message="Field is empty" />
          </div>
          <div>
            <Label className="!text-xs !text-zinc-500 font-normal">To</Label>
            {fieldOptions.length > 0 ? (
              <Select
                value={config.toValue || ""}
                onValueChange={(toValue) => onChange({ ...config, toValue })}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any</SelectItem>
                  <SelectItem value={EMPTY}>Field is empty</SelectItem>
                  {fieldOptions.map((opt: any) => (
                    <SelectItem key={opt.id || opt.value || opt.name} value={opt.value || opt.name || opt.id}>
                      {opt.name || opt.label || opt.value || opt.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="mt-1 h-9"
                placeholder="Any"
                value={config.toValue === ANY || config.toValue === EMPTY ? "" : (config.toValue || "")}
                onChange={(e) => onChange({ ...config, toValue: e.target.value || ANY })}
              />
            )}
            <FieldError show={!config.toValue} message="Field is empty" />
          </div>
        </div>
      )}

      {triggerType === "TASK_STATUS_CHANGED" && (
        <div className="space-y-3">
          <div>
            <Label className="!text-xs !text-zinc-500 font-normal">From</Label>
            <StatusMultiSelect
              value={config.fromStatusId}
              onChange={(fromStatusId) => onChange({ ...config, fromStatusId })}
              statuses={statuses.data ?? []}
            />
          </div>
          <div>
            <Label className="!text-xs !text-zinc-500 font-normal">To</Label>
            <StatusMultiSelect
              value={config.toStatusId}
              onChange={(toStatusId) => onChange({ ...config, toStatusId })}
              statuses={statuses.data ?? []}
            />
          </div>
        </div>
      )}

      {(triggerType === "TASK_ASSIGNEE_ADDED" || triggerType === "TASK_ASSIGNEE_REMOVED" || triggerType === "TASK_ASSIGNEE_CHANGED") && (
        <AssigneeMultiSelect
          value={config.assigneeIds}
          onChange={(assigneeIds) => onChange({ ...config, assigneeIds })}
          scope={scope}
        />
      )}

      {triggerType === "TASK_TYPE_CHANGED" && (
        <div className="space-y-3">
          <div>
            <Label className="!text-xs !text-zinc-500 font-normal">From</Label>
            <Select
              value={config.fromTaskTypeId || ANY}
              onValueChange={(fromTaskTypeId) => onChange({ ...config, fromTaskTypeId })}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Any Task Type(s)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any Task Type(s)</SelectItem>
                {taskTypes.map((tt: any) => (
                  <SelectItem key={tt.id} value={tt.id}>
                    <div className="flex items-center gap-2">
                      <TaskTypeIcon type={tt} className="h-4 w-4 shrink-0" />
                      <span>{tt.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="!text-xs !text-zinc-500 font-normal">To</Label>
            <Select
              value={config.toTaskTypeId || ANY}
              onValueChange={(toTaskTypeId) => onChange({ ...config, toTaskTypeId })}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Any Task Type(s)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any Task Type(s)</SelectItem>
                {taskTypes.map((tt: any) => (
                  <SelectItem key={tt.id} value={tt.id}>
                    <div className="flex items-center gap-2">
                      <TaskTypeIcon type={tt} className="h-4 w-4 shrink-0" />
                      <span>{tt.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {triggerType === "TASK_PRIORITY_CHANGED" && (
        <div className="space-y-3">
          <div>
            <Label className="!text-xs !text-zinc-500 font-normal">From</Label>
            <Select
              value={config.fromPriority || ANY}
              onValueChange={(fromPriority) => onChange({ ...config, fromPriority })}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Any Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any Priority</SelectItem>
                <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Priority</div>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center gap-2">
                      <Flag className={cn("h-3.5 w-3.5", p.color, p.fillColor && "fill-current")} />
                      <span>{p.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="!text-xs !text-zinc-500 font-normal">To</Label>
            <Select
              value={config.toPriority || ANY}
              onValueChange={(toPriority) => onChange({ ...config, toPriority })}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Any Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any Priority</SelectItem>
                <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Priority</div>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center gap-2">
                      <Flag className={cn("h-3.5 w-3.5", p.color, p.fillColor && "fill-current")} />
                      <span>{p.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {(triggerType === "TASK_START_DATE_ARRIVES" ||
        triggerType === "TASK_DUE_DATE_ARRIVES") && (
        <div className="p-3.5 rounded-lg bg-zinc-100/80 text-xs text-zinc-700 leading-relaxed font-normal">
          <span className="font-semibold text-zinc-900">Note:</span> Once the date arrives, this trigger will run for all tasks in this location that aren&apos;t marked as Closed.
        </div>
      )}

      {(triggerType === "TAG_ADDED" || triggerType === "TAG_REMOVED") && (
        <div>
          <Label className="!text-xs !text-zinc-500 font-normal mb-1.5 block">Tag(s)</Label>
          <TagTriggerSelect
            value={config.tag || ""}
            onChange={(tag) => onChange({ ...config, tag })}
            workspaceId={scope.workspaceId}
          />
        </div>
      )}

      {triggerType === "EVERY_SCHEDULED_TIME" && (
        <CronBuilder
          value={{
            repeat: config.cronRepeat,
            customInterval: config.cronCustomInterval,
            customPeriod: config.cronCustomPeriod,
            customDays: config.cronCustomDays,
            time: config.cronTime,
            startDate: config.cronStartDate,
            timezone: config.cronTimezone,
            ends: config.cronEnds,
          }}
          onChange={(val) => {
            onChange({
              ...config,
              cronRepeat: val.repeat,
              cronCustomInterval: val.customInterval,
              cronCustomPeriod: val.customPeriod,
              cronCustomDays: val.customDays,
              cronTime: val.time,
              cronStartDate: val.startDate,
              cronTimezone: val.timezone,
              cronEnds: val.ends,
              cronExpression: "custom",
            });
          }}
        />
      )}

      {triggerType === "DATE_BEFORE_AFTER" && (
        <div className="space-y-2">
          <Label className="!text-xs !text-zinc-500 font-normal">When date is</Label>
          <div className="flex items-center gap-1.5 w-full">
            <Input
              type="number"
              className="h-9 w-12 text-center text-xs border border-zinc-200 rounded-md bg-white px-1 tabular-nums shrink-0"
              value={config.dateAmount ?? 1}
              onChange={(e) => onChange({ ...config, dateAmount: parseInt(e.target.value) || 1 })}
              min={1}
            />
            <Select
              value={config.dateUnit || "Days"}
              onValueChange={(dateUnit: any) => onChange({ ...config, dateUnit })}
            >
              <SelectTrigger className="h-9 w-[78px] px-2 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hours">Hours</SelectItem>
                <SelectItem value="Days">Days</SelectItem>
                <SelectItem value="Weeks">Weeks</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={config.dateMode || "before"}
              onValueChange={(dateMode: any) => onChange({ ...config, dateMode })}
            >
              <SelectTrigger className="h-9 w-[82px] px-2 text-xs shrink-0 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before</SelectItem>
                <SelectItem value="after">After</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={config.dateField || "start_date"}
              onValueChange={(dateField: any) => onChange({ ...config, dateField })}
            >
              <SelectTrigger className="h-9 flex-1 min-w-0 px-2.5 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Task Dates</div>
                <SelectItem value="start_date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span>The start date</span>
                  </div>
                </SelectItem>
                <SelectItem value="due_date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span>The due date</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {mode === "agent" && triggerType === "TASK_OR_SUBTASK_CREATED" &&  (
        <div>
          <Label className="!text-xs !text-zinc-500 font-normal !flex items-center gap-1 !mb-2">
            <Sparkles className="h-3 w-3" /> Agent conditions
          </Label>
          <Textarea
            className="mt-1 text-sm focus-visible:ring-1"
            placeholder="e.g. Only trigger if the task is about HR."
            value={agentConditions}
            onChange={(e) => onAgentConditionsChange(e.target.value)}
          />
        </div>
      )}

      {triggerType === "CUSTOM_FIELD_CHANGED" && advanced && (
        <div className="space-y-2.5 pt-1">
          <Label className="!text-xs !text-zinc-500 font-normal">Only run when</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-zinc-800">
              <Checkbox
                checked={config.runOnCreate ?? true}
                onCheckedChange={(checked) =>
                  onChange({ ...config, runOnCreate: checked === true })
                }
                className="h-4 w-4 rounded data-[state=checked]:bg-[#7b68ee] data-[state=checked]:border-[#7b68ee] text-white"
              />
              <span>Task is created</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-zinc-800">
              <Checkbox
                checked={config.runOnUpdate ?? true}
                onCheckedChange={(checked) =>
                  onChange({ ...config, runOnUpdate: checked === true })
                }
                className="h-4 w-4 rounded data-[state=checked]:bg-[#7b68ee] data-[state=checked]:border-[#7b68ee] text-white"
              />
              <span>Task is updated</span>
            </label>
          </div>
        </div>
      )}

      {triggerType === "CUSTOM_FIELD_CHANGED" && (
        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs text-zinc-500 underline decoration-dotted hover:text-zinc-700 transition-colors cursor-pointer"
            onClick={() => setAdvanced((v) => !v)}
          >
            {advanced ? "Hide advanced" : "Advanced"}
          </button>
        </div>
      )}
    </div>
  );
}

export function triggerConfigIsValid(type: AutomationTriggerTypeV1, config: TriggerConfigState) {
  if (type === "CUSTOM_FIELD_CHANGED") return !!config.customFieldId && !!config.fromValue && !!config.toValue;
  if (type === "DATE_CUSTOM_FIELD_ARRIVES") return !!config.customFieldId;
  if (type === "EVERY_SCHEDULED_TIME") return !!config.cronExpression?.trim();
  return true;
}

export function serializeTriggerConfig(config: TriggerConfigState) {
  return {
    customFieldId: config.customFieldId,
    fromValue: config.fromValue,
    toValue: config.toValue,
    runOnCreate: config.runOnCreate,
    runOnUpdate: config.runOnUpdate,
    fromStatusId: config.fromStatusId,
    toStatusId: config.toStatusId,
    assigneeIds: config.assigneeIds,
    tag: config.tag,
    cronExpression: config.cronExpression,
    cronRepeat: config.cronRepeat,
    cronCustomInterval: config.cronCustomInterval,
    cronCustomPeriod: config.cronCustomPeriod,
    cronCustomDays: config.cronCustomDays,
    cronTime: config.cronTime,
    cronStartDate: config.cronStartDate,
    cronTimezone: config.cronTimezone,
    cronEnds: config.cronEnds,
    dateMode: config.dateMode,
    dateAmount: config.dateAmount,
    dateUnit: config.dateUnit,
    dateField: config.dateField,
    fromTaskTypeId: config.fromTaskTypeId,
    toTaskTypeId: config.toTaskTypeId,
    fromPriority: config.fromPriority,
    toPriority: config.toPriority,
  };
}
