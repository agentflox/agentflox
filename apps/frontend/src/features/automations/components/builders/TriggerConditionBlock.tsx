import { Trash2, UserPlus, CalendarCheck, Edit, Calendar, UserCircle, Flag, CircleDot, Tag, Type, Cuboid, Layers, Hourglass, Clock, ChevronDown, Check, HelpCircle, ClipboardList, FileText, Diamond, CheckCircle2, List, X, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../../types";
import type { IntegrationConfigField } from "../../integrationAutomationCatalog";
import { AssigneeMultiSelect } from "./AssigneeMultiSelect";
import { StatusMultiSelect } from "./StatusMultiSelect";
import { TagTriggerSelect } from "./TagTriggerSelect";

export type Condition = {
  id: string;
  property: string;
  operator: string;
  value: string;
  customField?: string;
  dateMode?: string;
  dateAmount?: string;
  dateUnit?: string;
};

const PROPERTIES = [
  { id: "assignee", label: "Assignee", icon: UserPlus, disabled: false },
  { id: "current_date_is", label: "Current Date Is", icon: CalendarCheck, disabled: false },
  { id: "custom_field", label: "Custom Field", icon: Edit, disabled: false },
  { id: "due_date", label: "Due Date", icon: Calendar, disabled: false },
  { id: "follower", label: "Follower", icon: UserCircle, disabled: false },
  { id: "priority", label: "Priority", icon: Flag, disabled: false },
  { id: "start_date", label: "Start date", icon: Calendar, disabled: false },
  { id: "status", label: "Status", icon: CircleDot, disabled: false },
  { id: "tag", label: "Tag", icon: Tag, disabled: false },
  { id: "task_name_contains", label: "Task name contains", icon: Type, disabled: false },
  { id: "task_type", label: "Task Type", icon: Cuboid, disabled: false },
  { id: "tasks_or_subtasks_are", label: "Task(s) or Subtask(s) are", icon: Layers, disabled: false },
  { id: "time_estimate", label: "Time estimate", icon: Hourglass, disabled: false },
];

const OPERATORS_MAP: Record<string, { id: string, label: string }[]> = {
  custom_field: [
    { id: "contains", label: "Contains" },
    { id: "does_not_contain", label: "Does not contain" },
    { id: "is_set", label: "Is set" },
    { id: "is_not_set", label: "Is not set" },
    { id: "is_equal_to", label: "Is equal to" },
    { id: "is_not_equal_to", label: "Is not equal to" },
    { id: "regex", label: "Regular Expression (Regex)" },
  ],
  due_date: [
    { id: "is_on", label: "Is on" },
    { id: "is_not_on", label: "Is not on" },
    { id: "is_before", label: "Is before" },
    { id: "is_after", label: "Is after" },
    { id: "is_on_or_before", label: "Is on or before" },
    { id: "is_on_or_after", label: "Is on or after" },
    { id: "has_a_date", label: "Has a date" },
    { id: "has_no_date", label: "Has no date" },
  ],
  start_date: [
    { id: "is_on", label: "Is on" },
    { id: "is_not_on", label: "Is not on" },
    { id: "is_before", label: "Is before" },
    { id: "is_after", label: "Is after" },
    { id: "is_on_or_before", label: "Is on or before" },
    { id: "is_on_or_after", label: "Is on or after" },
    { id: "has_a_date", label: "Has a date" },
    { id: "has_no_date", label: "Has no date" },
  ],
  priority: [
    { id: "is_equal_to", label: "Is equal to" },
    { id: "is_not_equal_to", label: "Is not equal to" },
    { id: "is_any_of", label: "Is any of" },
    { id: "is_all_of", label: "Is all of" },
    { id: "is_not_any_of", label: "Is not any of" },
    { id: "is_not_all_of", label: "Is not all of" },
    { id: "is_set", label: "Is set" },
    { id: "is_not_set", label: "Is not set" },
  ],
  status: [
    { id: "is_any_of", label: "Is any of" },
    { id: "is_not_any_of", label: "Is not any of" },
  ],
  tag: [
    { id: "is_any_of", label: "Is any of" },
    { id: "is_all_of", label: "Is all of" },
    { id: "is_not_any_of", label: "Is not any of" },
    { id: "is_not_all_of", label: "Is not all of" },
    { id: "is_set", label: "Is set" },
    { id: "is_not_set", label: "Is not set" },
  ],
  task_name_contains: [
    { id: "contains", label: "Contains" },
    { id: "does_not_contain", label: "Does not contain" },
    { id: "is_equal_to", label: "Is equal to" },
    { id: "is_not_equal_to", label: "Is not equal to" },
    { id: "regex", label: "Regular Expression (Regex)" },
  ],
  task_type: [
    { id: "is_any_of", label: "Is any of" },
    { id: "is_not_any_of", label: "Is not any of" },
  ],
  time_estimate: [
    { id: "is_equal_to", label: "Is equal to" },
    { id: "is_not_equal_to", label: "Is not equal to" },
    { id: "is_greater_than", label: "Is greater than" },
    { id: "is_less_than", label: "Is less than" },
    { id: "is_set", label: "Is set" },
    { id: "is_not_set", label: "Is not set" },
  ],
  default: [
    { id: "is_any_of", label: "Is any of" },
    { id: "is_all_of", label: "Is all of" },
    { id: "is_not_any_of", label: "Is not any of" },
    { id: "is_not_all_of", label: "Is not all of" },
    { id: "is_set", label: "Is set" },
    { id: "is_not_set", label: "Is not set" },
  ]
};

const TASK_TYPE_OPTIONS = [
  { label: "Task", value: "Task", icon: CircleDot },
  { label: "Milestone", value: "Milestone", icon: Diamond },
  { label: "Form Response", value: "Form Response", icon: ClipboardList },
  { label: "Meeting Note", value: "Meeting Note", icon: FileText },
];

const DATE_UNITS = ["Day", "Week", "Month", "Year", "Hour"];
const TASK_DATES = [
  { label: "Created date", value: "created_date" },
  { label: "Start date", value: "start_date" },
  { label: "Due date", value: "due_date" },
  { label: "Closed date", value: "closed_date" },
  { label: "Date done", value: "date_done" },
  { label: "Exact date", value: "exact_date" },
];

function CurrentDateConditionValue({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
}) {
  const [openValue, setOpenValue] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);
  const selectedDateLabel = TASK_DATES.find((d) => d.value === condition.value)?.label || condition.value;
  const currentUnit = condition.dateUnit || "Day";

  const UnitDropdown = ({ mode }: { mode: string }) => {
    const [openUnit, setOpenUnit] = useState(false);
    return (
      <Popover open={openUnit} onOpenChange={setOpenUnit}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-7 border border-zinc-200 rounded-lg px-2.5 flex items-center justify-between gap-1.5 min-w-[70px] bg-white text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer shadow-none transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setOpenUnit(!openUnit);
            }}
          >
            <span>{currentUnit}</span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[110px] p-1 rounded-xl shadow-lg border-zinc-200 bg-white" align="start">
          <div className="space-y-0.5">
            {DATE_UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ ...condition, dateUnit: unit, dateMode: mode });
                  setOpenUnit(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm text-zinc-700 hover:bg-zinc-100 cursor-pointer text-left transition-colors",
                  currentUnit === unit && "bg-zinc-100 text-zinc-900 font-medium"
                )}
              >
                <span>{unit}</span>
                {currentUnit === unit && <Check className="h-3.5 w-3.5 text-zinc-600 ml-auto" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-3 px-1 pt-1">
      {/* Before */}
      <label className="flex items-center gap-3 text-sm text-zinc-700 cursor-pointer select-none">
        <input
          type="radio"
          name={`dateMode-${condition.id}`}
          className="h-4 w-4 border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
          checked={condition.dateMode === "before"}
          onChange={() => onChange({ ...condition, dateMode: "before" })}
        />
        <span>Before</span>
      </label>

      {/* After */}
      <label className="flex items-center gap-3 text-sm text-zinc-700 cursor-pointer select-none">
        <input
          type="radio"
          name={`dateMode-${condition.id}`}
          className="h-4 w-4 border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
          checked={condition.dateMode === "after"}
          onChange={() => onChange({ ...condition, dateMode: "after" })}
        />
        <span>After</span>
      </label>

      {/* At least ... Before */}
      <label
        className="flex items-center gap-2.5 text-sm text-zinc-700 cursor-pointer select-none flex-wrap"
        onClick={() => {
          if (condition.dateMode !== "at_least_before") {
            onChange({ ...condition, dateMode: "at_least_before" });
          }
        }}
      >
        <input
          type="radio"
          name={`dateMode-${condition.id}`}
          className="h-4 w-4 border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
          checked={condition.dateMode === "at_least_before"}
          onChange={() => onChange({ ...condition, dateMode: "at_least_before" })}
        />
        <span>At least</span>
        <input
          type="number"
          min="1"
          className="w-10 text-center border-b border-zinc-400 focus:border-zinc-800 bg-transparent py-0.5 text-sm text-zinc-800 outline-none"
          value={condition.dateAmount || "1"}
          onChange={(e) => onChange({ ...condition, dateAmount: e.target.value, dateMode: "at_least_before" })}
          onClick={(e) => e.stopPropagation()}
        />
        <UnitDropdown mode="at_least_before" />
        <span>Before</span>
      </label>

      {/* At least ... After */}
      <label
        className="flex items-center gap-2.5 text-sm text-zinc-700 cursor-pointer select-none flex-wrap"
        onClick={() => {
          if (condition.dateMode !== "at_least_after") {
            onChange({ ...condition, dateMode: "at_least_after" });
          }
        }}
      >
        <input
          type="radio"
          name={`dateMode-${condition.id}`}
          className="h-4 w-4 border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
          checked={condition.dateMode === "at_least_after"}
          onChange={() => onChange({ ...condition, dateMode: "at_least_after" })}
        />
        <span>At least</span>
        <input
          type="number"
          min="1"
          className="w-10 text-center border-b border-zinc-400 focus:border-zinc-800 bg-transparent py-0.5 text-sm text-zinc-800 outline-none"
          value={condition.dateAmount || "1"}
          onChange={(e) => onChange({ ...condition, dateAmount: e.target.value, dateMode: "at_least_after" })}
          onClick={(e) => e.stopPropagation()}
        />
        <UnitDropdown mode="at_least_after" />
        <span>After</span>
      </label>

      {/* Date row */}
      <div className="flex items-center gap-4 pt-1">
        <span className="text-sm text-zinc-600 font-medium">Date</span>
        <Popover open={openValue} onOpenChange={setOpenValue}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex-1 flex items-center justify-between h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-700 cursor-pointer transition-colors shadow-sm"
            >
              <span className={condition.value ? "text-zinc-900 font-normal" : "text-zinc-500 font-normal"}>
                {selectedDateLabel || "Select a Date"}
              </span>
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-1.5 rounded-xl shadow-xl border-zinc-200 bg-white" align="start">
            <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              TASK DATES
            </div>
            <div className="space-y-0.5">
              {TASK_DATES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => {
                    if (d.value === "exact_date") {
                      setOpenValue(false);
                      setOpenCalendar(true);
                    } else {
                      onChange({ ...condition, value: d.value });
                      setOpenValue(false);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors text-left",
                    condition.value === d.value && "bg-zinc-100 text-zinc-900 font-medium"
                  )}
                >
                  <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span className="flex-1">{d.label}</span>
                  {condition.value === d.value && <Check className="h-3.5 w-3.5 text-zinc-600" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {openCalendar && (
          <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
            <PopoverContent
              className="w-auto p-0 rounded-2xl shadow-2xl border-zinc-200 bg-white overflow-hidden"
              align="start"
              side="bottom"
              sideOffset={6}
            >
              <SingleDateCalendar
                onDateChange={(date) => {
                  if (date) {
                    onChange({ ...condition, value: date.toLocaleDateString() });
                  }
                  setOpenCalendar(false);
                }}
                showTimeInput={false}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

function StatusConditionSelector({
  condition,
  scope,
  onChange,
}: {
  condition: Condition;
  scope?: AutomationScope;
  onChange: (c: Condition) => void;
}) {
  const { data: statusList = [] } = trpc.taskStatus.list.useQuery(
    { workspaceId: scope?.workspaceId, listId: scope?.listId, spaceId: scope?.spaceId },
    { enabled: !!scope?.workspaceId }
  );

  if (["is_set", "is_not_set"].includes(condition.operator)) return null;

  return (
    <StatusMultiSelect
      value={condition.value ? (condition.value.includes(",") ? condition.value.split(",") : condition.value) : undefined}
      onChange={(val) => {
        const strVal = Array.isArray(val) ? val.join(",") : val === "__any__" ? "" : val;
        onChange({ ...condition, value: strVal });
      }}
      statuses={statusList}
    />
  );
}

function TagConditionSelector({
  condition,
  scope,
  onChange,
}: {
  condition: Condition;
  scope?: AutomationScope;
  onChange: (c: Condition) => void;
}) {
  if (["is_set", "is_not_set"].includes(condition.operator)) return null;

  return (
    <TagTriggerSelect
      value={condition.value || ""}
      onChange={(tag) => onChange({ ...condition, value: tag })}
      workspaceId={scope?.workspaceId}
    />
  );
}

function IntegrationFieldConditionSelector({
  condition,
  field,
  onChange,
}: {
  condition: Condition;
  field: IntegrationConfigField;
  onChange: (c: Condition) => void;
}) {
  const [openValue, setOpenValue] = useState(false);

  if (["is_set", "is_not_set"].includes(condition.operator)) return null;

  if (field.type === "select") {
    return (
      <Popover open={openValue} onOpenChange={setOpenValue}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 cursor-pointer">
            <span>
              {field.options?.find((o) => o.value === condition.value)?.label ||
                condition.value ||
                field.placeholder ||
                "Select an option"}
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {field.options?.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => {
                      onChange({ ...condition, value: opt.value });
                      setOpenValue(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        condition.value === opt.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  if (field.type === "checkbox") {
    return (
      <Popover open={openValue} onOpenChange={setOpenValue}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 cursor-pointer">
            <span>
              {condition.value === "true"
                ? "True"
                : condition.value === "false"
                  ? "False"
                  : "Select boolean"}
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onChange({ ...condition, value: "true" });
                    setOpenValue(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      condition.value === "true" ? "opacity-100" : "opacity-0"
                    )}
                  />{" "}
                  True
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    onChange({ ...condition, value: "false" });
                    setOpenValue(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      condition.value === "false" ? "opacity-100" : "opacity-0"
                    )}
                  />{" "}
                  False
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Input
      autoFocus
      placeholder={field.placeholder || "Enter value..."}
      value={condition.value || ""}
      onChange={(e) => onChange({ ...condition, value: e.target.value })}
      className="h-9 shadow-sm text-sm"
    />
  );
}

function TaskOrSubtaskConditionSelector({
  condition,
  scope,
  onChange,
}: {
  condition: Condition;
  scope?: AutomationScope;
  onChange: (c: Condition) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: tasksData, isLoading } = trpc.task.list.useQuery(
    {
      workspaceId: scope?.workspaceId || "",
      listId: scope?.listId,
      folderId: scope?.folderId,
      projectId: scope?.projectId,
      spaceId: scope?.spaceId,
      query: search.trim() || undefined,
      scope: "all",
      includeRelations: true,
      pageSize: 50,
    } as any,
    { enabled: !!scope?.workspaceId }
  );

  const tasks = tasksData?.items || [];

  const getTaskBreadcrumb = (t: any) => {
    const parts = [
      t.space?.name || t.team?.name,
      t.list?.folder?.name,
      t.project?.name,
      t.list?.name,
    ].filter(Boolean);
    return Array.from(new Set(parts)).join(" / ");
  };

  const selectedTaskTitle = condition.value;

  return (
    <div className="pt-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-700 shadow-sm cursor-pointer"
          >
            <span className={condition.value ? "text-zinc-900 font-normal truncate" : "text-zinc-400 font-normal"}>
              {selectedTaskTitle || "Search"}
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white" align="start">
          <Command shouldFilter={false}>
            <div className="p-2 border-b border-zinc-100">
              <CommandInput
                placeholder="Search tasks or subtasks"
                value={search}
                onValueChange={setSearch}
                className="text-sm"
              />
            </div>
            <CommandList className="max-h-[300px] overflow-y-auto p-1 space-y-0.5">
              {isLoading ? (
                <div className="py-6 text-center text-xs text-zinc-400">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <CommandEmpty>No tasks found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {tasks.map((task: any) => {
                    const title = task.title || task.name || "Untitled";
                    const breadcrumb = getTaskBreadcrumb(task);
                    const isSelected = condition.value === title || condition.value === task.id;

                    return (
                      <CommandItem
                        key={task.id}
                        value={task.id}
                        onSelect={() => {
                          onChange({ ...condition, value: title });
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-start gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors",
                          isSelected && "bg-zinc-100/70"
                        )}
                      >
                        <div className="mt-0.5 shrink-0 text-zinc-400">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-normal leading-tight text-zinc-900 truncate">
                            {title}
                          </span>
                          {breadcrumb && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1 truncate">
                              <List className="h-3 w-3 shrink-0" />
                              <span className="truncate">{breadcrumb}</span>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function TriggerConditionBlock({
  condition,
  scope,
  onChange,
  onDelete,
  integrationFields,
  disabledProperties,
}: {
  condition: Condition;
  scope?: AutomationScope;
  onChange: (c: Condition) => void;
  onDelete: () => void;
  integrationFields?: IntegrationConfigField[];
  disabledProperties?: string[];
}) {
  const [openProperty, setOpenProperty] = useState(false);
  const [openOperator, setOpenOperator] = useState(false);
  const [openValue, setOpenValue] = useState(false);
  const [openField, setOpenField] = useState(false);

  const isIntegrationMode = !!integrationFields?.length;

  const currentProperties = (isIntegrationMode
    ? (integrationFields || []).map((f) => ({ id: f.id, label: f.label, icon: Cuboid, disabled: false }))
    : PROPERTIES
  ).map((p) => disabledProperties?.includes(p.id) ? { ...p, disabled: true } : p);

  const selectedProperty = currentProperties.find((p) => p.id === condition.property) || currentProperties[0];
  const PropertyIcon = selectedProperty?.icon || Cuboid;
  const propId = selectedProperty?.id || condition.property;

  const getOperators = (pId: string) => {
    if (isIntegrationMode) {
      const field = integrationFields?.find((f) => f.id === pId);
      if (field?.type === "select" || field?.type === "checkbox") {
        return [
          { id: "is_equal_to", label: "Is equal to" },
          { id: "is_not_equal_to", label: "Is not equal to" }
        ];
      }
      return [
        { id: "contains", label: "Contains" },
        { id: "does_not_contain", label: "Does not contain" },
        { id: "is_equal_to", label: "Is equal to" },
        { id: "is_not_equal_to", label: "Is not equal to" }
      ];
    }
    return OPERATORS_MAP[pId] || OPERATORS_MAP.default;
  };

  const currentOperators = getOperators(propId);
  const selectedOperator = currentOperators.find((o) => o.id === condition.operator) || currentOperators[0];

  useEffect(() => {
    if (selectedProperty && selectedProperty.id !== condition.property) {
      const newOps = getOperators(selectedProperty.id);
      onChange({
        ...condition,
        property: selectedProperty.id,
        operator: newOps[0]?.id || "is_equal_to",
        value: "",
      });
    }
  }, [selectedProperty?.id, condition.property]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: customFieldsData } = trpc.customFields.list.useQuery(
    {
      workspaceId: scope?.workspaceId || "",
      spaceId: scope?.spaceId,
      projectId: scope?.projectId,
      folderId: scope?.folderId,
      listId: scope?.listId,
    },
    { enabled: !!scope?.workspaceId }
  );
  const customFields = Array.isArray(customFieldsData) ? customFieldsData : [];

  return (
    <div className="flex flex-col w-full">
      {/* Centered dashed connector line from above */}
      <div className="relative w-full">
        {/* Continuous dashed line, fixed position, runs full height uninterrupted */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-px border-l-2 border-dashed border-zinc-200" />
        <div className="text-xs text-zinc-500 font-normal py-2.5">
          And if this condition is true:
        </div>
      </div>
      <div className="rounded-md border border-zinc-200 bg-white p-3 space-y-3 shadow-sm w-full">
          {/* Property Picker */}
          <div className="flex items-center gap-2">
            <Popover open={openProperty} onOpenChange={setOpenProperty}>
              <PopoverTrigger asChild>
                <button className="flex-1 flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 text-sm cursor-pointer">
                  <div className="flex items-center gap-2">
                    <PropertyIcon className="h-4 w-4 text-zinc-500" />
                    <span className="font-normal">{selectedProperty?.label || propId}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {currentProperties.map((prop) => {
                        const content = (
                          <CommandItem
                            key={prop.id}
                            value={prop.label}
                            disabled={prop.disabled}
                            className={cn(prop.disabled && "opacity-50 pointer-events-none")}
                            onSelect={() => {
                              if (prop.disabled) return;
                              const newOps = getOperators(prop.id);
                              onChange({
                                ...condition,
                                property: prop.id,
                                operator: newOps[0].id,
                                value: ""
                              });
                              setOpenProperty(false);
                            }}
                          >
                            <prop.icon className="mr-2 h-4 w-4 text-zinc-500" />
                            {prop.label}
                            {propId === prop.id && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        );

                        if (prop.disabled) {
                          return (
                            <Tooltip key={prop.id} delayDuration={0}>
                              <TooltipTrigger asChild>
                                <div className="cursor-not-allowed pointer-events-auto">
                                  {content}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="start" className="bg-zinc-900 text-white border-zinc-800">
                                <p>The trigger does not support this condition</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return content;
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <button
              onClick={onDelete}
              className="h-9 w-9 flex items-center justify-center shrink-0 rounded-md text-red-500 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Current Date Is specific UI */}
          {!isIntegrationMode && propId === "current_date_is" ? (
            <CurrentDateConditionValue condition={condition} onChange={onChange} />
          ) : !isIntegrationMode && propId === "tasks_or_subtasks_are" ? (
            <TaskOrSubtaskConditionSelector
              condition={condition}
              scope={scope}
              onChange={onChange}
            />
          ) : (
            <>
              {/* Custom Field specific UI */}
              {!isIntegrationMode && propId === "custom_field" && (
                <Popover open={openField} onOpenChange={setOpenField}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm cursor-pointer">
                      <div className="flex items-center gap-2 text-purple-600 font-medium">
                        <Type className="h-4 w-4" />
                        <span>{condition.customField || "Select a field"}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search fields..." />
                      <CommandList className="max-h-[260px]">
                        <CommandEmpty>No fields found.</CommandEmpty>
                        <CommandGroup>
                          {customFields.map((f) => (
                            <CommandItem
                              key={f.id}
                              value={`field-${f.id}`}
                              className="cursor-pointer"
                              onSelect={() => { onChange({ ...condition, customField: f.name }); setOpenField(false); }}
                            >
                              <Type className="mr-2 h-4 w-4 text-purple-600" />
                              {f.name}
                              {condition.customField === f.name && <Check className="ml-auto h-4 w-4" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup>
                          <CommandItem
                            value="create-new-field"
                            className="cursor-pointer text-zinc-600"
                            onSelect={() => setOpenField(false)}
                          >
                            <Plus className="mr-2 h-4 w-4 text-zinc-400" />
                            Create new field
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {/* Operator Picker */}
              <Popover open={openOperator} onOpenChange={setOpenOperator}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm cursor-pointer">
                    <span>{selectedOperator.label}</span>
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup>
                        {currentOperators.map((op) => (
                          <CommandItem
                            key={op.id}
                            value={op.label}
                            onSelect={() => {
                              onChange({ ...condition, operator: op.id });
                              setOpenOperator(false);
                            }}
                          >
                            {op.label}
                            {selectedOperator.id === op.id && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Value Pickers */}
              {isIntegrationMode ? (
                (() => {
                  const intField = (integrationFields || []).find((f) => f.id === propId) || integrationFields?.[0];
                  if (!intField) return null;
                  return (
                    <IntegrationFieldConditionSelector
                      condition={condition}
                      field={intField}
                      onChange={onChange}
                    />
                  );
                })()
              ) : ["custom_field", "task_name_contains"].includes(propId) ? (
                !["is_set", "is_not_set"].includes(condition.operator) && (
                  <Input
                    placeholder="Enter value..."
                    value={condition.value || ""}
                    onChange={(e) => onChange({ ...condition, value: e.target.value })}
                    className="h-9 shadow-sm"
                  />
                )
              ) : ["due_date", "start_date"].includes(propId) ? (
                !["has_a_date", "has_no_date"].includes(condition.operator) && (
                  <Popover open={openValue} onOpenChange={setOpenValue}>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 cursor-pointer">
                        <span>{condition.value || "Select a date"}</span>
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 rounded-2xl shadow-2xl border-zinc-200 bg-white overflow-hidden max-h-[85vh] overflow-y-auto"
                      align="start"
                      side="bottom"
                      sideOffset={6}
                      collisionPadding={16}
                      avoidCollisions={true}
                    >
                      <SingleDateCalendar onDateChange={(date) => { onChange({ ...condition, value: date?.toLocaleDateString() || "" }); setOpenValue(false); }} showTimeInput={false} />
                    </PopoverContent>
                  </Popover>
                )
              ) : propId === "priority" ? (
                !["is_set", "is_not_set"].includes(condition.operator) && (
                  <Popover open={openValue} onOpenChange={setOpenValue}>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 cursor-pointer">
                        <div className="flex items-center gap-2">
                          {condition.value === "Urgent" && <Flag className="h-4 w-4 text-red-500 fill-red-500" />}
                          {condition.value === "High" && <Flag className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                          {condition.value === "Normal" && <Flag className="h-4 w-4 text-blue-500 fill-blue-500" />}
                          {condition.value === "Low" && <Flag className="h-4 w-4 text-zinc-400 fill-zinc-400" />}
                          <span>{condition.value || "Select a priority"}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command>
                        <CommandList>
                          <CommandGroup heading="Priority">
                            <CommandItem onSelect={() => { onChange({ ...condition, value: "Urgent" }); setOpenValue(false); }}>
                              <Flag className="mr-2 h-4 w-4 text-red-500 fill-red-500" /> Urgent
                            </CommandItem>
                            <CommandItem onSelect={() => { onChange({ ...condition, value: "High" }); setOpenValue(false); }}>
                              <Flag className="mr-2 h-4 w-4 text-yellow-500 fill-yellow-500" /> High
                            </CommandItem>
                            <CommandItem onSelect={() => { onChange({ ...condition, value: "Normal" }); setOpenValue(false); }}>
                              <Flag className="mr-2 h-4 w-4 text-blue-500 fill-blue-500" /> Normal
                            </CommandItem>
                            <CommandItem onSelect={() => { onChange({ ...condition, value: "Low" }); setOpenValue(false); }}>
                              <Flag className="mr-2 h-4 w-4 text-zinc-400 fill-zinc-400" /> Low
                            </CommandItem>
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem onSelect={() => { onChange({ ...condition, value: "" }); setOpenValue(false); }}>
                              <span className="mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300">
                                <div className="h-[1px] w-2 bg-zinc-300 rotate-45" />
                              </span>
                              Clear
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )
              ) : ["assignee", "follower"].includes(propId) ? (
                !["is_set", "is_not_set"].includes(condition.operator) && (
                  <AssigneeMultiSelect
                    value={condition.value ? condition.value.split(",").filter(Boolean) : []}
                    onChange={(ids) => onChange({ ...condition, value: ids.join(",") })}
                    scope={scope}
                    peopleOnly={propId === "follower"}
                  />
                )
              ) : propId === "status" ? (
                <StatusConditionSelector
                  condition={condition}
                  scope={scope}
                  onChange={onChange}
                />
              ) : propId === "tag" ? (
                <TagConditionSelector
                  condition={condition}
                  scope={scope}
                  onChange={onChange}
                />
              ) : propId === "task_type" ? (
                !["is_set", "is_not_set"].includes(condition.operator) && (() => {
                  const selectedTaskType = TASK_TYPE_OPTIONS.find((t) => t.value === condition.value || t.label === condition.value);
                  const SelectedTaskTypeIcon = selectedTaskType?.icon;
                  return (
                    <Popover open={openValue} onOpenChange={setOpenValue}>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-700 cursor-pointer">
                          <div className="flex items-center gap-2">
                            {SelectedTaskTypeIcon && <SelectedTaskTypeIcon className="h-4 w-4 text-zinc-600 shrink-0" />}
                            <span className={condition.value ? "text-zinc-900 font-normal" : "text-zinc-500 font-normal"}>
                              {selectedTaskType?.label || condition.value || "Any Task Type(s)"}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-zinc-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command>
                          <CommandList>
                            <CommandGroup>
                              {TASK_TYPE_OPTIONS.map((t) => {
                                const Icon = t.icon;
                                return (
                                  <CommandItem
                                    key={t.value}
                                    onSelect={() => {
                                      onChange({ ...condition, value: t.value });
                                      setOpenValue(false);
                                    }}
                                    className="cursor-pointer flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4 text-zinc-500" />
                                      <span>{t.label}</span>
                                    </div>
                                    {condition.value === t.value && (
                                      <Check className="h-4 w-4 text-zinc-600" />
                                    )}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                })()
              ) : propId === "time_estimate" ? (
                !["is_set", "is_not_set"].includes(condition.operator) && (
                  <Popover open={openValue} onOpenChange={setOpenValue}>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 cursor-pointer">
                        <span>{condition.value || "Select a time"}</span>
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-4" align="start">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-sm">Add time</span>
                        <HelpCircle className="h-4 w-4 text-zinc-400" />
                      </div>
                      <Input
                        placeholder="Enter '2h', '50m', etc"
                        className="mb-4"
                        value={condition.value || ""}
                        onChange={(e) => onChange({ ...condition, value: e.target.value })}
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-2">
                        <button className="flex-1 h-9 rounded-md bg-zinc-100 hover:bg-zinc-200 text-sm font-medium cursor-pointer" onClick={() => setOpenValue(false)}>Cancel</button>
                        <button className="flex-1 h-9 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium cursor-pointer" onClick={() => setOpenValue(false)}>Add</button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  }
