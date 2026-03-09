"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  Play, 
  Pause, 
  Edit,
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

  const handleToggleActive = () => {
    updateAgent.mutate({
      id: agent.id,
      isActive: !agent.isActive,
      status: !agent.isActive ? 'ACTIVE' : 'PAUSED',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{agent.avatar || '🤖'}</div>
        <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground mt-1">{agent.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agent.status === 'ACTIVE' ? 'default' : agent.status === 'DRAFT' ? 'secondary' : 'destructive'}>
            {agent.status}
          </Badge>
          <Button variant="outline" onClick={() => router.push(`/dashboard/agents/${agent.id}?tab=builder`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleToggleActive}>
            {agent.isActive ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </Button>
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
