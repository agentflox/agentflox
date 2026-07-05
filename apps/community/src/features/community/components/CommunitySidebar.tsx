"use client";

import { useState, ComponentType } from "react";
import {
  ChevronDown,
  Lightbulb,
  Megaphone,
  MessageCircleQuestion,
  Plus,
  Sparkles,
  Users,
  Home,
  ArrowUpRight,
  ScrollText,
  BookOpen,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useAppDispatch } from "@/hooks/useReduxStore";
import { setSupportAssistantOpen } from "@/stores/slices/messages.slice";

type CommunitySection = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
};

export const WELCOME_ITEMS: CommunitySection[] = [
  {
    key: "start-here",
    label: "Start Here",
    icon: Sparkles,
    title: "Welcome to the Agentflox Community",
    subtitle: "Meet other builders, discover spaces, and start your first thread.",
  },
  {
    key: "introductions",
    label: "Introductions",
    icon: Users,
    title: "Introduce yourself to the community",
    subtitle: "Tell people who you are and what you are building.",
  },
];

export const SUPPORT_ITEMS: CommunitySection[] = [
  {
    key: "announcements",
    label: "Announcements",
    icon: Megaphone,
    title: "Announcements",
    subtitle: "Important product and community updates.",
  },
  {
    key: "questions",
    label: "Questions",
    icon: MessageCircleQuestion,
    title: "How to get help from the community",
    subtitle: "Ask clear, specific questions so others can help faster.",
  },
  {
    key: "feature-requests",
    label: "Feature Requests",
    icon: Lightbulb,
    title: "Raise feature requests",
    subtitle: "Share improvements you want and vote on ideas.",
  },
];

export function CommunitySidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const activeSection = searchParams.get("space") || searchParams.get("section") || "start-here";

  const [welcomeExpanded, setWelcomeExpanded] = useState(true);
  const [supportExpanded, setSupportExpanded] = useState(true);
  const [discussionExpanded, setDiscussionExpanded] = useState(true);

  const { data: allGroups } = trpc.communityGroup.list.useQuery({});
  const myGroups = allGroups?.filter((g) => g.isMember) || [];

  const handleSectionClick = (key: string) => {
    router.push(`/community?space=${key}`);
  };

  return (
    <Card className="h-fit p-3 md:sticky md:top-4 border-slate-200/60 shadow-sm">
      <div className="space-y-6">
        {/* Navigation Top */}
        <div className="px-1">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Return to Home</span>
          </button>
        </div>

        {/* Welcome Section */}
        <div>
          <button
            type="button"
            onClick={() => setWelcomeExpanded((prev) => !prev)}
            className="group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Welcome</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-all ${welcomeExpanded ? "rotate-0" : "-rotate-90"
                }`}
            />
          </button>
          {welcomeExpanded && (
            <div className="mt-1 space-y-0.5">
              {WELCOME_ITEMS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.key;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => handleSectionClick(section.key)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
                      }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Support & Resources Section */}
        <div>
          <button
            type="button"
            onClick={() => setSupportExpanded((prev) => !prev)}
            className="group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Support & Resources</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-all ${supportExpanded ? "rotate-0" : "-rotate-90"
                }`}
            />
          </button>
          {supportExpanded && (
            <div className="mt-1 space-y-0.5">
              {SUPPORT_ITEMS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.key;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => handleSectionClick(section.key)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
                      }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Discussion Groups Section */}
        <div>
          <button
            type="button"
            onClick={() => setDiscussionExpanded((prev) => !prev)}
            className="group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Discussion Groups</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-all ${discussionExpanded ? "rotate-0" : "-rotate-90"
                }`}
            />
          </button>
          {discussionExpanded && (
            <div className="mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => handleSectionClick("discussion-groups")}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${activeSection === "discussion-groups"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-100"
                  }`}
              >
                <Plus className="h-4 w-4" />
                <span>Join a group</span>
              </button>

              {myGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => router.push(`/community/group/${group.id}`)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate">{group.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleSectionClick("community-guidelines")}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${activeSection === "community-guidelines"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-700 hover:bg-slate-100"
              }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Community Guidelines</span>
          </button>
        </div>

        {/* External Links Section */}
        <div className="pt-2 border-t border-slate-100">
          <div className="px-2 py-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Links</span>
          </div>
          <div className="space-y-0.5">
            <a
              href="https://docs.agentflox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
              <span>Documentation</span>
            </a>
            <button
              onClick={() => dispatch(setSupportAssistantOpen(true))}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
              <span>Reach out to Support</span>
            </button>
            <button
              onClick={() => window.open("/dashboard", "_blank")}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
              <span>Launch Agentflox</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
