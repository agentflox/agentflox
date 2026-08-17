"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Activity, CheckCircle2, XCircle, Clock, Loader2, Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
// Date formatting helper
const formatTimeAgo = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
};

interface ActivitiesViewProps {
  agentId?: string;
}

export function ActivitiesView({ agentId }: ActivitiesViewProps) {
  const { data: executions, isLoading } = trpc.agent.getExecutions.useQuery(
    { agentId: agentId || '', page: 1, pageSize: 50 },
    { enabled: !!agentId }
  );

  const handleExportLogs = () => {
    if (!executions || executions.items.length === 0) return;

    const rows = executions.items.map((execution: any) => ({
      id: execution.id,
      status: execution.status,
      startedAt: execution.startedAt || '',
      duration: execution.duration ?? '',
      error: execution.error || '',
    }));

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(','),
      ...rows.map((row: any) =>
        header.map((key) => `"${String(row[key]).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `execution-logs-${agentId || 'agent'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!executions || executions.items.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Execution History
          </h1>
          <p className="text-muted-foreground mt-1">No executions yet</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'RUNNING':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Execution History
          </h1>
          <p className="text-muted-foreground mt-1">
            {executions.total} total executions
          </p>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportLogs}
              className="h-9 w-9 border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export logs as CSV</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-4">
        {executions.items.map((execution: any) => (
          <Card key={execution.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                    {getStatusIcon(execution.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={
                        execution.status === 'COMPLETED' ? 'default' :
                        execution.status === 'FAILED' ? 'destructive' :
                        'secondary'
                      }>
                      {execution.status}
                    </Badge>
                      <span className="text-sm text-muted-foreground">
                        {execution.startedAt ? formatTimeAgo(execution.startedAt) : 'Unknown time'}
                      </span>
                    </div>
                    {execution.error && (
                      <p className="text-sm text-red-600 mt-2">{execution.error}</p>
                    )}
                    {execution.duration && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Duration: {execution.duration.toFixed(2)}s
                      </p>
                    )}
                  </div>
                </div>
            </div>
        </CardContent>
      </Card>
        ))}
      </div>
    </div>
  );
}