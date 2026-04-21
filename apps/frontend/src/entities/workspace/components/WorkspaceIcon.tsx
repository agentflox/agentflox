"use client";

import { Briefcase } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
}

// Mirrors the behavior of SpaceIcon/ProjectIcon:
// - lucide icon name -> render lucide component
// - URL/data URI -> render <img>
// - emoji/text -> render as inline text
export function WorkspaceIcon({ icon, className, size = 16 }: WorkspaceIconProps) {
  if (!icon) return <Briefcase size={size} className={className} />;

  const IconComp = (LucideIcons as any)[icon];

  if (IconComp && typeof IconComp !== "string") {
    return <IconComp size={size} className={className} />;
  }

  if (icon && (icon.startsWith("http") || icon.startsWith("/") || icon.startsWith("data:"))) {
    return (
      <img
        src={icon}
        alt="Icon"
        className={cn("object-cover rounded-md", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span className={cn("inline-block", className)} style={{ fontSize: size, lineHeight: 1 }}>
      {icon}
    </span>
  );
}

