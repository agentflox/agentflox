"use client";

import React from "react";
import {
  Bot, Check, Copy, Download, Globe, Hammer, HelpCircle, History,
  Link2, Lock, MessageCircle, MoreHorizontal, Play, Share2, Trash2, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ToolFlowBuilderApi } from "../hooks/useToolFlowBuilder";

export function ToolFlowBuilderHeader({ api }: { api: ToolFlowBuilderApi }) {
  const {
    name, setName, toolIcon, activeTopTab, setActiveTopTab, handleShare, linkCopied,
    setAssistantOpen, isRunningTool, runCompositeTool, upsert, createMutation, updateMutation,
    handlePublishClick, initialTool, isEditing, setSettingsOpen, setAgentPromptOpen,
    setCloneName, setCloneOpen, handleCopyLink, handleExport, setVersionsOpen,
    setBugReportOpen, setSupportModalOpen, setDeleteOpen, onClose,
    hasChanges, setHasChanges, autosaveEnabled, setAutosaveEnabled,
    isEditingName, setIsEditingName, nameInputRef,
  } = api;

  return (
    <div className="border-b border-zinc-200 px-4 py-2.5 flex items-center justify-between bg-white">
      {/* Left: lock + link + icon + name + status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1 text-zinc-500">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white">
            <Lock className="h-3.5 w-3.5" />
          </span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white">
            <Link2 className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="flex items-center gap-1 min-w-0">
          <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-md bg-zinc-100 text-base font-semibold text-zinc-800">
            {toolIcon || "T"}
          </div>

          {/* Inline editable name */}
          <div className="flex items-center gap-3 group">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasChanges(true);
                }}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingName(false);
                }}
                autoFocus
                className="text-sm font-semibold text-zinc-900 bg-zinc-100 border-none rounded px-1.5 outline-none focus:ring-1 ring-indigo-500/50 w-auto min-w-[120px] py-1"
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                className="text-sm font-semibold text-zinc-900 cursor-pointer hover:bg-zinc-100 px-1.5 rounded-sm transition-colors py-1"
              >
                {name || "New Workflow Tool"}
              </h1>
            )}
          </div>

          {/* Status pill */}
          {!autosaveEnabled && hasChanges ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-orange-100 bg-orange-50/50 text-sm font-medium text-orange-600">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Unsaved
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-100 bg-emerald-50/50 text-sm font-medium text-emerald-600">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {autosaveEnabled ? "Autosaved" : "Live"}
            </div>
          )}
        </div>
      </div>

      {/* Center: Build / Run toggle */}
      <div className="flex-1 flex justify-center">
        <div className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 p-0.5 border border-zinc-200">
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer",
              activeTopTab === "build"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
            onClick={() => setActiveTopTab("build")}
          >
            <Hammer className="h-3.5 w-3.5" />
            <span>Build</span>
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer",
              activeTopTab === "run"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
            onClick={() => setActiveTopTab("run")}
          >
            <Play className="h-3.5 w-3.5" />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Right: Share / Run tool / Save changes / Publish / more */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-900"
          onClick={handleShare}
          disabled={!isEditing}
        >
          {linkCopied
            ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
            : <Share2 className="h-3.5 w-3.5 mr-1" />}
          {linkCopied ? "Copied!" : "Share"}
        </Button>

        <Button
          variant="ghost"
          className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-900"
          onClick={() => setAssistantOpen(true)}
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1" />
          Assistant
        </Button>

        <Button
          variant="outline"
          className="h-8 px-3 text-xs"
          disabled={isRunningTool}
          onClick={() => runCompositeTool()}
        >
          <Play className="h-3 w-3 mr-1.5" />
          {isRunningTool ? "Running…" : "Run tool"}
        </Button>

        {!autosaveEnabled && (
          <Button
            onClick={() => upsert().then(() => setHasChanges(false))}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : "Save changes"}
          </Button>
        )}

        <Button
          type="button"
          className="h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white gap-2"
          onClick={handlePublishClick}
          disabled={!initialTool?.id}
        >
          <Globe className="h-3.5 w-3.5" />
          Publish
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-zinc-200 text-zinc-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Autosave toggle */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-2 text-xs text-zinc-700">
                <Zap className="h-3.5 w-3.5 text-zinc-400" />
                Autosave
              </div>
              <Switch
                checked={autosaveEnabled}
                onCheckedChange={setAutosaveEnabled}
                className="scale-75"
              />
            </div>
            <div className="my-1 border-t border-zinc-100" />
            <DropdownMenuItem
              className="text-xs"
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={() => setAgentPromptOpen(true)} disabled={!isEditing}>
              <Bot className="h-3.5 w-3.5" />Edit agent prompt
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={() => { setCloneName(`${name} (copy)`); setCloneOpen(true); }} disabled={!isEditing}>
              <Copy className="h-3.5 w-3.5" />Clone
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={handleCopyLink} disabled={!isEditing}>
              <Copy className="h-3.5 w-3.5" />Copy link
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={handleExport} disabled={!isEditing}>
              <Download className="h-3.5 w-3.5" />Export
            </DropdownMenuItem>
            <div className="my-1 border-t border-zinc-100" />
            <DropdownMenuItem className="text-xs gap-2" onClick={() => setVersionsOpen(true)} disabled={!isEditing}>
              <History className="h-3.5 w-3.5" />Version history
            </DropdownMenuItem>
            <div className="my-1 border-t border-zinc-100" />
            <DropdownMenuItem className="text-xs gap-2" onClick={() => setBugReportOpen(true)}>
              <HelpCircle className="h-3.5 w-3.5" />Report bug
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={() => setSupportModalOpen(true)}>
              <HelpCircle className="h-3.5 w-3.5" />Help
            </DropdownMenuItem>
            <div className="my-1 border-t border-zinc-100" />
            <DropdownMenuItem
              className="text-xs gap-2 text-red-600 focus:text-red-700"
              onClick={() => setDeleteOpen(true)}
              disabled={!isEditing}
            >
              <Trash2 className="h-3.5 w-3.5" />Delete tool
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 ml-1 cursor-pointer"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>
    </div>
  );
}
