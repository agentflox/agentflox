import { matchesLocation, matchesSources, matchesTriggerConfig } from '@/services/automations/matcher';
import { DEFAULT_AGENT_SOURCES, DEFAULT_CLASSIC_SOURCES } from '@/services/automations/catalog/triggers';

describe('automation matcher scope', () => {
  const event = {
    type: 'TASK_OR_SUBTASK_CREATED' as const,
    taskId: 't1',
    workspaceId: 'ws',
    spaceId: 'sp',
    projectId: 'pj',
    teamId: 'tm',
    listId: 'ls',
  };

  it('matches a workspace-wide rule to any location in that workspace', () => {
    expect(matchesLocation({ workspaceId: 'ws' }, event)).toBe(true);
  });

  it('does not match a space rule against a different space', () => {
    expect(matchesLocation({ workspaceId: 'ws', spaceId: 'other' }, event)).toBe(false);
  });

  it('matches a list-scoped rule only on that list', () => {
    expect(matchesLocation({ workspaceId: 'ws', listId: 'ls' }, event)).toBe(true);
    expect(matchesLocation({ workspaceId: 'ws', listId: 'other' }, event)).toBe(false);
  });

  it('defaults classic sources to exclude automations and agent sources to include them', () => {
    expect(DEFAULT_CLASSIC_SOURCES.automations).toBe(false);
    expect(DEFAULT_AGENT_SOURCES.automations).toBe(true);
    expect(matchesSources(DEFAULT_CLASSIC_SOURCES, 'automations', 'TASK_OR_SUBTASK_CREATED')).toBe(false);
    expect(matchesSources(DEFAULT_AGENT_SOURCES, 'automations', 'TASK_OR_SUBTASK_CREATED')).toBe(true);
  });
});

describe('custom field trigger config', () => {
  const event = {
    type: 'CUSTOM_FIELD_CHANGED' as const,
    taskId: 't1',
    workspaceId: 'ws',
    customFieldId: 'cf1',
    fromValue: '',
    toValue: 'done',
  };

  it('requires the configured custom field', () => {
    expect(matchesTriggerConfig({ customFieldId: 'cf1', fromValue: '__any__', toValue: '__any__' }, event)).toBe(true);
    expect(matchesTriggerConfig({ customFieldId: 'other', fromValue: '__any__', toValue: '__any__' }, event)).toBe(false);
  });

  it('treats empty as a from-value', () => {
    expect(matchesTriggerConfig({ customFieldId: 'cf1', fromValue: '__empty__', toValue: '__any__' }, event)).toBe(true);
    expect(
      matchesTriggerConfig(
        { customFieldId: 'cf1', fromValue: '__empty__', toValue: '__any__' },
        { ...event, fromValue: 'old' },
      ),
    ).toBe(false);
  });
});
