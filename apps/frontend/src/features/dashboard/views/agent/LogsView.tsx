"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileText, Search, Download, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface LogsViewProps {
  agentId?: string;
}

type LogLevel = 'success' | 'error' | 'warning' | 'info' | 'debug' | 'all';

export const LogsView = ({ agentId }: LogsViewProps) => {
  const [logLevel, setLogLevel] = useState<LogLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Implement agent logs query when backend endpoint is available
  // For now, show placeholder with filters

  const logLevels: { value: LogLevel; label: string; icon: any }[] = [
    { value: 'all', label: 'All Logs', icon: FileText },
    { value: 'success', label: 'Success', icon: CheckCircle2 },
    { value: 'error', label: 'Error', icon: AlertCircle },
    { value: 'warning', label: 'Warning', icon: AlertTriangle },
    { value: 'info', label: 'Info', icon: Info },
    { value: 'debug', label: 'Debug', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            System Logs
          </h1>
        <p className="text-muted-foreground mt-1">
            View agent execution logs and system events
        </p>
      </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={logLevel} onValueChange={(value) => setLogLevel(value as LogLevel)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                {logLevels.map((level) => {
                  const Icon = level.icon;
                  return (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {level.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-center py-8 text-muted-foreground">
            <p>Log viewing for agents will be available soon</p>
            <p className="text-sm mt-2">This will show system logs, execution logs, errors, and performance metrics</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
