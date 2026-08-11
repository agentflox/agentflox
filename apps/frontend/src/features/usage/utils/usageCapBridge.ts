import type { UsageCapPayload } from "@/features/usage/types";

type Opener = (payload: UsageCapPayload) => void;

let opener: Opener | null = null;

/** Registered by UsageCapProvider so non-React fetch/stream paths can open the modal. */
export function registerUsageCapOpener(next: Opener | null) {
  opener = next;
}

export function emitUsageCap(payload: UsageCapPayload): boolean {
  if (!opener) return false;
  opener(payload);
  return true;
}
