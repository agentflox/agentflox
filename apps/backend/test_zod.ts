import { z } from 'zod';

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

const json = {
  "nodes": [
    {
      "type": "task",
      "config": {
        "label": "Write blog content",
        "status": "Completed",
        "taskId": "cmlr0da6c000osuvop81d68up",
        "dueDate": "2026-02-11T17:00:00.000Z",
        "priority": "NORMAL",
        "description": "...",
        "stickyNoteContent": "<p></p>"
      },
      "node_id": "taskNode-1780905418836"
    }
  ],
  "edges": []
};

const parsed = WorkforceGraphSchema.parse(json);
console.log(parsed.nodes[0].config?.taskId);
console.log(parsed.nodes[0].config?.taskId ? 'LIVE' : 'PLACEHOLDER');
