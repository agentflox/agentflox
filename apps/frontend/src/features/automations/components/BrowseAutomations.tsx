"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Flame, MessageCircle, Plus, Zap, Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AutomationScope } from "../types";
import {
  ALL_BROWSE_SECTIONS,
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
      className="group text-left rounded-xl border border-zinc-200/90 bg-white p-4.5 hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5 text-zinc-600">
            <span className="h-7 w-7 rounded-md border border-zinc-200/80 bg-zinc-50/80 inline-flex items-center justify-center group-hover:bg-zinc-100 transition-colors">
              <TriggerIcon className="h-3.5 w-3.5" />
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
            <span className="h-7 w-7 rounded-md border border-zinc-200/80 bg-zinc-50/80 inline-flex items-center justify-center group-hover:bg-zinc-100 transition-colors">
              <ActionIcon className="h-3.5 w-3.5" />
            </span>
          </div>

          {template.badge === "popular" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 px-2.5 py-0.5 text-[11px] font-semibold">
              <Flame className="h-3 w-3 text-amber-500 fill-amber-500" /> Popular
            </span>
          )}
          {template.badge === "agent" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60 px-2.5 py-0.5 text-[11px] font-semibold">
              <Bot className="h-3.5 w-3.5 text-violet-600" /> Super Agent
            </span>
          )}
          {template.badge === "new" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold">
              New
            </span>
          )}
        </div>

        <p className="mt-3.5 font-semibold text-sm text-zinc-900 group-hover:text-zinc-800 leading-snug">
          {template.title}
        </p>
        <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed line-clamp-2">
          {template.description}
        </p>
      </div>
    </button>
  );
}

export function BrowseAutomations({
  scope,
  onCreate,
  onApplied,
}: {
  scope: AutomationScope;
  onCreate: (mode: "classic" | "agent", initialTemplate?: BrowseTemplate) => void;
  onApplied: (id: string, mode: "classic" | "agent") => void;
}) {
  const [activeSection, setActiveSection] = useState<BrowseSectionId>("popular");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  // Group templates by section for continuous rendering
  const sectionsWithTemplates = useMemo(() => {
    return ALL_BROWSE_SECTIONS.map((secId) => {
      const items = BROWSE_TEMPLATES.filter((t) => t.sections.includes(secId));
      return {
        id: secId,
        title: SECTION_TITLES[secId] || secId,
        items,
      };
    }).filter((s) => s.items.length > 0);
  }, []);

  const scrollToSection = (sectionId: BrowseSectionId) => {
    setActiveSection(sectionId);
    isProgrammaticScroll.current = true;
    const target = document.getElementById(`browse-section-${sectionId}`);
    if (target && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const offset = targetTop - containerTop + container.scrollTop;

      container.scrollTo({
        top: offset - 10,
        behavior: "smooth",
      });

      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
    }
  };

  // Scroll spy to update active category on user scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScroll.current) return;

      const containerTop = container.getBoundingClientRect().top;
      for (const section of sectionsWithTemplates) {
        const el = document.getElementById(`browse-section-${section.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - containerTop <= 80 && rect.bottom - containerTop > 40) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [sectionsWithTemplates]);

  const handleSelect = (template: BrowseTemplate) => {
    if (template.comingSoon) {
      toast.info(`${template.title} is coming soon`);
      return;
    }
    // Pre-load the trigger event + actions in the automation builder!
    onCreate(template.mode, template);
  };

  return (
    <div className="flex h-full min-h-0 bg-white">
      {/* Left Navigation Bar */}
      <aside className="w-56 shrink-0 border-r bg-zinc-50/70 overflow-y-auto p-3 flex flex-col scrollbar-thin">
        <Button
          className="w-full bg-zinc-900 hover:bg-zinc-700 text-white h-9 cursor-pointer mb-4 shadow-sm"
          onClick={() => onCreate("agent")}
        >
          Add Automation <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        </Button>

        {BROWSE_NAV.map((group) => (
          <div key={group.heading} className="mb-4">
            <p className="px-2 mb-1.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors text-left",
                      isActive
                        ? "bg-zinc-200/90 text-zinc-900 font-semibold shadow-2xs"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-zinc-900" : "text-zinc-500")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mb-4">
          <p className="px-2 mb-1.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Integrations</p>
          <div className="space-y-0.5">
            {BROWSE_INTEGRATIONS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors text-left",
                    isActive
                      ? "bg-zinc-200/90 text-zinc-900 font-semibold shadow-2xs"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {"isNew" in item && Boolean(item.isNew) && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-violet-100 text-violet-700 border-0 font-medium">
                      New
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="mt-auto flex items-center gap-2 px-2 py-2 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
          onClick={() => toast.info("Thanks — feedback is coming soon")}
        >
          <MessageCircle className="h-3.5 w-3.5" /> Feedback
        </button>
      </aside>

      {/* Main Continuous Scroll View */}
      <div ref={scrollContainerRef} className="flex-1 min-w-0 overflow-y-auto p-6 space-y-8 scroll-smooth">
        {sectionsWithTemplates.map((sec) => (
          <section key={sec.id} id={`browse-section-${sec.id}`} className="scroll-mt-4">
            <h3 className="text-base font-bold text-zinc-900 mb-3.5 flex items-center gap-2">
              {sec.title}
              <span className="text-xs font-normal text-zinc-400">({sec.items.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {sec.items.map((template) => (
                <TemplateCard key={`${sec.id}-${template.id}`} template={template} onSelect={handleSelect} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
