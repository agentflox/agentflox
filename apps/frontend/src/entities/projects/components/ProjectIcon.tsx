"use client";

import { Briefcase } from "lucide-react";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

interface ProjectIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fill?: boolean;
}

export function ProjectIcon({ icon, className, size = 16, fill }: ProjectIconProps) {
  return <EntityIcon icon={icon} className={className} size={size} fallback={Briefcase} fill={fill} />;
}

