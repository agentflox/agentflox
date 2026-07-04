export type ResourceType = "document" | "tool" | "template" | "agent" | "workforce";

export interface ResourceItem {
  id: string;
  name: string;
  type: ResourceType;
  workspaceId?: string | null;
  spaceId?: string | null;
}

export type Resource = ResourceItem;
