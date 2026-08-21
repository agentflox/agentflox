"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ChevronDown, ChevronLeft, Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AutomationScope } from "../types";

type KvPair = { key: string; value: string };
type WebhookFormValues = {
  title: string;
  description: string;
  url: string;
  headers: KvPair[];
  urlParams: KvPair[];
  isActive: boolean;
};

const WEBHOOK_VARIABLES = [
  { label: "Task ID", token: "{{task_id}}" },
  { label: "Task Name", token: "{{task_name}}" },
  { label: "Task Description", token: "{{task_description}}" },
  { label: "Creator Username", token: "{{creator_username}}" },
  { label: "Creator Email", token: "{{creator_email}}" },
  { label: "Due Date", token: "{{due_date}}" },
  { label: "Start Date", token: "{{start_date}}" },
  { label: "Date Created", token: "{{date_created}}" },
  { label: "Date Updated", token: "{{date_updated}}" },
  { label: "Date Closed", token: "{{date_closed}}" },
  { label: "Assignee Username", token: "{{assignee_username}}" },
  { label: "Assignee Email", token: "{{assignee_email}}" },
  { label: "Status", token: "{{status}}" },
  { label: "Priority", token: "{{priority}}" },
  { label: "List ID", token: "{{list_id}}" },
  { label: "Project ID", token: "{{project_id}}" },
  { label: "Space ID", token: "{{space_id}}" },
];

const COMMON_HEADERS = [
  "Accept",
  "Authorization",
  "Content-Type",
  "Cookie",
  "Referrer",
  "User-Agent",
  "X-Api-Key",
  "X-Requested-With",
];

function emptyPair(): KvPair {
  return { key: "", value: "" };
}

function parsePairs(raw: unknown): KvPair[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyPair()];
  return raw.map((p: any) => ({ key: String(p?.key ?? ""), value: String(p?.value ?? "") }));
}

const HEADER_KEY_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function getHeaderKeyError(key: string, allKeys: string[], idx: number): string | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (!HEADER_KEY_PATTERN.test(trimmed)) {
    return "This custom header key is invalid. Please use a valid data.";
  }
  const isDuplicate = allKeys.some((k, i) => i !== idx && k.trim().toLowerCase() === trimmed.toLowerCase());
  if (isDuplicate) {
    return "This header key is already used. Please use a unique key.";
  }
  return null;
}

function getHeaderValueError(key: string, value: string): string | null {
  if (!key.trim() && !value.trim()) return null;
  if (!value.trim()) return "This custom header value is invalid. Please use a valid data.";
  return null;
}

function HeaderKeyInput({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = COMMON_HEADERS.filter((h) => h.toLowerCase().includes(value.trim().toLowerCase()));

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        aria-invalid={!!error}
        className={cn("h-8 text-xs pr-7", error && "border-red-400 focus-visible:ring-red-300")}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md py-1 max-h-48 overflow-y-auto">
          {filtered.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => {
                onChange(h);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-violet-50 hover:text-violet-700 cursor-pointer"
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-[11px] leading-tight text-red-500">
          {error.split(". ").map((line, i, arr) => (
            <span key={i} className="block">
              {line}
              {i < arr.length - 1 ? "." : ""}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function VariablePickerPopover({
  variables,
  onSelect,
  onClose,
}: {
  variables: { label: string; token: string }[];
  onSelect: (token: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const filtered = variables.filter((v) => v.label.toLowerCase().includes(search.trim().toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) {
        onSelect(filtered[highlighted].token);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div ref={containerRef} className="absolute z-30 mt-2 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg p-3">
      <input
        ref={inputRef}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type to search"
        className="w-full border-b border-zinc-200 pb-2 mb-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
      />
      <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
        {filtered.length === 0 && <span className="text-xs text-zinc-400 px-1 py-2">No variables found</span>}
        {filtered.map((v, idx) => (
          <button
            key={v.token}
            type="button"
            onMouseEnter={() => setHighlighted(idx)}
            onClick={() => {
              onSelect(v.token);
              onClose();
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs cursor-pointer transition-colors",
              idx === highlighted ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function KvRows({
  fields,
  remove,
  append,
  watchRows,
  setValue,
  keyPlaceholder,
  valuePlaceholder,
  isHeaderKey = false,
}: {
  fields: Array<{ id: string }>;
  remove: (index: number) => void;
  append: (value: KvPair) => void;
  watchRows: KvPair[];
  setValue: (
    name: `headers.${number}.key` | `headers.${number}.value` | `urlParams.${number}.key` | `urlParams.${number}.value`,
    value: string,
    options?: { shouldValidate?: boolean; shouldDirty?: boolean; shouldTouch?: boolean },
  ) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  isHeaderKey?: boolean;
}) {
  const allKeys = watchRows.map((r) => r?.key ?? "");

  return (
    <div className="space-y-2">
      {fields.map((field, idx) => {
        const row = watchRows[idx] ?? emptyPair();
        const keyError = isHeaderKey ? getHeaderKeyError(row.key, allKeys, idx) : null;
        const valueError = isHeaderKey ? getHeaderValueError(row.key, row.value) : null;

        return (
          <div key={field.id} className="group grid grid-cols-2 gap-2 items-start">
            {isHeaderKey ? (
              <HeaderKeyInput
                value={row.key}
                placeholder={keyPlaceholder}
                error={keyError}
                onChange={(val) =>
                  setValue(`headers.${idx}.key`, val, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
              />
            ) : (
              <Input
                value={row.key}
                placeholder={keyPlaceholder}
                onChange={(e) =>
                  setValue(`urlParams.${idx}.key`, e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
                className="h-8 text-xs"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <Input
                  value={row.value}
                  placeholder={valuePlaceholder}
                  onChange={(e) =>
                    setValue(
                      isHeaderKey ? `headers.${idx}.value` : `urlParams.${idx}.value`,
                      e.target.value,
                      {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      },
                    )
                  }
                  className={cn("h-8 text-xs", valueError && "border-red-400 focus-visible:ring-red-300")}
                />
                <button
                  type="button"
                  className="h-7 w-7 shrink-0 rounded-md opacity-0 group-hover:opacity-100 transition border border-red-200 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  onClick={() => remove(idx)}
                  aria-label="Delete row"
                >
                  <Trash2 className="h-3 w-3 mx-auto" />
                </button>
              </div>
              {valueError && <p className="mt-1 text-[11px] leading-tight text-red-500">{valueError}</p>}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer px-2 py-1 rounded-md"
        onClick={() => append(emptyPair())}
      >
        <Plus className="h-3 w-3" />
        Add
      </button>
    </div>
  );
}

export function CreateWebhookContent({
  scope,
  editingId,
  onBack,
  onSaved,
}: {
  scope: AutomationScope;
  editingId?: string | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const form = useForm<WebhookFormValues>({
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      url: "",
      headers: [emptyPair()],
      urlParams: [emptyPair()],
      isActive: true,
    },
  });
  const {
    control,
    getValues,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors, isValid },
  } = form;
  const headersArray = useFieldArray({ control, name: "headers" });
  const urlParamsArray = useFieldArray({ control, name: "urlParams" });

  const existing = trpc.webhook.get.useQuery({ id: editingId! }, { enabled: !!editingId });
  const create = trpc.webhook.create.useMutation();
  const update = trpc.webhook.update.useMutation();
  const test = trpc.webhook.test.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!existing.data) return;
    reset({
      title: existing.data.name,
      description: existing.data.description || "",
      url: existing.data.url,
      headers: parsePairs(existing.data.headers),
      urlParams: parsePairs(existing.data.urlParams),
      isActive: existing.data.isActive,
    });
  }, [existing.data, reset]);

  const title = watch("title");
  const description = watch("description");
  const url = watch("url");
  const headers = watch("headers");
  const urlParams = watch("urlParams");
  const isActive = watch("isActive");

  const titleError = errors.title?.message as string | undefined;
  const urlError = errors.url?.message as string | undefined;

  const headerKeys = headers.map((h) => h?.key ?? "");
  const hasHeaderErrors = headers.some((row, idx) => {
    const key = row?.key ?? "";
    const value = row?.value ?? "";
    return !!getHeaderKeyError(key, headerKeys, idx) || !!getHeaderValueError(key, value);
  }, [existing.data]);
  const canSave = isValid && !hasHeaderErrors;

  const visibleVariables = WEBHOOK_VARIABLES.slice(0, 10);
  const hiddenVariables = WEBHOOK_VARIABLES.slice(10);
  const hiddenCount = hiddenVariables.length;

  const insertVariable = (token: string) => {
    const prev = getValues("url");
    const needsSlash = prev.length > 0 && !prev.endsWith("/");
    setValue("url", `${prev}${needsSlash ? "/" : ""}${token}/`, { shouldValidate: true, shouldDirty: true });
  };

  const cleanPairs = (rows: KvPair[]) => rows.filter((r) => r.key.trim());

  const handleSave = async () => {
    const valid = await trigger();
    if (!valid || hasHeaderErrors) {
      toast.error("Please fix the errors before saving.");
      return;
    }
    const payload = {
      name: title.trim(),
      description: description.trim() || null,
      type: "automation" as const,
      url: url.trim(),
      headers: cleanPairs(headers),
      urlParams: cleanPairs(urlParams),
      isActive,
    };
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      await utils.webhook.list.invalidate();
      toast.success(editingId ? "Webhook updated" : "Webhook created");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save webhook");
    }
  };

  const handleTest = async () => {
    const valid = await trigger(["url"]);
    if (!valid) {
      toast.error("Enter a valid URL before testing");
      return;
    }
    if (hasHeaderErrors) {
      toast.error("Fix the header errors before testing");
      return;
    }
    try {
      const result = await test.mutateAsync({
        url: url.trim(),
        headers: cleanPairs(headers),
        urlParams: cleanPairs(urlParams),
        webhookId: editingId || undefined,
      });
      if (result.ok) toast.success(`Webhook test succeeded (${result.httpStatus})`);
      else toast.error(`Webhook test failed (${result.httpStatus})`);
    } catch (e: any) {
      toast.error(e.message || "Webhook test failed");
    }
  };

  const statusHint = useMemo(
    () => (isActive ? "Enabled" : "Disabled"),
    [isActive],
  );

  return (
    <div className="flex flex-col min-h-0 h-[640px]">
      <div className="flex items-center gap-3 px-5 py-3 border-b">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 cursor-pointer" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold text-zinc-900">
          {editingId ? "Edit webhook" : "Create webhook"}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto w-full space-y-3" style={{ maxWidth: 560 }}>
          <div className="rounded-xl border border-zinc-200 p-3.5 space-y-3">
            <div className="space-y-1">
              <Label className="!text-sm text-zinc-700">Title</Label>
              <Controller
                control={control}
                name="title"
                rules={{ validate: (value) => value.trim().length > 0 || "Title is required." }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Webhook title"
                    aria-invalid={!!titleError}
                    className={cn("h-8 text-xs", titleError && "border-red-400 focus-visible:ring-red-300")}
                  />
                )}
              />
              {titleError && <p className="text-[11px] leading-tight text-red-500">{titleError}</p>}
            </div>
            <div className="space-y-1">
              <Label className="!text-sm text-zinc-700">Description</Label>
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Describe your webhook"
                    className="min-h-[72px] resize-none text-xs shadow-none focus-visible:ring-1"
                  />
                )}
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-3.5 space-y-3">
            <div className="space-y-1">
              <Label className="!text-sm text-zinc-700">Url</Label>
              <Controller
                control={control}
                name="url"
                rules={{
                  validate: (value) =>
                    value.trim().length === 0
                      ? "Url is required."
                      : /^https?:\/\/.+/i.test(value.trim())
                        ? true
                        : "This URL is invalid. Please use a valid URL.",
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="https://my-app.com/api/webhook"
                    aria-invalid={!!urlError}
                    className={cn("h-8 text-xs", urlError && "border-red-400 focus-visible:ring-red-300")}
                  />
                )}
              />
              {urlError && (
                <p className="text-[11px] leading-tight text-red-500">{urlError}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visibleVariables.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVariable(v.token)}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  {v.label}
                </button>
              ))}
              {hiddenCount > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowVariablePicker((o) => !o)}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100 cursor-pointer"
                  >
                    + {hiddenCount}
                  </button>
                  {showVariablePicker && (
                    <VariablePickerPopover
                      variables={hiddenVariables}
                      onSelect={insertVariable}
                      onClose={() => setShowVariablePicker(false)}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="!text-sm text-zinc-700">Headers</Label>
              <KvRows
                fields={headersArray.fields}
                remove={headersArray.remove}
                append={headersArray.append}
                watchRows={headers}
                setValue={setValue}
                keyPlaceholder="Content-type"
                valuePlaceholder="application/json"
                isHeaderKey
              />
            </div>

            <div className="space-y-1.5">
              <Label className="!text-sm text-zinc-700">Url Parameters</Label>
              <KvRows
                fields={urlParamsArray.fields}
                remove={urlParamsArray.remove}
                append={urlParamsArray.append}
                watchRows={urlParams}
                setValue={setValue}
                keyPlaceholder="Key"
                valuePlaceholder="Value"
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-900">Test webhook</p>
                <p className="text-xs text-zinc-500 mt-0.5">Test your webhook with a sample payload.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer text"
                disabled={test.isPending}
                onClick={handleTest}
              >
                Test webhook
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <p className="text-sm font-medium text-zinc-900">Webhook status</p>
                <p className="text-xs text-zinc-500 mt-0.5">Enable or disable your webhook to control the flow of data.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-violet-600"
                    />
                  )}
                />
                <span className={cn("text-xs", isActive ? "text-violet-700 font-medium" : "text-zinc-500")}>
                  {statusHint}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pb-1 pt-2">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSave || create.isPending || update.isPending}
              className={cn(
                "cursor-pointer",
                canSave ? "bg-zinc-900 hover:bg-zinc-700 text-white" : "bg-zinc-200 text-zinc-500 hover:bg-zinc-200",
              )}
              onClick={handleSave}
            >
              {editingId ? "Save changes" : "Create Webhook"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}