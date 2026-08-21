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
import { Trash2, Users, Network } from "lucide-react";
import { IntegrationBrandImage } from "@/features/integrations/components/IntegrationBrandImage";
import { User } from "lucide-react";

export function ToolBlockCard({
  toolId,
  config = {},
  onChangeConfig,
  onRemove,
  systemTools = [],
  compositeTools = [],
  providers = [],
  spaces = [],
}: {
  toolId: string;
  config?: any;
  onChangeConfig: (patch: any) => void;
  onRemove: () => void;
  systemTools?: any[];
  compositeTools?: any[];
  providers?: any[];
  spaces?: any[];
}) {
  const systemTool = systemTools.find((t: any) => t.id === toolId || t.name === toolId);
  const compositeTool = compositeTools.find((ct: any) => ct.id === toolId || ct.name === toolId);

  let providerAction: any = null;
  let matchedProvider: any = null;

  for (const p of providers || []) {
    const act = (p?.actions || []).find(
      (a: any) =>
        a &&
        (a.actionId === toolId ||
          `${p.providerId}:${a.actionId}` === toolId ||
          (a.name && toolId && a.name.toLowerCase() === toolId.toLowerCase()) ||
          (a.displayName && toolId && a.displayName.toLowerCase() === toolId.toLowerCase()) ||
          (systemTool &&
            a.name &&
            (systemTool.displayName || systemTool.name) &&
            a.name.toLowerCase() === (systemTool.displayName || systemTool.name).toLowerCase()))
    );
    if (act) {
      providerAction = act;
      matchedProvider = p;
      break;
    }
  }

  const isIntegration = !!matchedProvider || (systemTool?.category === "integration");
  const providerId = matchedProvider?.providerId || (toolId?.includes("gmail") ? "gmail" : toolId?.includes("slack") ? "slack" : null);
  const providerName = matchedProvider?.displayName || (providerId === "gmail" ? "Gmail" : providerId === "slack" ? "Slack" : null);

  const title =
    providerAction?.displayName ||
    providerAction?.name ||
    systemTool?.displayName ||
    systemTool?.name ||
    compositeTool?.name ||
    (toolId || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const description =
    providerAction?.description ||
    systemTool?.description ||
    compositeTool?.description ||
    (toolId === "write_project_update"
      ? "Write a project update for the selected location and time period."
      : toolId === "mark_emails_read"
        ? "Mark messages as read to clear their unread status."
        : toolId === "archive_emails"
          ? "Archive messages by removing them from the inbox without deleting them."
          : "Perform action with selected parameters.");

  const icon = providerId ? (
    <span className="inline-flex h-4 w-4 items-center justify-center shrink-0">
      <IntegrationBrandImage provider={providerId} size={16} />
    </span>
  ) : (
    <span className="h-4 w-4 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-700 shrink-0">
      <User className="h-2.5 w-2.5" />
    </span>
  );

  const parametersSchema =
    providerAction?.inputSchema ||
    providerAction?.parameters ||
    systemTool?.parameters ||
    compositeTool?.parameters ||
    {};
  const schemaProperties = parametersSchema.properties || {};
  const requiredFields = parametersSchema.required || [];

  const hasLocationField =
    !isIntegration &&
    (toolId.includes("project_update") ||
      toolId.includes("location") ||
      systemTool?.name?.includes("project") ||
      (!isIntegration && !providerId && !Object.keys(schemaProperties).length));

  const hasTimePeriodField =
    !isIntegration &&
    (toolId.includes("project_update") ||
      toolId.includes("time") ||
      toolId === "write_project_update");

  const hasAccountField = isIntegration || !!providerId;

  const renderField = (key: string, prop: any, isRequired: boolean) => {
    const label = prop.title || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();

    if (key === "location" || key === "spaceId" || key === "workspaceId") {
      return (
        <div key={key} className="space-y-1.5">
          <Label className="!text-xs !text-zinc-500 font-medium">
            {label}{isRequired && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={config?.[key] || "team_space"}
            onValueChange={(v) => onChangeConfig({ [key]: v })}
          >
            <SelectTrigger className="w-full h-9 bg-white border-zinc-200 text-sm hover:bg-zinc-50 rounded-md">
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-zinc-200 bg-white">
              <SelectItem value="team_space">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    <Users className="h-2.5 w-2.5" />
                  </div>
                  <span>Team Space</span>
                </div>
              </SelectItem>
              {spaces.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <Network className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{s.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (key === "timePeriod" || key === "time_period") {
      return (
        <div key={key} className="space-y-1.5">
          <Label className="!text-xs !text-zinc-500 font-medium">
            {label}{isRequired && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={config?.[key] || "last_24_hours"}
            onValueChange={(v) => onChangeConfig({ [key]: v })}
          >
            <SelectTrigger className="w-full h-9 bg-white border-zinc-200 text-sm hover:bg-zinc-50 rounded-md">
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-zinc-200 bg-white">
              <SelectItem value="last_24_hours">Last 24 hours</SelectItem>
              <SelectItem value="last_7_days">Last 7 days</SelectItem>
              <SelectItem value="last_30_days">Last 30 days</SelectItem>
              <SelectItem value="last_90_days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (prop.enum && Array.isArray(prop.enum)) {
      return (
        <div key={key} className="space-y-1.5">
          <Label className="!text-xs !text-zinc-500 font-medium">
            {label}{isRequired && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={config?.[key] || ""}
            onValueChange={(v) => onChangeConfig({ [key]: v })}
          >
            <SelectTrigger className="w-full h-9 bg-white border-zinc-200 text-sm hover:bg-zinc-50 rounded-md">
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-zinc-200 bg-white">
              {prop.enum.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1.5">
        <Label className="!text-xs !text-zinc-500 font-medium">
          {label}{isRequired && <span className="text-red-500">*</span>}
        </Label>
        <input
          type={prop.type === "number" ? "number" : "text"}
          placeholder={prop.description || `Enter ${label.toLowerCase()}`}
          value={config?.[key] || ""}
          onChange={(e) => onChangeConfig({ [key]: e.target.value })}
          className="w-full h-9 px-3 bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-md transition-all"
        />
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-xs text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-sm font-semibold text-zinc-900 truncate">{title}</span>
          {providerName && (
            <span className="text-xs text-zinc-400 font-normal shrink-0">{providerName}</span>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove tool"
              className="text-zinc-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove tool</TooltipContent>
        </Tooltip>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>

      {/* Fields */}
      <div className="space-y-3 pt-0.5">
        {Object.keys(schemaProperties).length > 0 ? (
          Object.entries(schemaProperties).map(([key, prop]: [string, any]) =>
            renderField(key, prop, requiredFields.includes(key))
          )
        ) : (
          <>
            {hasLocationField && renderField("location", { title: "Location" }, true)}
            {hasTimePeriodField && renderField("timePeriod", { title: "Time period" }, false)}
          </>
        )}

        {hasAccountField && (
          <div className="space-y-1.5">
            <Label className="!text-xs !text-zinc-500 font-medium">Account</Label>
            <Select
              value={config?.accountId || ""}
              onValueChange={(v) => onChangeConfig({ accountId: v })}
            >
              <SelectTrigger className="w-full h-9 bg-white border-zinc-200 text-sm text-zinc-500 hover:bg-zinc-50 rounded-md">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-zinc-200 bg-white">
                <SelectItem value="default">Default Account</SelectItem>
                <SelectItem value="personal">Personal Account</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}



