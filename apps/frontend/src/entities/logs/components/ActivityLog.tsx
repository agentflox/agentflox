'use client';

import { useActivityLogs } from '../hooks/useLogs';
import { ActivityItem } from './ActivityItem';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ActivityLogProps {
  projectId?: string;
  teamId?: string;
  userId?: string;
  category?: string;
  title?: string;
}

export function ActivityLog({
  projectId,
  teamId,
  userId,
  category,
  title = 'Activity Log',
}: ActivityLogProps) {
  const { logs, isLoading } = useActivityLogs({
    projectId,
    teamId,
    userId,
    category,
  });

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No activity to display
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <ActivityItem key={log.id} log={log} />
          ))}
        </div>
      )}
    </Card>
  );
}
