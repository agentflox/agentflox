"use client";

import { Folder } from "lucide-react";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

interface FolderIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fill?: boolean;
}

export function FolderIcon({ icon, className, size = 16, fill }: FolderIconProps) {
  return <EntityIcon icon={icon} className={className} size={size} fallback={Folder} fill={fill} />;
}
