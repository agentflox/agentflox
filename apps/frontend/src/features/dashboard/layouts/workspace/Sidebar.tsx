"use client";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LayoutDashboard, MessageSquare, Bot, FileText, Activity, Users, Briefcase } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";

const workspaceMenuItems = [
  { label: "Overview", value: "overview", icon: LayoutDashboard },
  { label: "Discussions", value: "discussions", icon: MessageSquare },
  { label: "AI Chat", value: "chat", icon: Bot },
  { label: "Logs", value: "logs", icon: FileText },
  { label: "Activities", value: "activities", icon: Activity },
  { label: "Members", value: "members", icon: Users },
  { label: "Marketplace", value: "marketplace", icon: Briefcase },
] as const;

export default function Sidebar({ mode = "inline", onClose }: { mode?: "inline" | "overlay"; onClose?: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "overview";

  const handleItemClick = (item: { value?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (item.value) {
      params.set("tab", item.value);
      router.push(`?${params.toString()}`);
    }
  };

  return (
    <AppSidebar
      items={[...workspaceMenuItems]}
      title="Workspace Menu"
      mode={mode}
      onClose={onClose}
      cssVarName="--main-sidebar-width"
      activeItem={activeTab}
      onItemClick={handleItemClick}
    />
  );
}
