"use client";

import type { LucideIcon } from "lucide-react";
import { DynamicLucideIcon } from "@/lib/lucideIcon";
import { cn } from "@/lib/utils";

const LUCIDE_ICON_NAME = /^[A-Z][a-z][a-zA-Z0-9]*$/;

interface EntityIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fallback: LucideIcon;
  /** When true, uploaded images fill the full width/height of their container */
  fill?: boolean;
}

/** Renders workspace/space/project/team icons without importing the full lucide bundle. */
export function EntityIcon({ icon, className, size = 16, fallback: Fallback, fill }: EntityIconProps) {
  if (!icon) return <Fallback size={size} className={className} />;

  if (LUCIDE_ICON_NAME.test(icon)) {
    return <DynamicLucideIcon name={icon} size={size} className={className} />;
  }

  if (icon.startsWith("http") || icon.startsWith("/") || icon.startsWith("data:")) {
    return fill ? (
      <img
        src={icon}
        alt="Icon"
        className={cn("object-cover w-full h-full", className)}
      />
    ) : (
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
