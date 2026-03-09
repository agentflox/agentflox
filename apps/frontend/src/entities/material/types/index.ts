export type MaterialListItem = {
	id: string;
	title: string;
	description?: string | null;
	category?: string | null;
	priceUsd?: number | null;
	isPublic?: boolean | null;
	fileUrl?: string | null;
	externalUrl?: string | null;
	ownerId?: string;
	updatedAt?: string | Date | null;
};



