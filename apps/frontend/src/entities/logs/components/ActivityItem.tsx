'use client';

import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityLog } from '@agentflox/database/src/generated/prisma/client';
import {
  UserPlus,
  UserMinus,
  Briefcase,
  DollarSign,
  AlertCircle,
  Info,
  Settings,
} from 'lucide-react';

interface ActivityItemProps {
  log: ActivityLog;
}

const severityColors = {
  INFO: 'bg-blue-500/10 text-blue-500',
  WARNING: 'bg-yellow-500/10 text-yellow-500',
  ERROR: 'bg-red-500/10 text-red-500',
  CRITICAL: 'bg-red-500/10 text-red-500',
};

const getIcon = (action: string) => {
  if (action.includes('ADD') || action.includes('JOIN')) return UserPlus;
  if (action.includes('REMOVE') || action.includes('LEAVE')) return UserMinus;
  if (action.includes('PROJECT')) return Briefcase;
  if (action.includes('INVESTMENT')) return DollarSign;
  if (action.includes('ERROR') || action.includes('CRITICAL'))
    return AlertCircle;
  if (action.includes('SYSTEM')) return Settings;
  return Info;
};

export function ActivityItem({ log }: ActivityItemProps) {
  const Icon = getIcon(log.action);

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-shrink-0 mt-1">
        <div
          className={`p-2 rounded-full ${severityColors[log.severity]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm">{log.title}</p>
            {log.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {log.description}
              </p>
            )}
          </div>

          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {log.category}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
