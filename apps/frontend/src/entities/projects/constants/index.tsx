import {
  INDUSTRY_OPTIONS,
  CURRENCY_OPTIONS,
  LANGUAGE_OPTIONS,
  MENTORSHIP_AREAS,
  EXPERTISE_AREAS,
  PRODUCT_CATEGORIES,
  TIMEZONE_OPTIONS,
  COUNTRY_OPTIONS
} from '@/constants/shares';

export const projectFields = [
  // Basic Info
  { name: "Project Name", id: "name", type: "text", required: true, maxLength: 100 },
  { name: "Description", id: "description", type: "textarea", required: true },
  { name: "Tagline", id: "tagline", type: "text", maxLength: 150, placeholder: "Brief catchy description" },
  { name: "Logo", id: "logo", type: "file", accept: ["image/*"], maxSize: 5 * 1024 * 1024 },
  { name: "Website", id: "website", type: "url" },

  // Project Details
  { name: "Stage", id: "stage", type: "select", required: true, options: [
    { value: 'IDEA', label: 'Idea' },
    { value: 'MVP', label: 'MVP' },
    { value: 'BETA', label: 'Beta' },
    { value: 'LAUNCHED', label: 'Launched' },
    { value: 'GROWTH', label: 'Growth' },
    { value: 'SCALE', label: 'Scale' },
    { value: 'EXIT', label: 'Exit' }
  ]},
  { name: "Industry", id: "industry", type: "multiselect", required: true, options: INDUSTRY_OPTIONS },
  { name: "Tags", id: "tags", type: "tags", maxTags: 10 },

  // Business Model
  { name: "Revenue Model", id: "revenueModel", type: "multiselect", options: [
    { value: 'SUBSCRIPTION', label: 'Subscription' },
    { value: 'FREEMIUM', label: 'Freemium' },
    { value: 'MARKETPLACE', label: 'Marketplace' },
    { value: 'ADVERTISING', label: 'Advertising' },
    { value: 'TRANSACTION_FEES', label: 'Transaction Fees' },
    { value: 'LICENSING', label: 'Licensing' },
    { value: 'SAAS', label: 'SaaS' },
    { value: 'ECOMMERCE', label: 'E-commerce' },
    { value: 'AFFILIATE', label: 'Affiliate' },
    { value: 'OTHER', label: 'Other' }
  ]},
  { name: "Target Market", id: "targetMarket", type: "textarea", required: true },
  { name: "Competitive Edge", id: "competitiveEdge", type: "textarea" },

  // Funding Info
  { name: "Funding Goal", id: "fundingGoal", type: "number", min: 0, step: 1000 },
  { name: "Funding Raised", id: "fundingRaised", type: "number", min: 0, step: 1000 },
  { name: "Valuation Cap", id: "valuationCap", type: "number", min: 0, step: 10000 },

  // Team & Hiring
  { name: "Team Size", id: "teamSize", type: "number", min: 1, max: 1000, default: 1 },
  { name: "Currently Hiring", id: "isHiring", type: "checkbox" },

  // Location & Remote
  { name: "Location", id: "location", type: "text" },
  { name: "Remote Friendly", id: "isRemoteFriendly", type: "checkbox", default: true },

  // Project Status
  { name: "Active", id: "isActive", type: "checkbox", default: true },
  { name: "Public", id: "isPublic", type: "checkbox", default: true },
  { name: "Launch Date", id: "launchedAt", type: "date" },
];

export const PROJECT_PROPOSAL_TYPES = [
  {
    label: 'Seeking Investors',
    value: 'SEEKING_INVESTORS',
    category: 'INVESTMENT',
    icon: '💰',
  },
  {
    label: 'Seeking Mentors',
    value: 'SEEKING_MENTORS',
    category: 'MENTORSHIP',
    icon: '🎓',
  },
  {
    label: 'Seeking Team Members',
    value: 'SEEKING_TEAM',
    category: 'TEAM',
    icon: '👥',
  },
  {
    label: 'Seeking Co-founders',
    value: 'SEEKING_COFOUNDERS',
    category: 'COFOUNDER',
    icon: '🤝',
  },
  {
    label: 'Seeking Partners',
    value: 'SEEKING_PARTNERS',
    category: 'PARTNERSHIP',
    icon: '🔗',
  },
  {
    label: 'Seeking Customers',
    value: 'SEEKING_CUSTOMERS',
    category: 'CUSTOMER',
    icon: '🎯',
  },
] as const;

export enum ProposalType {
  INVESTMENT = "INVESTMENT",
  MENTORSHIP = "MENTORSHIP",
  TEAM = "TEAM",
  COFOUNDER = "COFOUNDER",
  PARTNERSHIP = "PARTNERSHIP",
  CUSTOMER = "CUSTOMER",
}
