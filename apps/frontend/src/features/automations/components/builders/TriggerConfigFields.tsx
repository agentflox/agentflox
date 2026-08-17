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
import { Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../../types";
import type { AutomationTriggerTypeV1 } from "../../triggerCatalog";

export type TriggerConfigState = {
  customFieldId?: string;
  fromValue?: string;
  toValue?: string;
  fromStatusId?: string;
  toStatusId?: string;
  tag?: string;
  cronExpression?: string;
  dateMode?: "before" | "after";
};

const ANY = "__any__";
const EMPTY = "__empty__";

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return <p className="text-xs italic text-red-500 mt-1">{message}</p>;
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

  const needsField = triggerType === "CUSTOM_FIELD_CHANGED" || triggerType === "DATE_CUSTOM_FIELD_ARRIVES";

  return (
    <div className="space-y-3">
      {needsField && (
        <div>
          <Label className="text-xs">Field *</Label>
          <Select
            value={config.customFieldId || ""}
            onValueChange={(customFieldId) => onChange({ ...config, customFieldId })}
          >
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Create a new custom field" />
            </SelectTrigger>
            <SelectContent>
              {(fields.data ?? []).map((field: any) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError show={!config.customFieldId} message="Field is empty" />
        </div>
      )}

      {triggerType === "CUSTOM_FIELD_CHANGED" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Select
              value={config.fromValue || ""}
              onValueChange={(fromValue) => onChange({ ...config, fromValue })}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Any value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any value</SelectItem>
                <SelectItem value={EMPTY}>Field is empty</SelectItem>
              </SelectContent>
            </Select>
            <FieldError show={!config.fromValue} message="Field is empty" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Select
              value={config.toValue || ""}
              onValueChange={(toValue) => onChange({ ...config, toValue })}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Any value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any value</SelectItem>
                <SelectItem value={EMPTY}>Field is empty</SelectItem>
              </SelectContent>
            </Select>
            <FieldError show={!config.toValue} message="Field is empty" />
          </div>
        </div>
      )}

      {triggerType === "TASK_STATUS_CHANGED" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Select
              value={config.fromStatusId || ANY}
              onValueChange={(fromStatusId) => onChange({ ...config, fromStatusId })}
            >
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any status</SelectItem>
                {(statuses.data ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Select
              value={config.toStatusId || ANY}
              onValueChange={(toStatusId) => onChange({ ...config, toStatusId })}
            >
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any status</SelectItem>
                {(statuses.data ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {(triggerType === "TAG_ADDED" || triggerType === "TAG_REMOVED") && (
        <div>
          <Label className="text-xs">Tag</Label>
          <Input
            className="mt-1 h-9"
            placeholder="Any tag"
            value={config.tag || ""}
            onChange={(e) => onChange({ ...config, tag: e.target.value })}
          />
        </div>
      )}

      {triggerType === "EVERY_SCHEDULED_TIME" && (
        <div>
          <Label className="text-xs">Schedule *</Label>
          <Input
            className="mt-1 h-9"
            placeholder="e.g. 0 9 * * 1-5"
            value={config.cronExpression || ""}
            onChange={(e) => onChange({ ...config, cronExpression: e.target.value })}
          />
          <p className="text-[11px] text-zinc-400 mt-1">Cron expression in UTC</p>
        </div>
      )}

      {triggerType === "DATE_BEFORE_AFTER" && (
        <div>
          <Label className="text-xs">When date is</Label>
          <Select
            value={config.dateMode || "before"}
            onValueChange={(dateMode) => onChange({ ...config, dateMode: dateMode as "before" | "after" })}
          >
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="before">Before</SelectItem>
              <SelectItem value="after">After</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {mode === "agent" && (
        <div>
          <Label className="text-xs flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Agent conditions
          </Label>
          <Textarea
            className="mt-1 text-sm"
            placeholder="e.g. Only trigger if the task is about HR."
            value={agentConditions}
            onChange={(e) => onAgentConditionsChange(e.target.value)}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="text-xs text-zinc-500 underline decoration-dotted"
          onClick={() => setAdvanced((v) => !v)}
        >
          Advanced
        </button>
      </div>
      {advanced && (
        <p className="text-[11px] text-zinc-500">
          Applies to {scope.contextName}. Subtasks inherit this location unless you narrow sources later.
        </p>
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
    fromStatusId: config.fromStatusId,
    toStatusId: config.toStatusId,
    tag: config.tag,
    cronExpression: config.cronExpression,
    dateMode: config.dateMode,
  };
}
