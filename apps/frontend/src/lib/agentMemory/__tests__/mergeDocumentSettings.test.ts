import { describe, expect, it } from '@jest/globals';
import { mergeDocumentSettings } from '../memoryPolicy';

describe('mergeDocumentSettings', () => {
  it('preserves agentMemory when updating pageSettings/iconColor', () => {
    const existing = {
      iconColor: '#111',
      pageSettings: { fontSize: 'default' },
      agentMemory: { role: 'fact', key: 'k1', category: 'goal' },
    };
    const merged = mergeDocumentSettings(existing, {
      iconColor: '#222',
      pageSettings: { fontStyle: 'serif' },
    });
    expect(merged.agentMemory).toEqual(existing.agentMemory);
    expect(merged.iconColor).toBe('#222');
    expect(merged.pageSettings).toEqual({ fontSize: 'default', fontStyle: 'serif' });
  });

  it('preserves pageSettings when updating agentMemory namespace', () => {
    const existing = {
      iconColor: '#111',
      pageSettings: { fontSize: 'large' },
      agentMemory: { role: 'fact', key: 'k1', category: 'goal' },
    };
    const merged = mergeDocumentSettings(existing, {
      agentMemory: { category: 'person', expiresAt: '2026-01-01T00:00:00.000Z' },
    });
    expect(merged.pageSettings).toEqual({ fontSize: 'large' });
    expect(merged.iconColor).toBe('#111');
    expect(merged.agentMemory).toEqual({
      role: 'fact',
      key: 'k1',
      category: 'person',
      expiresAt: '2026-01-01T00:00:00.000Z',
    });
  });
});
