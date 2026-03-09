/**
 * Workforce Execution Service
 * Converts workforce graph to AgentWorkflow definition and runs via workflow orchestrator
 */
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { workflowOrchestrationService } from './workflowOrchestrator';

export interface WorkforceGraphNode {
  node_id: string;
  type: 'trigger' | 'agent' | 'tool' | 'task' | 'condition';
  config?: { agentId?: string; toolId?: string; taskId?: string; instructions?: string; [k: string]: unknown };
  metadata?: { position?: { x: number; y: number; z: number } };
}

export interface WorkforceGraphEdge {
  edge_id?: string;
  source_node_id: string;
  target_node_id: string;
  source_type?: string;
  target_type?: string;
  config?: { edge_type?: string; config?: Record<string, unknown> };
  metadata?: { label?: string };
}

export interface WorkforceGraph {
  nodes: WorkforceGraphNode[];
  edges: WorkforceGraphEdge[];
}

// Runtime validation schema for workforce_graph payload
const WorkforceNodeSchema = z.object({
  node_id: z.string().min(1),
  type: z.enum(['trigger', 'agent', 'tool', 'task', 'condition']),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const WorkforceGraphSchema = z.object({
  nodes: z.array(WorkforceNodeSchema).min(1),
  edges: z.array(
    z.object({
      source_node_id: z.string().min(1),
      target_node_id: z.string().min(1),
    })
  ),
});

function detectGraphCycles(edges: WorkforceGraphEdge[]): boolean {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.source_node_id)) adj.set(e.source_node_id, new Set());
    adj.get(e.source_node_id)!.add(e.target_node_id);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();

  const dfs = (node: string): boolean => {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const n of adj.get(node) ?? []) {
      if (dfs(n)) return true;
    }
    stack.delete(node);
    return false;
  };

  for (const node of adj.keys()) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }
  return false;
}

export interface WorkforceData {
  workforce_graph?: WorkforceGraph;
  workforce_metadata?: { name?: string; user_instructions?: string };
  react_flow_graph?: { nodes: unknown[]; edges: unknown[] };
}

/**
 * Transform workforce graph (nodes/edges) to workflow definition format
 */
export function transformWorkforceGraphToDefinition(
  graph: WorkforceGraph
): { steps: any[]; startStepId: string | null } {
  const { nodes, edges } = graph;
  if (!nodes?.length || !edges?.length) {
    return { steps: [], startStepId: null };
  }

  const triggerNode = nodes.find((n) => n.type === 'trigger');
  const triggerId = triggerNode?.node_id;

  const stepMap = new Map<string, any>();
  const executableNodeIds = new Set<string>();

  for (const node of nodes) {
    const outgoing = edges.filter((e) => e.source_node_id === node.node_id);
    const next = outgoing.map((e) => ({
      to: e.target_node_id,
      condition: 'success',
    }));

    if (node.type === 'trigger') {
      stepMap.set(node.node_id, {
        id: node.node_id,
        name: node.config?.instructions || 'Trigger',
        capability: 'WORKFLOW_TRIGGER',
        agentId: null,
        required: true,
        next,
      });
    } else if (node.type === 'agent') {
      executableNodeIds.add(node.node_id);
      stepMap.set(node.node_id, {
        id: node.node_id,
        name: node.node_id,
        capability: 'GENERAL',
        agentId: node.config?.agentId,
        required: true,
        next,
      });
    } else if (node.type === 'tool' || node.type === 'task') {
      executableNodeIds.add(node.node_id);
      stepMap.set(node.node_id, {
        id: node.node_id,
        name: node.node_id,
        capability: 'GENERAL',
        agentId: node.config?.agentId,
        toolId: node.config?.toolId,
        taskId: node.config?.taskId,
        executionMode: (node.config as any)?.executionMode ?? 'PLACEHOLDER',
        required: true,
        next,
      });
    } else if (node.type === 'condition') {
      stepMap.set(node.node_id, {
        id: node.node_id,
        name: node.node_id,
        capability: 'GENERAL',
        agentId: node.config?.agentId,
        required: true,
        next,
      });
    }
  }

  // Start from first agent node reachable from trigger, or first executable node
  let startStepId: string | null = null;
  if (triggerId) {
    const firstTargets = edges.filter((e) => e.source_node_id === triggerId).map((e) => e.target_node_id);
    startStepId = firstTargets.find((id) => executableNodeIds.has(id) || stepMap.has(id)) ?? firstTargets[0] ?? null;
  }
  if (!startStepId) {
    startStepId = nodes.find((n) => executableNodeIds.has(n.node_id))?.node_id ?? nodes[0]?.node_id ?? null;
  }

  const steps = Array.from(stepMap.values());
  return { steps, startStepId };
}

/**
 * Sync workforce to AgentWorkflow (upsert) and return workflow ID
 */
export async function syncWorkflowFromWorkforce(workforceId: string): Promise<string> {
  const workforce = await prisma.workforce.findUnique({
    where: { id: workforceId },
  });

  if (!workforce) throw new Error(`Workforce ${workforceId} not found`);

  const data = (workforce.data as WorkforceData) || {};
  const graph = data.workforce_graph;

  if (!graph?.nodes?.length) {
    throw new Error(`Workforce ${workforceId} has no graph definition. Add nodes and edges in the builder.`);
  }

  // Validate graph shape at sync time
  const validated = WorkforceGraphSchema.parse(graph);

  // Enforce exactly one trigger node
  const triggerNodes = validated.nodes.filter(n => n.type === 'trigger');
  if (triggerNodes.length !== 1) {
    throw new Error(
      `Workforce ${workforceId} must have exactly one trigger node, found ${triggerNodes.length}`
    );
  }

  // Detect cycles at graph level before persisting workflow definition
  if (detectGraphCycles(validated.edges)) {
    throw new Error(`Cycle detected in workforce graph for workforce ${workforceId}`);
  }

  const { steps, startStepId } = transformWorkforceGraphToDefinition(validated);
  if (!startStepId) throw new Error('Workforce graph has no start node');

  const definition = { steps, startStepId, workforceId };

  const existing = await prisma.agentWorkflow.findFirst({
    where: {
      workspaceId: workforce.workspaceId,
      name: `[Workforce] ${workforce.name}`,
    },
  });

  if (existing) {
    await prisma.agentWorkflow.update({
      where: { id: existing.id },
      data: {
        definition: definition as any,
        description: workforce.description ?? undefined,
        isActive: true,
      },
    });
    return existing.id;
  }

  const created = await prisma.agentWorkflow.create({
    data: {
      id: randomUUID(),
      workspaceId: workforce.workspaceId,
      name: `[Workforce] ${workforce.name}`,
      description: workforce.description ?? undefined,
      definition: definition as any,
      isActive: true,
    },
  });
  return created.id;
}

/**
 * Run a workforce: sync graph to AgentWorkflow, then start execution
 */
export async function runWorkforce(
  workforceId: string,
  input: { task?: string; [k: string]: unknown },
  userId: string
): Promise<{ executionId: string; workflowId: string; status: string }> {
  const workflowId = await syncWorkflowFromWorkforce(workforceId);
  const execution = await workflowOrchestrationService.startWorkflow(workflowId, input, userId);
  return {
    executionId: execution.id,
    workflowId,
    status: execution.status,
  };
}
