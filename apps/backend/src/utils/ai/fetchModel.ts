import { prisma } from '@/lib/prisma';
import { convertModelName } from './convertModelName';
import type { NormalizedModelOption } from '@agentflox/types';

export async function fetchModel() {
  const model = await prisma.aiModel.findFirst();
  if (!model) {
    throw new Error('No AI model found in the database');
  }
  return {
    ...model,
    name: convertModelName(model.name) as NormalizedModelOption,
  };
}
