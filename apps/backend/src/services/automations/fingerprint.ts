import { createHash } from 'crypto';

export type FingerprintTask = {
  title?: string | null;
  description?: string | null;
  statusId?: string | null;
  priority?: string | null;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  taskTypeId?: string | null;
  listId?: string | null;
  tags?: string[] | null;
};

export function relevantFieldFingerprint(task: FingerprintTask): string {
  const tags = [...(task.tags ?? [])].sort();
  const due =
    task.dueDate instanceof Date
      ? task.dueDate.toISOString()
      : task.dueDate ?? '';
  const payload = [
    task.title ?? '',
    task.description ?? '',
    task.statusId ?? '',
    task.priority ?? '',
    task.assigneeId ?? '',
    due,
    task.taskTypeId ?? '',
    task.listId ?? '',
    tags.join(','),
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

export function conditionGateCacheKey(prompt: string, taskId: string, fingerprint: string): string {
  return createHash('sha256').update(`${prompt}::${taskId}::${fingerprint}`).digest('hex');
}
