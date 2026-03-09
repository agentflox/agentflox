import { skillRegistryManager } from '../core/SkillRegistryManager';

// Import all skill categories
import { BUILT_IN_SKILLS } from './categories';

// Register all skills to the singleton manager
skillRegistryManager.registerMany(BUILT_IN_SKILLS);

// Export the populated manager for convenience
export { skillRegistryManager };
