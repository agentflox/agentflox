"use client";

import { FolderKanban } from "lucide-react";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

interface SpaceIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fill?: boolean;
}

export function SpaceIcon({ icon, className, size = 16, fill }: SpaceIconProps) {
  return <EntityIcon icon={icon} className={className} size={size} fallback={FolderKanban} fill={fill} />;
}
