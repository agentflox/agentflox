"use client";

import { ReactNode } from 'react';
import BackButton from '@/components/navigation/BackButton';

interface TopBarProps {
  onBeforeNavigate?: () => Promise<boolean>;
  fallbackPath?: string;
  backButtonLabel?: string;
  rightContent?: ReactNode;
}

export default function TopBar({
  onBeforeNavigate,
  fallbackPath = "/dashboard",
  backButtonLabel = "Back",
  rightContent
}: TopBarProps) {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between h-16 px-6">
        <BackButton 
          onBeforeNavigate={onBeforeNavigate}
          fallbackPath={fallbackPath}
        >
          {backButtonLabel}
        </BackButton>
        
        {rightContent && (
          <div className="flex items-center gap-4">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}
