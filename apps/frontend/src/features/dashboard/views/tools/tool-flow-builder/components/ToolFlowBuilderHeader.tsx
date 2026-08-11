"use client";

import React from "react";
import {
  Bot, Check, Copy, Download, Globe, Hammer, HelpCircle, History, CopyPlus, Home,
  Link2, Lock, MessageCircle, MoreHorizontal, Play, Share2, Trash2, X, Zap, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ToolFlowBuilderApi } from "../hooks/useToolFlowBuilder";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

export function ToolFlowBuilderHeader({ api }: { api: ToolFlowBuilderApi }) {
  const router = useRouter();
  const {
    name, setName, toolIcon, setToolIcon, activeTopTab, setActiveTopTab, handleShare, linkCopied,
    setAssistantOpen, isRunningTool, runCompositeTool, cancelCompositeTool, upsert, createMutation, updateMutation,
    handlePublishClick, initialTool, isEditing, setSettingsOpen, setAgentPromptOpen,
    setCloneName, setCloneOpen, handleCopyLink, handleExport, setVersionsOpen,
    setBugReportOpen, setSupportModalOpen, setDeleteOpen, onClose,
    hasChanges, setHasChanges, autosaveEnabled, setAutosaveEnabled,
    isEditingName, setIsEditingName, nameInputRef, toolColor, setToolColor
  } = api;

  return (
    <div className="border-b border-zinc-200 px-4 py-2.5 flex items-center justify-between bg-white">
      {/* Left: lock + link + icon + name + status */}
      <div className="flex items-center gap-3 min-w-0">
        <button
            onClick={() => router.push("/dashboard/tools")}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer"
        >
            <Home className="h-4 w-4 text-zinc-600" />
        </button>

        <div className="flex items-center gap-1 min-w-0">
          <IconColorSelector
            icon={toolIcon}
            color={toolColor}
            onIconChange={(newIcon) => {
              setToolIcon(newIcon);
              if (initialTool?.id) updateMutation.mutate({ id: initialTool.id, icon: newIcon });
            }}
            onColorChange={(newColor) => {
              setToolColor(newColor);
              if (initialTool?.id) updateMutation.mutate({ id: initialTool.id, color: newColor });
            }}
          >
            <div 
              className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md text-base font-semibold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: toolIcon ? toolColor : '#f4f4f5', color: toolIcon ? '#ffffff' : '#27272a' }}
            >
              {toolIcon ? <EntityIcon icon={toolIcon} size={16} fallback={Hammer} /> : "T"}
            </div>
          </IconColorSelector>

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
                className="h-8 text-sm font-semibold text-zinc-900 bg-zinc-100 border-none rounded px-1.5 outline-none focus:ring-1 ring-indigo-500/50 w-auto min-w-[120px] py-1"
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                className="text-sm font-semibold text-zinc-900 cursor-pointer hover:bg-zinc-100 px-1.5 rounded-sm transition-colors py-1.5"
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
      <div className="flex items-center justify-center flex-1">
        <Tabs value={activeTopTab} onValueChange={(v) => setActiveTopTab(v as any)} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="build" className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Hammer className="w-3 h-3" />Build
            </TabsTrigger>
            <TabsTrigger value="run" className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Play className="w-3 h-3" />Run
            </TabsTrigger>
          </TabsList>
        </Tabs>
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

        {isRunningTool ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 px-3 text-xs font-semibold gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
            onClick={() => cancelCompositeTool()}
          >
            <X className="h-3.5 w-3.5" />
            Cancel run
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-8 px-3 text-xs hover:border-zinc-300 hover:bg-zinc-100"
            disabled={!isEditing}
            onClick={() => {
              setActiveTopTab("run");
              runCompositeTool();
            }}
          >
            <Play className="h-3 w-3 mr-1.5" />
            Run tool
          </Button>
        )}

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
            <div className="my-1 border-t border-zinc-100" />
            <DropdownMenuItem
              className="gap-4"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-4 text-sm text-zinc-900">
                <Zap className="h-4 w-4 text-zinc-500" />
                Autosave
              </div>
              <Switch
                checked={autosaveEnabled}
                onCheckedChange={setAutosaveEnabled}
                className="scale-75"
              />
            </div>
            <DropdownMenuItem className="gap-4" onClick={() => setAgentPromptOpen(true)} disabled={!isEditing}>
              <Bot className="h-4 w-4" />Edit agent prompt
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-4" onClick={() => { setCloneName(`${name} (copy)`); setCloneOpen(true); }} disabled={!isEditing}>
              <CopyPlus className="h-4 w-4" />Clone
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-4" onClick={handleCopyLink} disabled={!isEditing}>
              <Copy className="h-4 w-4" />Copy link
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-4" onClick={handleExport} disabled={!isEditing}>
              <Download className="h-4 w-4" />Export
            </DropdownMenuItem>
            <div className="my-1 border-t border-zinc-100" />
            <DropdownMenuItem className="gap-4" onClick={() => setVersionsOpen(true)} disabled={!isEditing}>
              <History className="h-4 w-4" />Version history
            </DropdownMenuItem>
            <div className="my-1 border-t border-zinc-100" />
            <DropdownMenuItem className="gap-4" onClick={() => setBugReportOpen(true)}>
              <HelpCircle className="h-4 w-4" />Report bug
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-4" onClick={() => setSupportModalOpen(true)}>
              <HelpCircle className="h-4 w-4" />Help
            </DropdownMenuItem>
            <div className="my-1 border-t border-zinc-100" />
            <DropdownMenuItem
              className="gap-4 text-red-600 focus:text-red-700"
              onClick={() => setDeleteOpen(true)}
              disabled={!isEditing}
            >
              <Trash2 className="h-4 w-4" />Delete tool
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
