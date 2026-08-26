export type UsageCapKind =
  | 'PROJECT'
  | 'TEAM'
  | 'SPACE'
  | 'WORKSPACE'
  | 'REQUEST'
  | 'EXECUTION'
  | 'SUBSCRIPTION'
  | 'CONCURRENT'
  | 'TOKENS'
  | 'AGENT'
  | 'TOOL';

export type UsageQuotaMeter = {
  kind: UsageCapKind;
  used: number;
  max: number;
  /** -1 = unlimited */
  remaining: number;
};

export type UsageCapPayload = {
  code: 'USAGE_CAP';
  kind: UsageCapKind;
  used: number;
  max: number;
  remaining: number;
  message: string;
  upgradeUrl: string;
};

export const USAGE_CAP_UPGRADE_URL = '/dashboard/billing/upgrade';

export function computeRemaining(used: number, max: number): number {
  if (max < 0) return -1;
  return Math.max(0, max - used);
}

export function isUsageCapPayload(value: unknown): value is UsageCapPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as UsageCapPayload).code === 'USAGE_CAP' &&
    typeof (value as UsageCapPayload).kind === 'string'
  );
}
