"use client";

import { Briefcase } from "lucide-react";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

interface WorkspaceIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fill?: boolean;
}

export function WorkspaceIcon({ icon, className, size = 16, fill }: WorkspaceIconProps) {
  return <EntityIcon icon={icon} className={className} size={size} fallback={Briefcase} fill={fill} />;
}
