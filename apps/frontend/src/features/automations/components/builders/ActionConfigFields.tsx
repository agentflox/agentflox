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
import { AlertTriangle, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../../types";
import { ACTION_BY_TYPE, type AutomationActionTypeV1 } from "../../actionCatalog";

export type ActionConfigState = {
  statusId?: string;
  content?: string;
  prompt?: string;
  customFieldId?: string;
  value?: string;
  userId?: string;
  listId?: string;
  listName?: string;
  title?: string;
  url?: string;
  priority?: string;
  tags?: string;
  name?: string;
  taskTypeId?: string;
  dueDate?: string;
  startDate?: string;
  timeEstimate?: string;
  duration?: string;
  agentId?: string;
};

export function ActionConfigFields({
  actionType,
  scope,
  config,
  onChange,
  onAskBrain,
}: {
  actionType: AutomationActionTypeV1;
  scope: AutomationScope;
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  onAskBrain?: () => void;
}) {
  const meta = ACTION_BY_TYPE[actionType];
  const statuses = trpc.taskStatus.list.useQuery(
    { workspaceId: scope.workspaceId },
    { enabled: !!scope.workspaceId && actionType === "UPDATE_STATUS" },
  );
  const fields = trpc.customFields.list.useQuery(
    { workspaceId: scope.workspaceId, spaceId: scope.spaceId, projectId: scope.projectId, teamId: scope.teamId },
    { enabled: !!scope.workspaceId && ["UPDATE_CUSTOM_FIELD", "SET_AI_FIELD", "REFRESH_AI_FIELD"].includes(actionType) },
  );
  const agents = trpc.agent.list.useQuery(
    {
      workspaceId: scope.workspaceId || "",
      spaceId: scope.spaceId,
      teamId: scope.teamId,
      projectId: scope.projectId,
      scopeMode: "inScope",
      pageSize: 50,
    },
    { enabled: !!scope.workspaceId && actionType === "LAUNCH_AI_AGENT" },
  );

  if (meta?.comingSoon) {
    return <p className="text-xs text-zinc-500">This action is coming soon.</p>;
  }

  return (
    <div className="space-y-3">
      {actionType === "UPDATE_STATUS" && (
        <div>
          <Label className="text-xs">Status *</Label>
          <Select value={config.statusId || ""} onValueChange={(statusId) => onChange({ ...config, statusId })}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              {(statuses.data ?? []).map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            If the selected status is not available on the task&apos;s list, this action is skipped.
          </div>
        </div>
      )}

      {actionType === "ADD_COMMENT" && (
        <div>
          <Label className="text-xs">Comment *</Label>
          <Textarea
            className="mt-1 text-sm"
            placeholder="Comment text"
            value={config.content || ""}
            onChange={(e) => onChange({ ...config, content: e.target.value })}
          />
        </div>
      )}

      {(actionType === "DO_ANYTHING_WITH_AI" || actionType === "LAUNCH_AI_AGENT") && (
        <div className="space-y-3">
          {actionType === "LAUNCH_AI_AGENT" && (
            <div>
              <Label className="text-xs">Agent *</Label>
              <Select value={config.agentId || ""} onValueChange={(agentId) => onChange({ ...config, agentId })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select an agent" /></SelectTrigger>
                <SelectContent>
                  {(agents.data?.items ?? []).map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Instructions *</Label>
            {onAskBrain && (
              <button type="button" className="text-[11px] text-violet-700 flex items-center gap-1" onClick={onAskBrain}>
                <Sparkles className="h-3 w-3" /> Ask Brain for help
              </button>
            )}
          </div>
          <Textarea
            className="min-h-[120px] text-sm"
            placeholder="e.g. Search the Workspace for relevant info and post your answer in a thread."
            value={config.prompt || ""}
            onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          />
        </div>
      )}

      {["UPDATE_CUSTOM_FIELD", "SET_AI_FIELD", "REFRESH_AI_FIELD"].includes(actionType) && (
        <div className="space-y-2">
          <Label className="text-xs">Field *</Label>
          <Select value={config.customFieldId || ""} onValueChange={(customFieldId) => onChange({ ...config, customFieldId })}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select a field" /></SelectTrigger>
            <SelectContent>
              {(fields.data ?? []).map((field: any) => (
                <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actionType !== "REFRESH_AI_FIELD" && (
            <>
              <Label className="text-xs">Value</Label>
              <Input className="h-9" value={config.value || ""} onChange={(e) => onChange({ ...config, value: e.target.value })} />
            </>
          )}
        </div>
      )}

      {(actionType === "UPDATE_ASSIGNEES" || actionType === "ADD_ASSIGNEE" || actionType === "UPDATE_FOLLOWERS" || actionType === "ADD_FOLLOWER") && (
        <div>
          <Label className="text-xs">User ID *</Label>
          <Input className="h-9" placeholder="User id" value={config.userId || ""} onChange={(e) => onChange({ ...config, userId: e.target.value })} />
        </div>
      )}

      {(actionType === "MOVE_TO_LIST" || actionType === "ADD_TO_LIST") && (
        <div>
          <Label className="text-xs">List ID *</Label>
          <Input className="h-9" placeholder="List id" value={config.listId || ""} onChange={(e) => onChange({ ...config, listId: e.target.value })} />
        </div>
      )}

      {actionType === "CREATE_LIST" && (
        <div>
          <Label className="text-xs">List name *</Label>
          <Input className="h-9" value={config.listName || ""} onChange={(e) => onChange({ ...config, listName: e.target.value })} />
        </div>
      )}

      {(actionType === "CREATE_TASK" || actionType === "CREATE_SUBTASK") && (
        <div>
          <Label className="text-xs">Title *</Label>
          <Input className="h-9" placeholder="Task title" value={config.title || ""} onChange={(e) => onChange({ ...config, title: e.target.value })} />
        </div>
      )}

      {actionType === "CALL_WEBHOOK" && (
        <div>
          <Label className="text-xs">URL *</Label>
          <Input className="h-9" placeholder="https://" value={config.url || ""} onChange={(e) => onChange({ ...config, url: e.target.value })} />
        </div>
      )}

      {actionType === "UPDATE_PRIORITY" && (
        <div>
          <Label className="text-xs">Priority *</Label>
          <Select value={config.priority || "NORMAL"} onValueChange={(priority) => onChange({ ...config, priority })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["URGENT", "HIGH", "NORMAL", "LOW"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {actionType === "UPDATE_TAGS" && (
        <div>
          <Label className="text-xs">Tags</Label>
          <Input className="h-9" placeholder="comma,separated,tags" value={config.tags || ""} onChange={(e) => onChange({ ...config, tags: e.target.value })} />
        </div>
      )}

      {actionType === "UPDATE_TASK_NAME" && (
        <div>
          <Label className="text-xs">Name *</Label>
          <Input className="h-9" value={config.name || ""} onChange={(e) => onChange({ ...config, name: e.target.value })} />
        </div>
      )}

      {actionType === "UPDATE_TASK_TYPE" && (
        <div>
          <Label className="text-xs">Task type ID</Label>
          <Input className="h-9" value={config.taskTypeId || ""} onChange={(e) => onChange({ ...config, taskTypeId: e.target.value })} />
        </div>
      )}

      {actionType === "UPDATE_DUE_DATE" && (
        <div>
          <Label className="text-xs">Due date</Label>
          <Input type="datetime-local" className="h-9" value={config.dueDate || ""} onChange={(e) => onChange({ ...config, dueDate: e.target.value })} />
        </div>
      )}

      {actionType === "UPDATE_START_DATE" && (
        <div>
          <Label className="text-xs">Start date</Label>
          <Input type="datetime-local" className="h-9" value={config.startDate || ""} onChange={(e) => onChange({ ...config, startDate: e.target.value })} />
        </div>
      )}

      {actionType === "ESTIMATE_TIME" && (
        <div>
          <Label className="text-xs">Estimate (minutes) *</Label>
          <Input className="h-9" type="number" value={config.timeEstimate || ""} onChange={(e) => onChange({ ...config, timeEstimate: e.target.value })} />
        </div>
      )}

      {actionType === "TRACK_TIME" && (
        <div>
          <Label className="text-xs">Duration (seconds) *</Label>
          <Input className="h-9" type="number" value={config.duration || ""} onChange={(e) => onChange({ ...config, duration: e.target.value })} />
        </div>
      )}
    </div>
  );
}

export function actionConfigIsValid(type: AutomationActionTypeV1, config: ActionConfigState) {
  const meta = ACTION_BY_TYPE[type];
  if (meta?.comingSoon) return false;
  if (type === "UPDATE_STATUS") return !!config.statusId;
  if (type === "ADD_COMMENT") return !!config.content?.trim();
  if (type === "DO_ANYTHING_WITH_AI") return !!config.prompt?.trim();
  if (type === "LAUNCH_AI_AGENT") return !!config.agentId && !!config.prompt?.trim();
  if (["UPDATE_CUSTOM_FIELD", "SET_AI_FIELD", "REFRESH_AI_FIELD"].includes(type)) return !!config.customFieldId;
  if (["UPDATE_ASSIGNEES", "ADD_ASSIGNEE", "UPDATE_FOLLOWERS", "ADD_FOLLOWER"].includes(type)) return !!config.userId;
  if (["MOVE_TO_LIST", "ADD_TO_LIST"].includes(type)) return !!config.listId;
  if (type === "CREATE_LIST") return !!config.listName?.trim();
  if (["CREATE_TASK", "CREATE_SUBTASK"].includes(type)) return !!config.title?.trim();
  if (type === "CALL_WEBHOOK") return !!config.url?.trim();
  if (type === "UPDATE_TASK_NAME") return !!config.name?.trim();
  if (type === "ESTIMATE_TIME") return !!config.timeEstimate;
  if (type === "TRACK_TIME") return !!config.duration;
  return true;
}

export function serializeAction(type: AutomationActionTypeV1, config: ActionConfigState) {
  if (type === "ADD_ASSIGNEE" || type === "UPDATE_ASSIGNEES") {
    return { type: "ADD_ASSIGNEE" as const, input: { userId: config.userId } };
  }
  if (type === "ADD_FOLLOWER" || type === "UPDATE_FOLLOWERS") {
    return { type: "ADD_FOLLOWER" as const, input: { userId: config.userId || "" } };
  }
  if (type === "SET_AI_FIELD" || type === "UPDATE_CUSTOM_FIELD" || type === "REFRESH_AI_FIELD") {
    return { type: type === "REFRESH_AI_FIELD" ? "REFRESH_AI_FIELD" : type === "SET_AI_FIELD" ? "SET_AI_FIELD" : "UPDATE_CUSTOM_FIELD", input: { customFieldId: config.customFieldId || "", value: config.value } };
  }
  if (type === "DO_ANYTHING_WITH_AI" || type === "LAUNCH_AI_AGENT") {
    return { type, input: { prompt: config.prompt || "", agentId: config.agentId } };
  }
  return { type, input: { ...config } };
}
