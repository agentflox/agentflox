"use client";

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  description?: string;
  className?: string;
  sticky?: boolean;
  breadcrumbs?: Array<{ label: string; href: string }>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  description,
  className,
  sticky,
  breadcrumbs,
}: PageHeaderProps) {
  const actionContent = actions || children;

  return (
    <div className={cn("border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950", sticky && "sticky top-0 z-10", className)}>
      <div className="pb-6">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-2 flex items-center space-x-1.5 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.href || idx} className="flex items-center space-x-1.5">
                {idx > 0 && <span className="opacity-40">/</span>}
                <a href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </a>
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-start justify-between gap-4">
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
          {actionContent && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actionContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PageHeader;