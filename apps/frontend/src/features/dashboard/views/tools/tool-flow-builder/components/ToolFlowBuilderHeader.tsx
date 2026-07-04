"use client";

import React from "react";
import {
  Bot, Check, Copy, Download, Globe, Hammer, HelpCircle, History,
  Link2, Lock, MessageCircle, MoreHorizontal, Play, Share2, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 flex items-center justify-center rounded-md bg-zinc-100 text-[13px] font-semibold text-zinc-800">
                {toolIcon || "T"}
              </div>
              <Input
                variant="ghost"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New Workflow Tool"
                className="h-7 text-sm font-semibold border-none px-0 shadow-none focus-visible:ring-0 max-w-xs w-full"
              />
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                Unsaved
              </span>
            </div>
          </div>

          {/* Center: Build / Run toggle */}
          <div className="flex-1 flex justify-center">
            <div className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 p-0.5 border border-zinc-200">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full",
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
                  "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full",
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
              {isRunningTool ? "Running窶ｦ" : "Run tool"}
            </Button>

            <Button
              onClick={upsert}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : "Save changes"}
            </Button>

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
              <DropdownMenuContent align="end" className="w-48">
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
