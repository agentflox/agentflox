"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, X, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ExecutionStep {
  id: string;
  order: number;
  description: string;
  type: 'GATHER_CONTEXT' | 'VALIDATE' | 'EXECUTE' | 'CONFIRM' | 'STORE_MEMORY';
  dependencies: string[];
  estimatedTime: number;
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  result?: any;
  error?: string;
}

interface ExecutionPlan {
  id: string;
  steps: ExecutionStep[];
  totalEstimatedTime: number;
  requiresApproval: boolean;
  approvalReason?: string;
  contextUsed?: Array<{
    contextId: string;
    usedIn: string;
    relevanceScore: number;
    explanation: string;
  }>;
  createdAt: string;
}

interface PlanViewerProps {
  plan: ExecutionPlan;
  onDismiss?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

const stepTypeLabels: Record<string, string> = {
  GATHER_CONTEXT: 'Gather Context',
  VALIDATE: 'Validate',
  EXECUTE: 'Execute',
  CONFIRM: 'Confirm',
  STORE_MEMORY: 'Store Memory',
};

const stepTypeColors: Record<string, string> = {
  GATHER_CONTEXT: 'bg-blue-100 text-blue-800',
  VALIDATE: 'bg-yellow-100 text-yellow-800',
  EXECUTE: 'bg-green-100 text-green-800',
  CONFIRM: 'bg-purple-100 text-purple-800',
  STORE_MEMORY: 'bg-gray-100 text-gray-800',
};

export const PlanViewer: React.FC<PlanViewerProps> = ({
  plan,
  onDismiss,
  onApprove,
  onReject,
}) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const sortedSteps = [...plan.steps].sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Execution Plan
            </CardTitle>
            <CardDescription className="mt-1">
              {plan.steps.length} steps • Estimated time: {formatTime(plan.totalEstimatedTime)}
            </CardDescription>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approval Notice */}
        {plan.requiresApproval && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ Approval Required
            </p>
            {plan.approvalReason && (
              <p className="mt-1 text-xs text-yellow-700">{plan.approvalReason}</p>
            )}
          </div>
        )}

        {/* Steps List */}
        <div className="space-y-3">
          {sortedSteps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {step.order}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={stepTypeColors[step.type] || 'bg-gray-100 text-gray-800'}
                  >
                    {stepTypeLabels[step.type] || step.type}
                  </Badge>
                  {step.status && (
                    <Badge
                      variant={
                        step.status === 'COMPLETED'
                          ? 'default'
                          : step.status === 'FAILED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {step.status}
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{step.description}</p>
                {step.dependencies.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Depends on: {step.dependencies.join(', ')}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(step.estimatedTime)}
                </div>
                {step.error && (
                  <div className="rounded bg-red-50 p-2 text-xs text-red-800">
                    Error: {step.error}
                  </div>
                )}
                {step.result && (
                  <div className="rounded bg-green-50 p-2 text-xs text-green-800">
                    Result: {JSON.stringify(step.result)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Context Used */}
        {plan.contextUsed && plan.contextUsed.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Context Used:</p>
              <div className="space-y-1">
                {plan.contextUsed.map((ctx, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    • {ctx.explanation} (relevance: {(ctx.relevanceScore * 100).toFixed(0)}%)
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        {plan.requiresApproval && (onApprove || onReject) && (
          <>
            <Separator />
            <div className="flex gap-2">
              {onApprove && (
                <Button onClick={onApprove} className="flex-1">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
              {onReject && (
                <Button variant="destructive" onClick={onReject} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

