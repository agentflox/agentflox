import { conditionGateCacheKey, relevantFieldFingerprint } from '@/services/automations/fingerprint';

describe('LLM condition fingerprint', () => {
  it('changes when a relevant task field changes', () => {
    const base = {
      title: 'Ship',
      description: 'Do it',
      statusId: 's1',
      priority: 'HIGH',
      assigneeId: 'u1',
      dueDate: '2026-08-17T00:00:00.000Z',
      taskTypeId: 't1',
      listId: 'l1',
      tags: ['b', 'a'],
    };
    const a = relevantFieldFingerprint(base);
    const b = relevantFieldFingerprint({ ...base, title: 'Shipped' });
    expect(a).not.toEqual(b);
  });

  it('is stable for tag order', () => {
    const a = relevantFieldFingerprint({ tags: ['b', 'a'] });
    const b = relevantFieldFingerprint({ tags: ['a', 'b'] });
    expect(a).toEqual(b);
  });

  it('keys the cache by prompt + task + fingerprint', () => {
    const fp = relevantFieldFingerprint({ title: 'A' });
    const k1 = conditionGateCacheKey('when overdue', 'task-1', fp);
    const k2 = conditionGateCacheKey('when overdue', 'task-1', fp);
    const k3 = conditionGateCacheKey('when overdue', 'task-2', fp);
    expect(k1).toEqual(k2);
    expect(k1).not.toEqual(k3);
  });
});
