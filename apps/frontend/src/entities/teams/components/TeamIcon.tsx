"use client";

import { Users } from "lucide-react";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

interface TeamIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fill?: boolean;
}

export function TeamIcon({ icon, className, size = 16, fill }: TeamIconProps) {
  return <EntityIcon icon={icon} className={className} size={size} fallback={Users} fill={fill} />;
}
