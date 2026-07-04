"use client";

import { Briefcase } from "lucide-react";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

interface ProjectIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
}

export function ProjectIcon({ icon, className, size = 16 }: ProjectIconProps) {
  return <EntityIcon icon={icon} className={className} size={size} fallback={Briefcase} />;
}
