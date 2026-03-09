export type SpaceListItem = {
	id: string;
	name: string;
	description?: string | null;
	workspaceId: string;
	isActive?: boolean | null;
	createdBy?: string;
	updatedAt?: string | Date | null;
	workspace?: {
		id: string;
		name: string;
	} | null;
	_count?: {
		members?: number;
		tools?: number;
		materials?: number;
		lists?: number;
	};
};


