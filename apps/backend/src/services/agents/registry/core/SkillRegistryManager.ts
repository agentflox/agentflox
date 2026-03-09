export interface SkillDefinition {
    name: string;
    displayName: string;
    description: string;
    category: 'creative' | 'technical' | 'automation' | 'business';
    icon?: string;
    isBuiltIn: boolean;
    tools?: string[]; // Native tool binding to this skill
}

export class SkillRegistryManager {
    private skills: Map<string, SkillDefinition>;

    constructor() {
        this.skills = new Map();
    }

    /**
     * Register a single skill
     */
    public register(skill: SkillDefinition): void {
        if (this.skills.has(skill.name)) {
            console.warn(`[SkillRegistryManager] Skill with name ${skill.name} is already registered. Overwriting.`);
        }
        this.skills.set(skill.name, skill);
    }

    /**
     * Register multiple skills at once
     */
    public registerMany(skills: SkillDefinition[]): void {
        for (const skill of skills) {
            this.register(skill);
        }
    }

    /**
     * Retrieve a skill by its name
     */
    public getSkill(name: string): SkillDefinition | undefined {
        return this.skills.get(name);
    }

    /**
     * Get all registered skill definitions
     */
    public getAllSkillDefinitions(): SkillDefinition[] {
        return Array.from(this.skills.values());
    }

    /**
     * Get all skill names
     */
    public getAllSkillNames(): string[] {
        return Array.from(this.skills.keys());
    }

    /**
     * Get skills filtered by category
     */
    public getSkillsByCategory(category: string): SkillDefinition[] {
        return this.getAllSkillDefinitions().filter(skill => skill.category === category);
    }
}

// Singleton instance for global access
export const skillRegistryManager = new SkillRegistryManager();
