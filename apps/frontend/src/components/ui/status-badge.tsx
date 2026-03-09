"use client";

import { cn } from '@/lib/utils';
import { Globe, Lock, FileEdit } from 'lucide-react';

interface StatusBadgeProps {
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  className?: string;
  showIcon?: boolean;
}

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    icon: FileEdit,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  },
  PUBLISHED: {
    label: 'Published',
    icon: Globe,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
  },
  ARCHIVED: {
    label: 'Archived',
    icon: Lock,
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800',
  },
};

export default function StatusBadge({ 
  status, 
  className,
  showIcon = true 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide',
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </div>
  );
}
