import { isKillSwitchOff, isWorkspaceAutomationsEnabled } from '@/services/automations/flag';

describe('automations v1 flag', () => {
  const orig = process.env.AUTOMATIONS_V1_KILL_SWITCH;

  afterEach(() => {
    if (orig === undefined) delete process.env.AUTOMATIONS_V1_KILL_SWITCH;
    else process.env.AUTOMATIONS_V1_KILL_SWITCH = orig;
  });

  it('is off by default when workspace settings omit the flag', () => {
    delete process.env.AUTOMATIONS_V1_KILL_SWITCH;
    expect(isWorkspaceAutomationsEnabled({})).toBe(false);
    expect(isWorkspaceAutomationsEnabled(null)).toBe(false);
  });

  it('enables when settings.automationsV1 is true', () => {
    delete process.env.AUTOMATIONS_V1_KILL_SWITCH;
    expect(isWorkspaceAutomationsEnabled({ automationsV1: true })).toBe(true);
    expect(isWorkspaceAutomationsEnabled({ 'automations.v1': true })).toBe(true);
  });

  it('stops new emits when the kill switch is off', () => {
    process.env.AUTOMATIONS_V1_KILL_SWITCH = 'off';
    expect(isKillSwitchOff()).toBe(true);
    expect(isWorkspaceAutomationsEnabled({ automationsV1: true })).toBe(false);
  });
});
