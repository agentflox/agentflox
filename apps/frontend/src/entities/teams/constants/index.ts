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

export const teamFields = [
  // Basic Info
  { name: "Team Name", id: "name", type: "text", required: true, maxLength: 100 },
  { name: "Description", id: "description", type: "textarea", required: true },
  { name: "Avatar", id: "avatar", type: "file", accept: ["image/*"], maxSize: 3 * 1024 * 1024 },

  // Team Details
  { name: "Team Type", id: "teamType", type: "select", required: true, options: [
    { value: 'DEVELOPMENT', label: 'Development' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'SALES', label: 'Sales' },
    { value: 'DESIGN', label: 'Design' },
    { value: 'ADVISORY', label: 'Advisory' },
    { value: 'GENERAL', label: 'General' }
  ]},
  { name: "Industry Focus", id: "industry", type: "multiselect", options: INDUSTRY_OPTIONS },
  { name: "Required Skills", id: "skills", type: "tags", maxTags: 15 },

  // Team Status
  { name: "Active", id: "isActive", type: "checkbox", default: true },
  { name: "Currently Hiring", id: "isHiring", type: "checkbox" },
  { name: "Current Size", id: "size", type: "number", min: 1, max: 100, default: 1 },
  { name: "Maximum Size", id: "maxSize", type: "number", min: 1, max: 500 },

  // Location
  { name: "Location", id: "location", type: "text" },
  { name: "Remote Team", id: "isRemote", type: "checkbox", default: true },
];

export const TEAM_PROPOSAL_TYPES = [
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
  }
] as const;
