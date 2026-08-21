"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, AtSign, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import type { AutomationScope, AutomationActionTypeV1 } from "../../types";
import { ACTION_BY_TYPE } from "../../actionCatalog";
import { AssigneeMultiSelect } from "./AssigneeMultiSelect";
import { StatusSingleSelect } from "./StatusSingleSelect";
import { VariableTagChips, insertVariable } from "./VariableTagChips";
import { TagTriggerSelect } from "./TagTriggerSelect";
import { useState } from "react";
import type { ActionConfigState } from "./action-config-types";
export type { ActionConfigState } from "./action-config-types";
export { actionConfigIsValid, serializeAction } from "./action-config-types";
import {
  AddCommentComposer,
  SendChannelMessageConfig,
  SendDirectMessageConfig,
  ApplyTemplateConfig,
  EstimateTimeConfig,
  TrackTimeConfig,
  DuplicateTaskConfig,
  DateUpdateConfig,
  AddRelationshipConfig,
} from "./ActionSubConfigs";
import { DoAnythingWithAIConfig } from "./DoAnythingWithAIConfig";
import {
  AutomationTemplatePicker,
  AutomationPrioritySelect,
  AutomationRelationshipSelect,
  AutomationTaskTypeSelect,
  AutomationCustomFieldSelect,
  AutomationLocationSelect,
  AutomationListHierarchySelect,
  UpdateTaskTypeConfig,
  StatusFallbackWarning,
} from "./AutomationSelectHelpers";

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
  const [showAssigneeAdvanced, setShowAssigneeAdvanced] = useState(false);
  const meta = ACTION_BY_TYPE[actionType];
  const statuses = trpc.taskStatus.list.useQuery(
    { workspaceId: scope.workspaceId },
    { enabled: !!scope.workspaceId && ["UPDATE_STATUS", "CREATE_TASK", "CREATE_SUBTASK"].includes(actionType) },
  );
  const fields = trpc.customFields.list.useQuery(
    { workspaceId: scope.workspaceId, spaceId: scope.spaceId, projectId: scope.projectId, teamId: scope.teamId },
    { enabled: !!scope.workspaceId && ["CREATE_TASK", "CREATE_SUBTASK"].includes(actionType) },
  );
  const agents = trpc.agent.list.useQuery(
    {
      workspaceId: scope.workspaceId || "",
      spaceId: scope.spaceId,
      teamId: scope.teamId,
      projectId: scope.projectId,
      scopeMode: "inScope",
      pageSize: 50,
      includeAutomationAgents: true,
    },
    { enabled: !!scope.workspaceId && actionType === "LAUNCH_AI_AGENT" },
  );
  const channels = trpc.channel.list.useQuery(
    { workspaceId: scope.workspaceId, spaceId: scope.spaceId, projectId: scope.projectId, teamId: scope.teamId } as any,
    { enabled: !!scope.workspaceId && actionType === "SEND_CHANNEL_MESSAGE", staleTime: 60_000 },
  );
  const lists = trpc.list.byContext.useQuery(
    { workspaceId: scope.workspaceId, archived: false } as any,
    { enabled: !!scope.workspaceId && actionType === "DUPLICATE_TASK" },
  );
  const personalList = trpc.list.getPersonal.useQuery(
    undefined,
    { enabled: actionType === "DUPLICATE_TASK" },
  );

  if (meta?.comingSoon) {
    return <p className="text-xs text-zinc-500">This action is coming soon.</p>;
  }

  return (
    <div className="space-y-3">
      {actionType === "UPDATE_STATUS" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium !mb-0">
              Status <span className="text-red-500">*</span>
            </Label>
          </div>
          <StatusSingleSelect
            value={config.statusId}
            onChange={(statusId) => onChange({ ...config, statusId })}
            statuses={statuses.data ?? []} />
          <StatusFallbackWarning
            value={config.statusFallback}
            onChange={(statusFallback) => onChange({ ...config, statusFallback })}
          />
        </div>
      )}

      {actionType === "ADD_COMMENT" && (
        <AddCommentComposer
          config={config}
          onChange={onChange}
          scope={scope} />
      )}

      {actionType === "SEND_CHANNEL_MESSAGE" && (
        <SendChannelMessageConfig
          config={config}
          onChange={onChange}
          channels={channels.data ?? []}
          scope={scope} />
      )}

      {actionType === "SEND_DIRECT_MESSAGE" && (
        <SendDirectMessageConfig
          config={config}
          onChange={onChange}
          scope={scope}
        />
      )}

      {actionType === "APPLY_TEMPLATE" && (
        <ApplyTemplateConfig
          config={config}
          onChange={onChange}
          scope={scope} />
      )}

      {actionType === "UPDATE_FOLLOWERS" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Add follower(s)</Label>
            <AssigneeMultiSelect
              value={config.assigneeIds}
              onChange={(assigneeIds) => onChange({ ...config, assigneeIds })}
              scope={scope}
              peopleOnly={true}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Remove follower(s)</Label>
            <AssigneeMultiSelect
              value={config.removeAssigneeIds}
              onChange={(removeAssigneeIds) => onChange({ ...config, removeAssigneeIds })}
              scope={scope}
              peopleOnly={true}
            />
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="remove-all"
              checked={config.removeFollowerAll}
              onCheckedChange={(c) => onChange({ ...config, removeFollowerAll: !!c })}
              className="rounded border-zinc-300" />
            <label htmlFor="remove-all" className="text-[13px] text-zinc-700 cursor-pointer">
              Remove all Followers
            </label>
          </div>
        </div>
      )}

      {actionType === "DO_ANYTHING_WITH_AI" && (
        <DoAnythingWithAIConfig
          config={config}
          onChange={onChange}
          scope={scope}
          onAskBrain={onAskBrain}
        />
      )}

      {actionType === "LAUNCH_AI_AGENT" && (
        <div className="space-y-4">
          {/* Agent Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 bg-white shadow-xs">
            <Avatar className="h-10 w-10 ring-1 ring-zinc-200 shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-semibold">
                {(config.agentName || "Task Sanitizer").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-900 truncate">
                {config.agentName || (agents.data?.items?.find((a: any) => a.id === config.agentId)?.name || "Task Sanitizer")}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {config.agentDescription || (agents.data?.items?.find((a: any) => a.id === config.agentId)?.description || "Cleans up new task text")}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-zinc-900">Instructions</Label>
            <p className="text-xs text-zinc-500">Give your Agent additional instructions to use for this action.</p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white focus-within:border-zinc-300 shadow-xs overflow-hidden">
            <textarea
              className="w-full min-h-[100px] p-3 text-sm outline-none placeholder:text-zinc-400 bg-transparent resize-none"
              placeholder="e.g. Search the Workspace for relevant info and post your answer in a thread"
              value={config.prompt || ""}
              onChange={(e) => onChange({ ...config, prompt: e.target.value })}
            />
            <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-50/50 border-t border-zinc-100">
              <span className="text-xs text-zinc-400">
                Reference tasks, Docs, people to guide your agent
              </span>
              <button
                type="button"
                className="h-6 w-6 rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                title="Mention"
              >
                <AtSign className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {(actionType === "UPDATE_ASSIGNEES" || actionType === "ADD_ASSIGNEE") && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Add assignees</Label>
            <AssigneeMultiSelect
              value={config.assigneeIds}
              onChange={(assigneeIds) => onChange({ ...config, assigneeIds })}
              scope={scope} />
          </div>
          {actionType === "UPDATE_ASSIGNEES" && (
            <div className="space-y-1.5">
              <Label className="!text-xs !text-zinc-500 font-medium">Remove assignees</Label>
              <AssigneeMultiSelect
                value={config.removeAssigneeIds}
                onChange={(removeAssigneeIds) => onChange({ ...config, removeAssigneeIds })}
                scope={scope} />
            </div>
          )}
          {actionType === "UPDATE_ASSIGNEES" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAssigneeAdvanced(!showAssigneeAdvanced)}
                className="text-xs text-zinc-500 hover:text-zinc-700 border-b border-dashed border-zinc-400 cursor-pointer"
              >
                {showAssigneeAdvanced ? "Hide Advanced" : "Advanced"}
              </button>
            </div>
          )}
          {actionType === "UPDATE_ASSIGNEES" && (showAssigneeAdvanced || !!config.reassignUserIds?.length || !!config.reassignUserId || !!config.removeAllAssignees) && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="!text-xs !text-zinc-500 font-medium">Reassign</Label>
                <AssigneeMultiSelect
                  value={config.reassignUserIds || (config.reassignUserId ? [config.reassignUserId] : [])}
                  onChange={(reassignUserIds) =>
                    onChange({
                      ...config,
                      reassignUserIds,
                      reassignUserId: reassignUserIds[0],
                    })
                  }
                  scope={scope}
                />
              </div>
              <div className="flex items-center space-x-2 pt-0.5">
                <Checkbox
                  id="remove-all-assignees"
                  checked={config.removeAllAssignees}
                  onCheckedChange={(c) => onChange({ ...config, removeAllAssignees: !!c })}
                  className="rounded border-zinc-300"
                />
                <label htmlFor="remove-all-assignees" className="text-[13px] text-zinc-700 cursor-pointer">
                  Remove all assignees
                </label>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 rounded-md bg-[#fdf5d3] p-3 text-sm text-[#9b7328]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
            <p>If the assignee doesn't have access to the task, this action will be skipped.</p>
          </div>
        </div>
      )}

      {(actionType === "MOVE_TO_LIST" || actionType === "ADD_TO_LIST") && (
        <div className="space-y-2">
          <AutomationListHierarchySelect
            value={config.listId}
            onChange={(listId) => onChange({ ...config, listId })}
            scope={scope}
            allowCurrent={false}
            placeholder="Select a List"
          />
        </div>
      )}

      {actionType === "CREATE_LIST" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">
              Location <span className="text-red-500">*</span>
            </Label>
            <AutomationLocationSelect
              value={config.locationKey}
              onChange={(locationKey) => onChange({ ...config, locationKey })}
              scope={scope}
              placeholder="Select a Location"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">
              List name <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-9 placeholder:text-zinc-400 placeholder:text-sm"
              placeholder="List name"
              value={config.listName || ""}
              onChange={(e) => onChange({ ...config, listName: e.target.value })}
            />
            <VariableTagChips onInsert={(tag) => onChange({ ...config, listName: insertVariable(config.listName || "", tag) })} />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Template</Label>
            <AutomationTemplatePicker
              templateId={config.templateId}
              templateName={config.templateName}
              onChange={(id, name) => onChange({ ...config, templateId: id, templateName: name })}
              scope={scope}
            />
          </div>
        </div>
      )}

      {(actionType === "CREATE_TASK" || actionType === "CREATE_SUBTASK") && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">
              Task Name <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-9 placeholder:text-sm"
              placeholder="Task Name"
              value={config.title || ""}
              onChange={(e) => onChange({ ...config, title: e.target.value })} />
            <VariableTagChips onInsert={(tag) => onChange({ ...config, title: insertVariable(config.title || "", tag) })} />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">
              List <span className="text-red-500">*</span>
            </Label>
            <AutomationListHierarchySelect
              value={config.listId}
              onChange={(listId) => onChange({ ...config, listId })}
              scope={scope}
              allowCurrent={true}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Template</Label>
            <AutomationTemplatePicker
              templateId={config.templateId}
              templateName={config.templateName}
              onChange={(id, name) => onChange({ ...config, templateId: id, templateName: name })}
              scope={scope}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Status</Label>
            <StatusSingleSelect
              value={config.statusId}
              onChange={(statusId) => onChange({ ...config, statusId })}
              statuses={statuses.data ?? []}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Description</Label>
            <Textarea
              className="min-h-[80px] text-sm focus-visible:ring-1"
              placeholder="Enter a description"
              value={config.content || ""}
              onChange={(e) => onChange({ ...config, content: e.target.value })}
            />
            <VariableTagChips onInsert={(tag) => onChange({ ...config, content: insertVariable(config.content || "", tag) })} />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Priority</Label>
            <AutomationPrioritySelect
              value={config.priority}
              onChange={(priority) => onChange({ ...config, priority })}
            />
          </div>

          <DateUpdateConfig
            value={config.dueDate || ""}
            onChange={(dueDate) => onChange({ ...config, dueDate })}
            label="Due Date"
            required={false}
          />

          <DateUpdateConfig
            value={config.startDate || ""}
            onChange={(startDate) => onChange({ ...config, startDate })}
            label="Start Date"
            required={false}
          />

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Tags</Label>
            <TagTriggerSelect
              value={config.tags || ""}
              onChange={(tags) => onChange({ ...config, tags })}
              workspaceId={scope.workspaceId}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Assignees</Label>
            <AssigneeMultiSelect value={config.assigneeIds} onChange={(assigneeIds) => onChange({ ...config, assigneeIds })} scope={scope} />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Custom Field(s)</Label>
            <AutomationCustomFieldSelect
              value={config.customFieldId}
              onChange={(customFieldId) => onChange({ ...config, customFieldId })}
              fields={fields.data ?? []}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Relationship type</Label>
            <AutomationRelationshipSelect
              value={config.relationshipType}
              onChange={(relationshipType) => onChange({ ...config, relationshipType })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Task Type</Label>
            <AutomationTaskTypeSelect
              value={config.taskType}
              onChange={(taskType) => onChange({ ...config, taskType })}
            />
          </div>

          <StatusFallbackWarning
            value={config.statusFallback}
            onChange={(statusFallback) => onChange({ ...config, statusFallback })}
          />
          <div className="flex items-start gap-2 rounded-md bg-[#fdf5d3] p-3 text-sm text-[#9b7328]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
            <p>If the assignee doesn't have access to the task, this action will be skipped.</p>
          </div>
        </div>
      )}


      {actionType === "CALL_WEBHOOK" && (
        <div>
          <Label className="!text-xs !text-zinc-500 font-medium">
            URL <span className="text-red-500">*</span>
          </Label>
          <Input className="h-9" placeholder="https://" value={config.url || ""} onChange={(e) => onChange({ ...config, url: e.target.value })} />
        </div>
      )}

      {actionType === "UPDATE_PRIORITY" && (
        <div className="space-y-1.5">
          <Label className="!text-xs !text-zinc-500 font-medium">
            Priority Level <span className="text-red-500">*</span>
          </Label>
          <AutomationPrioritySelect
            value={config.priority || ""}
            onChange={(priority) => onChange({ ...config, priority })}
            placeholder="Select a priority"
          />
        </div>
      )}

      {actionType === "UPDATE_TAGS" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Add tag(s)</Label>
            <TagTriggerSelect
              value={config.tags}
              onChange={(tag) => onChange({ ...config, tags: tag })}
              workspaceId={scope.workspaceId}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Remove tag(s)</Label>
            <TagTriggerSelect
              value={config.removeTags}
              onChange={(tag) => onChange({ ...config, removeTags: tag })}
              workspaceId={scope.workspaceId}
            />
          </div>
        </div>
      )}

      {actionType === "UPDATE_TASK_NAME" && (
        <div className="space-y-1.5">
          <Input
            className="h-9 placeholder:text-zinc-400 placeholder:text-sm"
            placeholder="Updated task name"
            value={config.name || ""}
            onChange={(e) => onChange({ ...config, name: e.target.value })}
          />
          <VariableTagChips onInsert={(tag) => onChange({ ...config, name: insertVariable(config.name || "", tag) })} />
        </div>
      )}

      {actionType === "UPDATE_TASK_TYPE" && (
        <UpdateTaskTypeConfig
          config={config}
          onChange={onChange}
          scope={scope}
        />
      )}

      {actionType === "UPDATE_DUE_DATE" && (
        <DateUpdateConfig
          value={config.dueDate || ""}
          onChange={(v) => onChange({ ...config, dueDate: v })}
          label="Due Date"
        />
      )}

      {actionType === "UPDATE_START_DATE" && (
        <DateUpdateConfig
          value={config.startDate || ""}
          onChange={(v) => onChange({ ...config, startDate: v })}
          label="Start Date"
        />
      )}

      {actionType === "ESTIMATE_TIME" && (
        <EstimateTimeConfig
          value={config.timeEstimate || ""}
          onChange={(timeEstimate) => onChange({ ...config, timeEstimate })}
          label="Time Estimate"
        />
      )}

      {actionType === "TRACK_TIME" && (
        <TrackTimeConfig
          config={config}
          onChange={onChange}
          scope={scope}
        />
      )}

      {actionType === "DUPLICATE_TASK" && (
        <DuplicateTaskConfig
          config={config}
          onChange={onChange}
          scope={scope}
        />
      )}

      {actionType === "ADD_RELATIONSHIP" && (
        <AddRelationshipConfig
          config={config}
          onChange={onChange}
          scope={scope}
        />
      )}
    </div>
  );
}

