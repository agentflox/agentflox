"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Flame, MessageCircle, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../types";
import {
  BROWSE_INTEGRATIONS,
  BROWSE_NAV,
  BROWSE_TEMPLATES,
  SECTION_TITLES,
  type BrowseSectionId,
  type BrowseTemplate,
} from "../browseCatalog";

function AgentIcon({ className }: { className?: string }) {
  return (
    <img
      src="/images/ai-agent-removebg-preview.png"
      alt=""
      aria-hidden
      className={cn("h-4 w-4 shrink-0", className)}
    />
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: BrowseTemplate;
  onSelect: (template: BrowseTemplate) => void;
}) {
  const TriggerIcon = template.triggerIcon;
  const ActionIcon = template.actionIcon;
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span className="h-7 w-7 rounded-md border bg-zinc-50 inline-flex items-center justify-center">
            <TriggerIcon className="h-3.5 w-3.5" />
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="h-7 w-7 rounded-md border bg-zinc-50 inline-flex items-center justify-center">
            <ActionIcon className="h-3.5 w-3.5" />
          </span>
        </div>
        {template.badge === "popular" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-[10px] font-medium">
            <Flame className="h-3 w-3" /> Popular
          </span>
        )}
        {template.badge === "agent" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-[10px] font-medium">
            <AgentIcon /> AI Agent
          </span>
        )}
      </div>
      <p className="mt-3 font-semibold text-sm text-zinc-900">{template.title}</p>
      <p className="mt-1 text-xs text-zinc-500 leading-relaxed line-clamp-2">{template.description}</p>
    </button>
  );
}

export function BrowseAutomations({
  scope,
  onCreate,
  onApplied,
}: {
  scope: AutomationScope;
  onCreate: (mode: "classic" | "agent") => void;
  onApplied: (id: string, mode: "classic" | "agent") => void;
}) {
  const [section, setSection] = useState<BrowseSectionId>("popular");
  const apply = trpc.automation.applyTemplate.useMutation();

  const grouped = useMemo(() => {
    const matched = BROWSE_TEMPLATES.filter((t) => t.sections.includes(section));
    if (section === "popular") {
      const others = BROWSE_TEMPLATES.filter((t) => t.sections.includes("development") && !t.sections.includes("popular"));
      return [
        { id: "popular" as BrowseSectionId, items: matched },
        { id: "development" as BrowseSectionId, items: others },
      ].filter((g) => g.items.length > 0);
    }
    return [{ id: section, items: matched }];
  }, [section]);

  const handleSelect = async (template: BrowseTemplate) => {
    if (template.comingSoon) {
      toast.info(`${template.title} is coming soon`);
      return;
    }
    if (template.applyTemplateId && scope.workspaceId) {
      try {
        const created = await apply.mutateAsync({
          templateId: template.applyTemplateId,
          workspaceId: scope.workspaceId,
          spaceId: scope.spaceId,
          teamId: scope.teamId,
          projectId: scope.projectId,
        });
        toast.success("Automation created");
        onApplied(created.id, template.mode);
        return;
      } catch (e: any) {
        toast.error(e.message || "Could not apply template");
        return;
      }
    }
    onCreate(template.mode);
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className="w-56 shrink-0 border-r bg-zinc-50/70 overflow-y-auto p-3 flex flex-col">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full bg-zinc-900 hover:bg-zinc-700 text-white h-9 cursor-pointer mb-4">
              Add Automation <ChevronDown className="h-3.5 w-3.5 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onCreate("classic")}>
              <Zap className="h-4 w-4 text-sky-600" />
              Classic
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer justify-between" onClick={() => onCreate("agent")}>
              <span className="flex items-center gap-2">
                <AgentIcon /> Agent
              </span>
              <Badge variant="secondary" className="text-[10px] px-1 py-1 h-4 bg-violet-100 text-violet-700 border-0">
                New
              </Badge>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {BROWSE_NAV.map((group) => (
          <div key={group.heading} className="mb-4">
            <p className="px-2 mb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{group.heading}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer",
                      section === item.id ? "bg-zinc-200/80 text-zinc-900 font-medium" : "text-zinc-600 hover:bg-zinc-100",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mb-4">
          <p className="px-2 mb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">Integrations</p>
          <div className="space-y-0.5">
            {BROWSE_INTEGRATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toast.info(`${item.label} automations are coming soon`)}
                className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <span>{item.label}</span>
                {item.isNew && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-violet-100 text-violet-700 border-0">
                    New
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="mt-auto flex items-center gap-2 px-2 py-2 text-sm text-zinc-500 hover:text-zinc-800 cursor-pointer"
          onClick={() => toast.info("Thanks — feedback is coming soon")}
        >
          <MessageCircle className="h-3.5 w-3.5" /> Feedback
        </button>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-6">
        {grouped.map((group) => (
          <section key={group.id}>
            <h3 className="text-base font-semibold text-zinc-900 mb-3">{SECTION_TITLES[group.id]}</h3>
            <div className="grid grid-cols-2 gap-3">
              {group.items.map((template) => (
                <TemplateCard key={template.id} template={template} onSelect={handleSelect} />
              ))}
            </div>
            {group.items.length === 0 && (
              <p className="text-sm text-zinc-500 py-8 text-center">No templates in this category yet</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
