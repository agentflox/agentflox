"use client";

import { Users } from "lucide-react";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

interface TeamIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
}

export function TeamIcon({ icon, className, size = 16 }: TeamIconProps) {
  return <EntityIcon icon={icon} className={className} size={size} fallback={Users} />;
}
