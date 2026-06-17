"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Bot, 
  Play, 
  Pause, 
  Edit,
  Sparkles,
  Wrench,
  Archive,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Settings
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function OverviewView({ agent }: { agent: any }) {
  const router = useRouter();
  const { data: executions } = trpc.agent.getExecutions.useQuery(
    { agentId: agent?.id || '', page: 1, pageSize: 10 },
    { enabled: !!agent?.id }
  );

  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast.success('Agent updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update agent');
    },
  });

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No agent data available</p>
      </div>
    );
  }

  const successRate = agent.totalExecutions > 0
    ? ((agent.successfulRuns / agent.totalExecutions) * 100).toFixed(1)
    : '0';

  const handleToggleActive = (checked: boolean) => {
    updateAgent.mutate({
      id: agent.id,
      isActive: checked,
      status: checked ? 'ACTIVE' : 'PAUSED',
    });
  };

  const handleRun = () => {
    router.push(`/dashboard/agents/${agent.id}?tab=chat`);
  };

  const handleEditWithAI = () => {
    router.push(`/dashboard/agents/${agent.id}?tab=ai-builder`);
  };

  const handleEditManually = () => {
    router.push(`/dashboard/agents/${agent.id}?tab=settings`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{agent.avatar || '🤖'}</div>
        <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <Badge variant={agent.status === 'ACTIVE' ? 'default' : agent.status === 'DRAFT' ? 'secondary' : 'destructive'}>
                {agent.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5">{agent.description || 'No description'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 shadow-none"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit this agent</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-64 p-1.5">
              <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Edit options
              </div>
              <DropdownMenuItem onClick={handleEditWithAI} className="gap-2.5 rounded-md px-2 py-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">Edit with AI</span>
                  <span className="text-xs text-muted-foreground">
                    Describe changes and let AI update the agent
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEditManually} className="gap-2.5 rounded-md px-2 py-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">Edit manually</span>
                  <span className="text-xs text-muted-foreground">
                    Adjust settings and configuration yourself
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Run */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRun}
                className="h-9 w-9 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 shadow-none"
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Run this agent</p>
            </TooltipContent>
          </Tooltip>

          {/* Activate toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 h-9 rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-950">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {agent.isActive ? 'Active' : 'Inactive'}
                </span>
                <Switch
                  className="cursor-pointer"
                  checked={agent.isActive}
                  onCheckedChange={handleToggleActive}
                  disabled={updateAgent.isPending}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{agent.isActive ? 'Pause this agent' : 'Activate this agent'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agent.totalExecutions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {agent.lastExecutedAt ? `Last: ${new Date(agent.lastExecutedAt).toLocaleDateString()}` : 'Never executed'}
            </p>
          </CardContent>
        </Card>

      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {agent.successfulRuns || 0} successful, {agent.failedRuns || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Run Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agent.averageRunTime ? `${agent.averageRunTime.toFixed(1)}s` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(agent.totalCost || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {agent.totalTokensUsed || 0} tokens used
            </p>
          </CardContent>
        </Card>
              </div>

      {/* Agent Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capabilities & Constraints */}
        <Card>
          <CardHeader>
            <CardTitle>Capabilities & Constraints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Capabilities
              </h4>
              {agent.capabilities && agent.capabilities.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {agent.capabilities.map((cap: string, i: number) => (
                    <li key={i}>{cap}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No capabilities defined</p>
            )}
          </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Constraints
              </h4>
              {agent.constraints && agent.constraints.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {agent.constraints.map((constraint: string, i: number) => (
                    <li key={i}>{constraint}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No constraints defined</p>
              )}
            </div>
        </CardContent>
      </Card>

        {/* Configuration Summary */}
      <Card>
        <CardHeader>
            <CardTitle>Configuration</CardTitle>
            </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge variant="outline">{agent.agentType}</Badge>
                          </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Autonomy Level</span>
              <Badge variant="outline">{agent.autonomyLevel}</Badge>
                        </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Requires Approval</span>
              <Badge variant={agent.requiresApproval ? 'default' : 'secondary'}>
                {agent.requiresApproval ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Trigger Type</span>
              <Badge variant="outline">{agent.triggerType || 'Manual'}</Badge>
            </div>
            {agent.availableTools && agent.availableTools.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Tools</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {agent.availableTools.map((tool: string) => (
                    <Badge key={tool} variant="secondary" className="text-xs">{tool}</Badge>
                  ))}
                </div>
              </div>
            )}
            </CardContent>
          </Card>
      </div>

      {/* Recent Executions */}
      {executions && executions.items && executions.items.length > 0 && (
          <Card>
            <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
              {executions.items.slice(0, 5).map((execution: any) => (
                <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      execution.status === 'COMPLETED' ? 'default' :
                      execution.status === 'FAILED' ? 'destructive' :
                      'secondary'
                    }>
                      {execution.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Unknown'}
                    </span>
                  </div>
                  {execution.duration && (
                    <span className="text-sm text-muted-foreground">
                      {execution.duration.toFixed(2)}s
                    </span>
                  )}
                </div>
              ))}
            </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}