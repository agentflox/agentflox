export type DocumentListItem = {
	id: string;
	title: string;
	description?: string | null;
	workspaceId: string;
	parentId?: string | null;
	createdBy?: string;
	createdAt?: string | Date | null;
	updatedAt?: string | Date | null;
	isArchived?: boolean;
	icon?: string | null;
	creator?: {
		id: string;
		name: string;
		avatar?: string | null;
	};
	children?: any[];
};


