const KILL_SWITCH = 'AUTOMATIONS_V1_KILL_SWITCH';

export function isKillSwitchOff(): boolean {
  return String(process.env[KILL_SWITCH] || '').toLowerCase() === 'off';
}

export function isWorkspaceAutomationsEnabled(settings: unknown): boolean {
  if (isKillSwitchOff()) return false;
  if (!settings || typeof settings !== 'object') return false;
  const s = settings as Record<string, unknown>;
  return s.automationsV1 === true || s['automations.v1'] === true;
}
