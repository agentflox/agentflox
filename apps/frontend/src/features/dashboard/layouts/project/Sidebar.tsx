"use client";
import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { projectMenuItems } from '../../constants';
import { AppSidebar } from '@/components/layout/AppSidebar';

export default function Sidebar({ mode = "inline", onClose }: { mode?: "inline" | "overlay"; onClose?: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'overview';

  const handleItemClick = (item: any) => {
    const params = new URLSearchParams(searchParams.toString());
    if (item.value) {
      params.set('tab', item.value);
      router.push(`?${params.toString()}`);
    }
  };

  return (
    <AppSidebar
      items={projectMenuItems}
      title="Project Menu"
      mode={mode}
      onClose={onClose}
      cssVarName="--project-sidebar-width"
      activeItem={activeTab}
      onItemClick={handleItemClick}
    />
  );
}
