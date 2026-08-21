"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { IntegrationConfigField } from "../../integrationAutomationCatalog";
import { VariableTagChips, insertVariable } from "./VariableTagChips";

export type IntegrationConfigValues = Record<string, string | boolean>;

export function IntegrationConfigFields({
  providerId,
  fields,
  config,
  onChange,
  onConnect,
}: {
  providerId: string;
  fields: IntegrationConfigField[];
  config: IntegrationConfigValues;
  onChange: (next: IntegrationConfigValues) => void;
  onConnect: () => void;
}) {
  const catalog = trpc.integration.listCatalog.useQuery();
  const provider = catalog.data?.providers.find(
    (p) => p.providerId === providerId || p.providerId === mapProvider(providerId),
  );
  const accounts = provider?.accounts ?? [];
  const isConnected = accounts.length > 0;

  const basicFields = fields.filter((f) => !f.advanced);

  const set = (id: string, value: string | boolean) => onChange({ ...config, [id]: value });

  return (
    <div className="space-y-3">
      {/* Account */}
      <div>
        <Label className="!text-xs !font-medium !text-zinc-500">
          Account <span className="text-red-500">*</span>
        </Label>
        {isConnected ? (
          <Select
            value={(config.__accountId as string) || ""}
            onValueChange={(v) => set("__accountId", v)}
          >
            <SelectTrigger className="mt-1 h-9 w-full hover:bg-zinc-50 shadow-none">
              <SelectValue placeholder={`Select ${provider?.displayName ?? "account"}`} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.primaryLabel || acc.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button
            type="button"
            className="mt-1 w-full bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
            onClick={onConnect}
          >
            Connect account
          </Button>
        )}
      </div>

      {/* Basic fields */}
      <FieldGrid fields={basicFields} config={config} onChange={onChange} />
    </div>
  );
}

function FieldGrid({
  fields,
  config,
  onChange,
}: {
  fields: IntegrationConfigField[];
  config: IntegrationConfigValues;
  onChange: (next: IntegrationConfigValues) => void;
}) {
  const set = (id: string, value: string | boolean) => onChange({ ...config, [id]: value });

  const halfFields = fields.filter((f) => f.halfWidth);
  const fullFields = fields.filter((f) => !f.halfWidth);

  return (
    <div className="space-y-3">
      {fullFields.map((field) => (
        <FieldRenderer key={field.id} field={field} value={config[field.id]} onChange={(v) => set(field.id, v)} />
      ))}
      {halfFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {halfFields.map((field) => (
            <FieldRenderer key={field.id} field={field} value={config[field.id]} onChange={(v) => set(field.id, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: IntegrationConfigField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  switch (field.type) {
    case "text":
    case "email":
      return (
        <div>
          <Label className="!text-xs !font-medium !text-zinc-500">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
            {field.optional && <span className="text-zinc-400 font-normal"> (optional)</span>}
          </Label>
          <Input
            className="mt-1 h-9 placeholder:text-zinc-400 placeholder:text-sm"
            type={field.type === "email" ? "email" : "text"}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.supportsVariables && (
            <VariableTagChips
              onInsert={(tag) => onChange(insertVariable((value as string) || "", tag))}
            />
          )}
        </div>
      );

    case "textarea":
      return (
        <div>
          <Label className="!text-xs !font-medium !text-zinc-500">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </Label>
          <Textarea
            className="mt-1 text-sm min-h-[80px] resize-none"
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.supportsVariables && (
            <VariableTagChips
              onInsert={(tag) => onChange(insertVariable((value as string) || "", tag))}
            />
          )}
        </div>
      );

    case "richtext":
      return (
        <div>
          <Label className="!text-xs !font-medium !text-zinc-500">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </Label>
          <Textarea
            className="mt-1 text-sm min-h-[100px] resize-y"
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex items-center gap-0.5 mt-1 border rounded-md px-1 py-0.5 w-fit">
            {["B", "I", "U"].map((btn) => (
              <button
                key={btn}
                type="button"
                className="h-6 w-6 flex items-center justify-center text-xs text-zinc-500 hover:bg-zinc-100 rounded cursor-pointer"
                style={btn === "B" ? { fontWeight: 700 } : btn === "I" ? { fontStyle: "italic" } : { textDecoration: "underline" }}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      );

    case "select":
      return (
        <div>
          <Label className="!text-xs !font-medium !text-zinc-500">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
            {field.optional && <span className="text-zinc-400 font-normal"> (optional)</span>}
          </Label>
          <Select value={(value as string) || ""} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="mt-1 h-9 w-full hover:bg-zinc-50 shadow-none">
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? [{ value: "__any", label: "Any" }]).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "datetime":
      return <DateTimeFieldRenderer field={field} value={value} onChange={onChange} />;

    case "file":
      return (
        <div>
          <Label className="!text-xs !font-medium !text-zinc-500">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </Label>
          <div className="mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 py-8 text-center">
            <Upload className="h-8 w-8 text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-500">Click to upload or drag and drop</p>
            <p className="text-[11px] text-zinc-400 mt-1">Maximum file size: 25MB</p>
          </div>
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-center gap-2 py-1">
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onChange(!!checked)}
            className="h-4 w-4 cursor-pointer"
          />
          <Label className="!text-xs !font-medium !text-zinc-500 cursor-pointer">{field.label}</Label>
        </div>
      );

    default:
      return null;
  }
}

function DateTimeFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: IntegrationConfigField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const strVal = typeof value === "string" ? value : "";
  const parsedDate = strVal ? new Date(strVal) : undefined;
  const isValidDate = parsedDate instanceof Date && !isNaN(parsedDate.getTime());

  const formattedDisplay = isValidDate
    ? parsedDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <div>
      <Label className="!text-xs !font-medium !text-zinc-500">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
        {field.optional && <span className="text-zinc-400 font-normal"> (optional)</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm text-left hover:bg-zinc-50 transition-colors cursor-pointer shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
              {formattedDisplay ? (
                <span className="truncate text-zinc-900 font-normal">{formattedDisplay}</span>
              ) : (
                <span className="truncate text-zinc-400 font-normal">
                  {field.placeholder || "Select date and time"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {isValidDate && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("");
                  }}
                  className="p-0.5 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              {open ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </div>
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
          <SingleDateCalendar
            selectedDate={isValidDate ? parsedDate : undefined}
            onDateChange={(d) => {
              onChange(d ? d.toISOString() : "");
            }}
            showTimeInput={true}
          />
        </PopoverContent>
      </Popover>
      {field.supportsVariables && (
        <VariableTagChips
          onInsert={(tag) => onChange(insertVariable(strVal, tag))}
        />
      )}
    </div>
  );
}

function mapProvider(id: string): string {
  const map: Record<string, string> = {
    gmail: "google_mail",
    google_calendar: "google_calendar",
    google_drive: "google_drive",
    github: "github",
    slack: "slack",
  };
  return map[id] ?? id;
}
