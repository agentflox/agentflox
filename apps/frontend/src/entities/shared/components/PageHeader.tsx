"use client";

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  description?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  description
}: PageHeaderProps) {
  return (
    <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          {/* Left: Title & Subtitle */}
          <div className="flex-1 min-w-0 space-y-1">
            {subtitle && (
              <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                {subtitle}
              </p>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-base text-muted-foreground mt-2 max-w-3xl">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PageHeader;
