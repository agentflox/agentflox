"use client";

import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../types";

export function useAutomations(scope: AutomationScope | null, opts?: { kind?: "CLASSIC" | "AGENT"; enabled?: boolean }) {
  const list = trpc.automation.list.useQuery(
    {
      workspaceId: scope?.workspaceId || "",
      teamId: scope?.teamId,
      spaceId: scope?.spaceId,
      projectId: scope?.projectId,
      folderId: scope?.folderId,
      listId: scope?.listId,
      kind: opts?.kind,
      exactScope: true,
    },
    { enabled: !!scope?.workspaceId && opts?.enabled !== false },
  );
  const utils = trpc.useUtils();
  const setActive = trpc.automation.setActive.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });
  return { list, setActive, utils };
}
