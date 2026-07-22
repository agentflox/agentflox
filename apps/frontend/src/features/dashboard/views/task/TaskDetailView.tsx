'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TaskDetailContent, type TaskLayoutMode } from '@/entities/task/components/TaskDetailModal';
import { SquareArrowRightExit } from 'lucide-react';

interface TaskDetailViewProps {
    taskId: string;
    onClose: () => void;
    layoutMode?: TaskLayoutMode;
    onLayoutModeChange?: (mode: TaskLayoutMode) => void;
    className?: string;
}

/**
 * TaskDetailView
 *
 * Renders the full task detail UI as a plain view.
 * Dropped in layout directly without Dialog overlay.
 */
export function TaskDetailView({
    taskId,
    onClose,
    layoutMode = 'fullscreen',
    onLayoutModeChange,
    className,
}: TaskDetailViewProps) {
    return (
        <div className={cn('flex flex-col h-full w-full bg-white', className)}>
            <TaskDetailContent
                taskId={taskId}
                onClose={onClose}
                layoutMode={layoutMode}
                onLayoutModeChange={onLayoutModeChange}
                hideLayoutModeSwitch={true}
                closeIcon={<SquareArrowRightExit className="h-4 w-4" />}
            />
        </div>
    );
}

export type { TaskLayoutMode };