import React from "react";
import { Files, Wrench, Bot } from "lucide-react";
import type { InputUiType } from "../types/builder";

export function branchEntryIcon(nodeType: string) {
  if (nodeType === "inputs") return <Files className="h-3.5 w-3.5 text-sky-500" />;
  if (nodeType === "tool") return <Wrench className="h-3.5 w-3.5 text-emerald-500" />;
  return <Bot className="h-3.5 w-3.5 text-violet-500" />;
}

export function branchTypeColor(t: string) {
  if (t === "String") return "text-amber-600";
  if (t === "Object") return "text-violet-600";
  if (t === "Number") return "text-sky-600";
  if (t === "Any") return "text-zinc-500";
  return "text-zinc-500";
}

export function branchTypeIcon(t: string) {
  if (t === "Number") return <span className="text-[9px] font-black text-sky-600">#</span>;
  return <span className="text-[9px] font-black text-amber-600">T</span>;
}

export const operatorHasRightValue = (op: string) =>
  op !== "is_empty" && op !== "is_not_empty";

export function toVarName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "step";
}

export function inferUiTypeFromProp(prop: any, propName?: string): InputUiType {
  const hinted = prop?.["x-uiType"] as InputUiType | undefined;
  if (hinted) return hinted;
  const name = String(propName || prop?.title || "").toLowerCase();
  if (
    name === "api_key" ||
    /_api_key$/.test(name) ||
    /(^|_)(access_token|secret|password|token)$/.test(name)
  ) {
    return "api_key";
  }
  const t = (prop?.type as string | undefined) ?? "string";
  if (t === "boolean") return "checkbox";
  if (t === "number" || t === "integer") return "number";
  if (t === "array") return "text_list";
  if (t === "object") return "json";
  return "text";
}
