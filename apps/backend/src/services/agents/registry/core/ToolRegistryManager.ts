import type { Tool } from '../../types/types';

export type ToolDefinition = Omit<Tool, 'id'> & { displayName?: string };

export class ToolRegistryManager {
    private tools: Map<string, ToolDefinition>;

    constructor() {
        this.tools = new Map();
    }

    /**
     * Register a single tool
     */
    public register(tool: ToolDefinition): void {
        if (this.tools.has(tool.name)) {
            console.warn(`[ToolRegistryManager] Tool with name ${tool.name} is already registered. Overwriting.`);
        }
        this.tools.set(tool.name, tool);
    }

    /**
     * Register multiple tools at once
     */
    public registerMany(tools: ToolDefinition[]): void {
        for (const tool of tools) {
            this.register(tool);
        }
    }

    /**
     * Retrieve a tool by its name
     */
    public getTool(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    /**
     * Get all registered tool definitions
     */
    public getAllToolDefinitions(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tools filtered by category
     */
    public getToolsByCategory(category: string): ToolDefinition[] {
        return this.getAllToolDefinitions().filter(tool => tool.category === category);
    }
}

// Singleton instance for global access
export const toolRegistryManager = new ToolRegistryManager();
