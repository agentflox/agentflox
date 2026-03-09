/**
 * Tool Registry
 * 
 * Registers all automation tools available to AI agents
 * Uses the new Centralized ToolRegistryManager architecture
 */

import { Tool } from '../types/types';
import { prisma } from '@/lib/prisma';
import type { Tool as ToolType } from '../types/types';
import { toolRegistryManager, ToolDefinition } from './tools';

// Export the sync logic from the unified sync file
export { syncToolsToDatabase } from './sync';

/**
 * Get all tool definitions from code via the Registry Manager
 */
export function getAllToolDefinitions(): ToolDefinition[] {
  return toolRegistryManager.getAllToolDefinitions();
}

/**
 * Get all registered tools from database
 */
export async function getAllTools(): Promise<Tool[]> {
  const dbTools = await prisma.systemTool.findMany({
    where: { isActive: true },
  });

  return dbTools.map(tool => ({
    id: tool.id,
    name: tool.name,
    displayName: tool.displayName ?? undefined,
    description: tool.description,
    category: tool.category as ToolType['category'],
    functionSchema: tool.functionSchema as any,
    deterministic: tool.deterministic,
    requiresAuth: tool.requiresAuth,
    rateLimit: tool.rateLimit ?? undefined,
    timeout: tool.timeout,
    examples: tool.examples as any,
    isDefault: tool.isDefault,
  }));
}

/**
 * Get all tools synchronously (for backward compatibility, uses in-memory definitions)
 */
export function getAllToolsSync(): Tool[] {
  const definitions = getAllToolDefinitions();
  // Generate temporary IDs for backward compatibility
  return definitions.map((def, index) => ({
    id: `temp_${index}_${def.name}`,
    ...def,
  }));
}

/**
 * Get tool by name from database
 */
export async function getToolByName(toolName: string): Promise<Tool | undefined> {
  const tool = await prisma.systemTool.findUnique({
    where: { name: toolName },
  });

  if (!tool) return undefined;

  return {
    id: tool.id,
    name: tool.name,
    displayName: tool.displayName ?? undefined,
    description: tool.description,
    category: tool.category as ToolType['category'],
    functionSchema: tool.functionSchema as any,
    deterministic: tool.deterministic,
    requiresAuth: tool.requiresAuth,
    rateLimit: tool.rateLimit ?? undefined,
    timeout: tool.timeout,
    examples: tool.examples as any,
    isDefault: tool.isDefault,
  };
}

/**
 * Get tool by ID (deprecated - use getToolByName instead)
 */
export async function getToolById(toolId: string): Promise<Tool | undefined> {
  const tool = await prisma.systemTool.findUnique({
    where: { id: toolId },
  });

  if (tool) {
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category as ToolType['category'],
      functionSchema: tool.functionSchema as any,
      deterministic: tool.deterministic,
      requiresAuth: tool.requiresAuth,
      rateLimit: tool.rateLimit ?? undefined,
      timeout: tool.timeout,
      examples: tool.examples as any,
      isDefault: tool.isDefault,
    };
  }

  return getToolByName(toolId);
}

/**
 * Get tools by category from database
 */
export async function getToolsByCategory(category: string): Promise<Tool[]> {
  const tools = await prisma.systemTool.findMany({
    where: {
      category,
      isActive: true,
    },
  });

  return tools.map(tool => ({
    id: tool.id,
    name: tool.name,
    displayName: tool.displayName ?? undefined,
    description: tool.description,
    category: tool.category as ToolType['category'],
    functionSchema: tool.functionSchema as any,
    deterministic: tool.deterministic,
    requiresAuth: tool.requiresAuth,
    rateLimit: tool.rateLimit ?? undefined,
    timeout: tool.timeout,
    examples: tool.examples as any,
    isDefault: tool.isDefault,
  }));
}
