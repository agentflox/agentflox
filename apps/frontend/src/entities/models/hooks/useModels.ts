'use client';

import { trpc } from '@/lib/trpc';
import type { AiModelProvider } from '@agentflox/types';

export function useModels(opts?: {
  search?: string;
  providers?: AiModelProvider[];
  enabled?: boolean;
}) {
  return trpc.models.list.useQuery(
    {
      search: opts?.search,
      providers: opts?.providers,
    },
    { enabled: opts?.enabled !== false, staleTime: 30_000 },
  );
}

export function useDefaultModel() {
  return trpc.models.getDefault.useQuery(undefined, { staleTime: 60_000 });
}

export function useModelMutations() {
  const utils = trpc.useUtils();
  const createCustom = trpc.models.createCustom.useMutation({
    onSuccess: () => utils.models.list.invalidate(),
  });
  const updateCustom = trpc.models.updateCustom.useMutation({
    onSuccess: () => utils.models.list.invalidate(),
  });
  const deleteCustom = trpc.models.deleteCustom.useMutation({
    onSuccess: () => utils.models.list.invalidate(),
  });
  return { createCustom, updateCustom, deleteCustom };
}
