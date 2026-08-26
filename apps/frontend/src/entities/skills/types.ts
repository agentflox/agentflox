export type SkillScope = "all" | "builtIn" | "owned" | "custom";

export interface SkillWorkflowStep {
  step: number | string;
  title: string;
  description?: string;
  guidelines?: string[];
  template?: string;
}

export interface AiSkillContent {
  purpose: string;
  workflow?: SkillWorkflowStep[] | string | Record<string, any>;
  safetyAndSideEffects?: string | string[] | Record<string, any>;
  outputTemplate?: string;
  triggerExamples?: string[];
  parameters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SkillOwner {
  id: string;
  name: string | null;
  image: string | null;
  avatar: string | null;
  email: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  category?: string | null;
  avatar?: string | null;
  icon?: string | null;
  color?: string | null;
  version: string;
  ownerId?: string | null;
  schema?: AiSkillContent | null;
  metadata?: Record<string, any> | null;
  tags: string[];
  isActive: boolean;
  isPaused: boolean;
  isArchived: boolean;
  isShared: boolean;
  isBuiltIn: boolean;
  status?: string | null;
  visibility: "PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE" | "PUBLIC";
  createdAt: string | Date;
  updatedAt: string | Date;
  archivedAt?: string | Date | null;
  deletedAt?: string | Date | null;
  owner?: SkillOwner | null;
  _count?: {
    agentSkills: number;
    conversationSkills: number;
  };
}

export interface SkillFilterState {
  category?: string;
  scope?: SkillScope;
  status?: string;
  visibility?: string;
  isActive?: boolean;
}
