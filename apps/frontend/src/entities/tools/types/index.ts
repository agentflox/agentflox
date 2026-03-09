export type ToolListItem = {
	id: string;
	name: string;
	description?: string | null;
	category?: string | null;
	productUrl?: string | null;
	isPublic?: boolean | null;
	ownerId?: string;
	updatedAt?: string | Date | null;
	workspaceId?: string | null;
	isComposite?: boolean | null;
};



