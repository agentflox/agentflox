"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Edit,
  Clock,
  Webhook,
  MousePointerClick,
  CheckCircle2
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface AutomationViewProps {
  agent?: any;
}

export function AutomationView({ agent }: AutomationViewProps) {
  const [activeTab, setActiveTab] = useState('triggers');

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No agent data available</p>
      </div>
    );
  }

  const triggerTypes = [
    { value: 'MANUAL', label: 'Manual', icon: MousePointerClick, description: 'User invokes the agent' },
    { value: 'TASK_CREATED', label: 'Task Created', icon: Plus, description: 'When a task is created' },
    { value: 'TASK_UPDATED', label: 'Task Updated', icon: Edit, description: 'When a task is updated' },
    { value: 'SCHEDULED', label: 'Scheduled', icon: Clock, description: 'Run on a schedule' },
    { value: 'WEBHOOK', label: 'Webhook', icon: Webhook, description: 'External system triggers' },
    { value: 'EVENT', label: 'Event', icon: Zap, description: 'Custom event occurs' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure triggers and actions for your agent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agent.isActive ? 'default' : 'secondary'}>
            {agent.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Automation Builder */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="space-y-4 mt-6">
      <Card>
        <CardHeader>
              <CardTitle>Current Trigger</CardTitle>
          <CardDescription>
                Configure when your agent should activate
          </CardDescription>
        </CardHeader>
        <CardContent>
              {agent.triggerType ? (
          <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const triggerType = triggerTypes.find(t => t.value === agent.triggerType);
                        const Icon = triggerType?.icon || Zap;
                        return <Icon className="h-5 w-5 text-primary" />;
                      })()}
            <div>
                        <p className="font-medium">{agent.triggerType}</p>
                        <p className="text-sm text-muted-foreground">
                          {triggerTypes.find(t => t.value === agent.triggerType)?.description}
                        </p>
            </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="h-8">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" className="h-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {agent.schedule && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm"><strong>Schedule:</strong> {agent.schedule}</p>
              </div>
            )}
          </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No trigger configured</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Trigger
                  </Button>
                </div>
              )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
              <CardTitle>Available Trigger Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {triggerTypes.map((trigger) => {
                  const Icon = trigger.icon;
                  return (
                    <Card
                      key={trigger.value}
                      className="cursor-pointer hover:border-primary transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">{trigger.label}</p>
                            <p className="text-sm text-muted-foreground">{trigger.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Action Sequence</CardTitle>
          <CardDescription>
                Define what your agent should do when triggered
          </CardDescription>
        </CardHeader>
        <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Actions are defined in the agent's instructions</p>
                <p className="text-sm text-muted-foreground">
                  Edit the agent's system prompt in the Builder view to configure actions
                </p>
            </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
