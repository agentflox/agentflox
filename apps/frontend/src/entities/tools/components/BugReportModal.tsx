"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bug, Info, MessageCircle, ChevronDown, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: string; // "tool" | "agent" | "workspace" | "task" …
  entityId?: string;
  onOpenSupport?: () => void;
}

// ─── Enum config ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "UI", label: "UI / UX" },
  { value: "FUNCTIONALITY", label: "Functionality" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "SECURITY", label: "Security" },
  { value: "DATA", label: "Data Issue" },
  { value: "INTEGRATION", label: "Integration" },
  { value: "OTHER", label: "Other" },
];

const SEVERITIES: { value: string; label: string; badge: string }[] = [
  { value: "CRITICAL", label: "Critical", badge: "bg-red-100 text-red-700 border-red-200" },
  { value: "HIGH", label: "High", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "MEDIUM", label: "Medium", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "LOW", label: "Low", badge: "bg-zinc-100 text-zinc-600 border-zinc-200" },
];

const REPRODUCIBILITY = [
  { value: "ALWAYS", label: "Always" },
  { value: "SOMETIMES", label: "Sometimes" },
  { value: "RARELY", label: "Rarely" },
  { value: "UNABLE", label: "Unable to reproduce" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function BugReportModal({ isOpen, onClose, entityType, entityId, onOpenSupport }: BugReportModalProps) {
  const { data: session } = useSession();

  // Core fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [reproducibility, setReproducibility] = useState("");

  // Auto-captured (lazy: only read when modal is open)
  const pageUrl = typeof window !== "undefined" ? window.location.href : undefined;
  const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : undefined;
  const locale = typeof window !== "undefined" ? window.navigator.language : undefined;

  const createBugReport = trpc.bugReport.create.useMutation({
    onSuccess: () => {
      toast.success("Bug report submitted. Thank you for helping improve the platform!");
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit bug report.");
    },
  });

  const reset = () => {
    setTitle(""); setCategory(""); setSeverity("MEDIUM"); setDescription(""); setTags("");
    setStepsToReproduce(""); setExpectedBehavior(""); setActualBehavior(""); setReproducibility("");
    setShowAdvanced(false);
  };

  const isValid = title.trim().length > 0 && category !== "" && description.length >= 10;

  const handleSubmit = () => {
    if (!isValid) return;
    createBugReport.mutate({
      entityType,
      entityId,
      title: title.trim(),
      description,
      category: category as any,
      severity: severity as any,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      stepsToReproduce: stepsToReproduce || undefined,
      expectedBehavior: expectedBehavior || undefined,
      actualBehavior: actualBehavior || undefined,
      reproducibility: (reproducibility || undefined) as any,
      pageUrl,
      userAgent,
      locale,
    });
  };

  const selectedSeverity = SEVERITIES.find((s) => s.value === severity);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-100">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="h-7 w-7 rounded-md bg-red-50 border border-red-100 flex items-center justify-center">
              <Bug className="h-4 w-4 text-red-500" />
            </div>
            Report a Bug
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Info banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 flex gap-3">
            <Info className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-900">Filing Bug Reports</p>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                Reports help us improve the platform. You will not receive a direct reply — for urgent help,
                use the Support AI below.
              </p>
            </div>
          </div>

          {/* Your Details */}
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 space-y-1">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Your Details</p>
            <div className="grid grid-cols-[80px_1fr] gap-y-1 text-xs">
              <span className="text-zinc-400">Email</span>
              <span className="text-zinc-700">{session?.user?.email ?? "—"}</span>
              {entityType && (
                <>
                  <span className="text-zinc-400">Context</span>
                  <span className="text-zinc-700 capitalize">
                    {entityType}{entityId ? ` · ${entityId.slice(0, 10)}…` : ""}
                  </span>
                </>
              )}
              <span className="text-zinc-400">Page</span>
              <span className="text-zinc-700 truncate">{pageUrl ?? "—"}</span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-zinc-900">Title <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Brief, descriptive title for the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Category + Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-900">Category <span className="text-red-500">*</span></Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-900">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-sm">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold border mr-1.5 ${s.badge}`}>
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSeverity && (
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold border ${selectedSeverity.badge}`}>
                  {selectedSeverity.label}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-zinc-900">Description <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe the issue — what you were doing, what happened, and what you expected…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[96px] resize-none text-sm"
            />
            <p className="text-[11px] text-zinc-400">Minimum 10 characters</p>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-zinc-900">Tags <span className="text-zinc-400 font-normal">(comma separated)</span></Label>
            <Input
              placeholder="e.g. login, mobile, drag-drop"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            {showAdvanced ? "Hide" : "Show"} advanced fields
          </button>

          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
              {/* Reproducibility */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Reproducibility</Label>
                <Select value={reproducibility} onValueChange={setReproducibility}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="How often does this happen?" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPRODUCIBILITY.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-sm">{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Steps to Reproduce */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Steps to Reproduce</Label>
                <Textarea
                  placeholder={"1. Go to…\n2. Click on…\n3. See error"}
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>

              {/* Expected + Actual */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700">Expected Behavior</Label>
                  <Textarea
                    placeholder="What should have happened…"
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    className="min-h-[72px] resize-none text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-700">Actual Behavior</Label>
                  <Textarea
                    placeholder="What actually happened…"
                    value={actualBehavior}
                    onChange={(e) => setActualBehavior(e.target.value)}
                    className="min-h-[72px] resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Support AI CTA */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <MessageCircle className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900">Need help right now?</p>
                <p className="text-xs text-zinc-500">Try resolving this with our Support AI.</p>
              </div>
            </div>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-7 text-xs px-3" onClick={() => {
              if (onOpenSupport) {
                onClose();
                onOpenSupport();
              }
            }}>
              <MessageCircle className="h-3 w-3" />
              Try Support AI
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-zinc-100 bg-zinc-50/50">
          <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || createBugReport.isPending}
          >
            {createBugReport.isPending ? "Submitting…" : "Submit Bug Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
