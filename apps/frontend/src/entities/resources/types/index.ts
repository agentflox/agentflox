export type ResourceListItem = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priceUsd?: number | null;
  isPublic?: boolean | null;
  isFeatured?: boolean | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  externalUrl?: string | null;
  ownerId?: string;
  updatedAt?: string | Date | null;
};

export type Resource = {
  id: string;
  ownerId: string;
  workspaceId?: string | null;
  spaceId?: string | null;
  parentId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  excerpt?: string | null;
  content?: any;
  category?: string | null;
  type: string;
  tags?: string[];
  priceUsd: number;
  currency: string;
  visibility: "PUBLIC" | "PRIVATE" | "WORKSPACE" | "TEAM" | "PROJECT" | "MEMBERS_ONLY";
  isPublic: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  requiresAuth: boolean;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED" | "DELETED";
  version: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[];
  externalUrl?: string | null;
  sourceUrl?: string | null;
  documentationUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  thumbnailUrl?: string | null;
  viewCount: number;
  downloadCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  averageRating?: number | null;
  metadata?: any;
  settings?: any;
  license?: string | null;
  attribution?: string | null;
  copyrightYear?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  publishedAt?: string | Date | null;
  archivedAt?: string | Date | null;
  deletedAt?: string | Date | null;
  lastViewedAt?: string | Date | null;
  owner?: {
    id: string;
    name?: string | null;
    username?: string | null;
    image?: string | null;
  } | null;
};

export type ResourceVersion = {
  id: string;
  resourceId: string;
  version: number;
  title: string;
  content?: any;
  changeLog?: string | null;
  createdBy: string;
  createdAt: string | Date;
  creator?: {
    id: string;
    name?: string | null;
    image?: string | null;
  } | null;
};

export type ResourceFilterValues = {
  query?: string;
  category?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "DELETED";
  scope?: "owned" | "public" | "all";
  page: number;
  pageSize: number;
};



