"use client";

import { List as LucideList } from "lucide-react";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

interface ListEntityIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fill?: boolean;
}

export function ListEntityIcon({ icon, className, size = 16, fill }: ListEntityIconProps) {
  return <EntityIcon icon={icon} className={className} size={size} fallback={LucideList} fill={fill} />;
}
