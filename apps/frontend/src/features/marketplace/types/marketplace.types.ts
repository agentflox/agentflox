export type ListingType = 
  | 'task' 
  | 'team' 
  | 'project' 
  | 'talent' 
  | 'agent' 
  | 'tool' 
  | 'template'
  | 'workforce';

export type ListingStatus = 'active' | 'paused' | 'closed' | 'expired';
export type AssetState = 'locked' | 'ejected' | 'outdated';
export type ProvisioningStatus = 'pending' | 'provisioning' | 'completed' | 'failed';

export interface AuthorProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  verified?: boolean;
  isVerified?: boolean;
  role?: string;
}

export interface MatchDetails {
  score: number; // 0 to 100
  factors: {
    skillsMatch: number; // e.g., 4 (out of 5)
    skillsTotal: number; // e.g., 5
    budgetFits: boolean;
    remoteOk: boolean;
    availabilityMatch: boolean;
  };
}

export interface RatingsBreakdown {
  average: number;
  totalReviews: number;
  quality: number;
  communication: number;
  delivery: number;
}

export interface MarketplaceOrder {
  id: string;
  listingId: string;
  buyerId: string;
  creditAmount: number;
  stripeIntentId?: string; // For future expansion
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

export interface MarketplaceListing {
  id: string;
  type: ListingType;
  status: ListingStatus;
  title: string;
  description: string;
  category?: string | null;
  tags?: string[];
  author: AuthorProfile;
  createdAt: string;
  
  // Pricing Model
  isFree?: boolean;
  priceCredits?: number;
  pricingModel?: "fixed" | "hourly" | string;
  coverImage?: string | null;
  attachmentUrls?: string[];

  // Tagging & Match Info
  skills: string[];
  budget?: { min: number; max: number; currency: string } | string;
  location?: string;
  isRemote?: boolean;
  
  // Social Layer
  ratings?: RatingsBreakdown;
  commentCount: number;
  isSaved?: boolean;
  
  // Specific to 'Asset' variants (Agents, Tools, Templates)
  downloadCount?: number;
  version?: string;
  assetState?: AssetState; // Injected locally after download
  sourceId?: string; // If this is a downloaded asset, points to original
  
  // Specific to 'Opportunity' variants
  applyCount?: number;
  intent?: string | null;
  applicationSchema?: {
    fields?: Array<{
      id: string;
      type: string;
      label: string;
      required?: boolean;
      placeholder?: string;
      description?: string;
      options?: string[];
    }>;
  } | null;
  proposalSchema?: {
    fields?: Array<{
      id: string;
      type: string;
      label: string;
      required?: boolean;
      placeholder?: string;
      description?: string;
      options?: string[];
    }>;
  } | null;
}

export interface MarketplaceApplication {
  id: string;
  listingId: string;
  applicantId: string;
  pitch: string;
  targetRate?: string;
  estimatedDuration?: string;
  proposalText?: string;
  answers?: Record<string, unknown> | null;
  provisioningStatus: ProvisioningStatus;
  createdAt: string;
}

export interface MarketplaceSearchIntent {
  query: string;
  inferredCategory?: ListingType;
  inferredSkills: string[];
  inferredDuration?: string;
}
