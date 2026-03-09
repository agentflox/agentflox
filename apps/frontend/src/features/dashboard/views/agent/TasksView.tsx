"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Clock, AlertCircle } from 'lucide-react';

interface TasksViewProps {
  agentId?: string;
}

export const TasksView = ({ agentId }: TasksViewProps) => {
  // TODO: Implement agent tasks query when backend endpoint is available
  // For now, show placeholder

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CheckSquare className="h-8 w-8" />
          Agent Tasks
        </h1>
        <p className="text-muted-foreground mt-1">
          Tasks assigned to and executed by this agent
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-center py-8 text-muted-foreground">
            <p>Task management for agents will be available soon</p>
            <p className="text-sm mt-2">This will show all tasks the agent has been assigned or has executed</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
