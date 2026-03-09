export type WorkspaceListItem = {
	id: string;
	name: string;
	description?: string | null;
	isActive?: boolean | null;
	updatedAt?: string | Date | null;
	ownerId?: string;
	_count?: {
		members?: number;
		projects?: number;
		teams?: number;
		tasks?: number;
		channels?: number;
	};
};



