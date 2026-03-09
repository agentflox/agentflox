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

// Universal fields
const universalFields = [
  { name: "Title", id: "title", type: "text", maxLength: 200, required: true },
  { name: "Short Summary", id: "shortSummary", type: "textarea", maxLength: 500, required: true },
  { name: "Detailed Description", id: "detailedDesc", type: "textarea", required: true },
  { name: "Industry", id: "industry", type: "multiselect", options: INDUSTRY_OPTIONS, required: true },
  { name: "Keywords", id: "keywords", type: "tags", maxTags: 10 },
  // Location
  { name: "Country", id: "location.country", type: "select", options: COUNTRY_OPTIONS, required: true },
  { name: "City", id: "location.city", type: "text" },

  // Timeline
  { name: "Start Date", id: "timeline.startDate", type: "date" },
  { name: "End Date", id: "timeline.endDate", type: "date" },
  { name: "Duration", id: "timeline.duration", type: "text", placeholder: "e.g., 3 months, ongoing" },
  { name: "Urgency", id: "timeline.urgency", type: "select", options: [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
  ] },

  // Contact
  { name: "Contact Name", id: "contact.name", type: "text", required: true },
  { name: "Contact Email", id: "contact.email", type: "email", required: true },
  { name: "Contact Phone", id: "contact.phone", type: "tel" },
  { name: "Website", id: "contact.website", type: "url" },
  { name: "LinkedIn", id: "contact.linkedin", type: "url" },
  { name: "Preferred Contact", id: "contact.preferredContact", type: "select", options: [
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'LINKEDIN', label: 'LinkedIn' }
  ] },
  // Budget
  { name: "Min Amount", id: "budget.minAmount", type: "number", min: 0 },
  { name: "Max Amount", id: "budget.maxAmount", type: "number", min: 0 },
  { name: "Currency", id: "budget.currency", type: "select", options: CURRENCY_OPTIONS, default: 'USD' },
  { name: "Budget Description", id: "budget.description", type: "textarea" },

  // Attachments
  { name: "Attachments", id: "attachments", type: "file", multiple: true, accept: [
      "application/pdf",
      "image/*",
      "video/*",
      "audio/*",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ],
    description: "Upload supporting files (PDF, images, docs, videos, etc.)"
  },

  // Settings
  { name: "Visibility", id: "visibility", type: "select", options: [
    { value: 'PUBLIC', label: 'Public' },
    { value: 'PRIVATE', label: 'Private' },
    { value: 'MEMBERS_ONLY', label: 'Members Only' }
  ] },
  { name: "Expires At", id: "expiresAt", type: "date" }
];

const investorFields = [
  { name: "Funding Needed", id: "fundingNeeded", type: "number", min: 0, required: true },
  { name: "Funding Type", id: "fundingType", type: "select", options: [
    { value: 'EQUITY', label: 'Equity' },
    { value: 'CONVERTIBLE_NOTE', label: 'Convertible Note' },
    { value: 'SAFE', label: 'SAFE' },
    { value: 'LOAN', label: 'Loan' },
    { value: 'GRANT', label: 'Grant' }
  ], required: true },
  { name: "Stage", id: "stage", type: "select", options: [
    { value: 'IDEA', label: 'Idea' },
    { value: 'PROTOTYPE', label: 'Prototype' },
    { value: 'MVP', label: 'MVP' },
    { value: 'GROWTH', label: 'Growth' },
    { value: 'SCALING', label: 'Scaling' }
  ], required: true },
  { name: "Current Revenue", id: "currentRevenue", type: "number", min: 0 },
  { name: "Projected Revenue", id: "projectedRevenue", type: "number", min: 0 },
  { name: "Customers", id: "customers", type: "number", min: 0 },
  { name: "Monthly Users", id: "monthlyUsers", type: "number", min: 0 },
  { name: "Growth Rate", id: "growthRate", type: "number", min: 0, suffix: '%' },
  { name: "Team Size", id: "teamSize", type: "number", min: 1 },
  { name: "Founded Date", id: "foundedDate", type: "date" },
  { name: "Use of Funds", id: "useOfFunds", type: "textarea", placeholder: "Describe how you plan to use the investment...", required: true },
  { name: "Equity Offered", id: "equityOffered", type: "number", min: 0, max: 100, suffix: '%' },
  { name: "Min Investment", id: "minInvestment", type: "number", min: 0 },
  { name: "Max Investment", id: "maxInvestment", type: "number", min: 0 },
  { name: "Board Seat", id: "boardSeat", type: "boolean" },
  { name: "Expected ROI", id: "expectedROI", type: "number", min: 0, suffix: 'x' },
  { name: "Investor Type", id: "investorType", type: "multiselect", options: [
    { value: 'ANGEL', label: 'Angel' },
    { value: 'VC', label: 'VC' },
    { value: 'STRATEGIC', label: 'Strategic' },
    { value: 'CROWDFUNDING', label: 'Crowdfunding' },
    { value: 'GOVERNMENT', label: 'Government' },
    { value: 'FAMILY_OFFICE', label: 'Family Office' }
  ] },
  { name: "Exit Strategy", id: "exitStrategy", type: "textarea" }
];

const mentorFields = [
  { name: "Seeking or Offering", id: "seekingOrOffering", type: "radio", options: [
    { value: 'SEEKING_MENTORSHIP', label: 'Seeking Mentor' },
    { value: 'OFFERING_MENTORSHIP', label: 'Offering Mentor' }
  ], required: true },
  { name: "Gidance Areas", id: "gidanceAreas", type: "multiselect", options: MENTORSHIP_AREAS, required: true },
  { name: "Specific Challenges", id: "specificChallenges", type: "textarea", placeholder: "Describe specific challenges you need help with..." },
  { name: "Current Stage", id: "currentStage", type: "select", options: [
    { value: 'IDEA', label: 'Idea' },
    { value: 'PROTOTYPE', label: 'Prototype' },
    { value: 'MVP', label: 'MVP' },
    { value: 'GROWTH', label: 'Growth' },
    { value: 'SCALING', label: 'Scaling' }
  ] },
  { name: "Preferred Mentor Background", id: "preferredMentorBackground", type: "multiselect", options: INDUSTRY_OPTIONS },
  { name: "Expertise Areas", id: "expertiseAreas", type: "multiselect", options: EXPERTISE_AREAS },
  { name: "Years Experience", id: "yearsExperience", type: "number", min: 0 },
  { name: "Industries Served", id: "industriesServed", type: "multiselect", options: INDUSTRY_OPTIONS },
  { name: "Success Stories", id: "successStories", type: "textarea" },
  { name: "Mentees Criteria", id: "menteesCriteria", type: "textarea" },
  { name: "Preferred Engagement", id: "preferredEngagement", type: "select", options: [
    { value: 'ADVISORY', label: 'Advisory' },
    { value: 'BOARD_MEMBER', label: 'Board Member' },
    { value: 'OCCASIONAL_CALLS', label: 'Occasional Calls' },
    { value: 'ONGOING_SUPPORT', label: 'Ongoing Support' }
  ] },
  { name: "Session Frequency", id: "sessionFrequency", type: "select", options: [
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Bi-weekly', label: 'Bi-weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'As needed', label: 'As needed' }
  ] },
  { name: "Compensation Expectation", id: "compensationExpectation", type: "select", options: [
    { value: 'FREE', label: 'Free' },
    { value: 'EQUITY', label: 'Equity' },
    { value: 'ADVISORY_SHARES', label: 'Advisory Shares' },
    { value: 'PAID', label: 'Paid' },
    { value: 'BARTER', label: 'Barter' }
  ] }
];

const teamFields = [
  { name: "Project", id: "projectId", type: "select", options: [], required: true, description: "Select the project for this team role" },
  { name: "Hiring or Seeking", id: "hiringOrSeeking", type: "radio", options: [
    { value: 'HIRING', label: 'Hiring' },
    { value: 'SEEKING_POSITION', label: 'Seeking Position' }
  ], required: true },
  { name: "Role Title", id: "roleTitle", type: "text", required: true },
  { name: "Department", id: "department", type: "select", options: [
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Design', label: 'Design' },
    { value: 'Other', label: 'Other' }
  ] },
  { name: "Seniority", id: "seniority", type: "select", options: [
    { value: 'INTERN', label: 'Intern' },
    { value: 'JUNIOR', label: 'Junior' },
    { value: 'MID_LEVEL', label: 'Mid Level' },
    { value: 'SENIOR', label: 'Senior' },
    { value: 'LEAD', label: 'Lead' },
    { value: 'PRINCIPAL', label: 'Principal' },
    { value: 'DIRECTOR', label: 'Director' },
    { value: 'VP', label: 'VP' },
    { value: 'C_LEVEL', label: 'C-Level' }
  ] },
  { name: "Must Have Skills", id: "mustHaveSkills", type: "tags", required: true },
  { name: "Nice to Have Skills", id: "niceToHaveSkills", type: "tags" },
  { name: "Certifications", id: "certifications", type: "tags" },
  { name: "Languages Required", id: "languagesRequired", type: "multiselect", options: LANGUAGE_OPTIONS },
  { name: "Work Arrangement", id: "workArrangement", type: "select", options: [
    { value: 'REMOTE', label: 'Remote' },
    { value: 'ONSITE', label: 'Onsite' },
    { value: 'HYBRID', label: 'Hybrid' }
  ], default: 'HYBRID' },
  { name: "Compensation Type", id: "compensationType", type: "select", options: [
    { value: 'SALARY', label: 'Salary' },
    { value: 'EQUITY', label: 'Equity' },
    { value: 'VOLUNTEER', label: 'Volunteer' },
    { value: 'INTERNSHIP', label: 'Internship' }
  ] },
  { name: "Salary Min", id: "salaryRange.min", type: "number", min: 0 },
  { name: "Salary Max", id: "salaryRange.max", type: "number", min: 0 },
  { name: "Salary Currency", id: "salaryRange.currency", type: "select", options: CURRENCY_OPTIONS },
  { name: "Benefits", id: "benefits", type: "multiselect", options: [
    { value: 'Health Insurance', label: 'Health Insurance' },
    { value: 'Dental', label: 'Dental' },
    { value: '401k', label: '401k' },
    { value: 'Stock Options', label: 'Stock Options' },
    { value: 'Flexible Hours', label: 'Flexible Hours' },
    { value: 'Remote Work', label: 'Remote Work' },
    { value: 'Learning Budget', label: 'Learning Budget' }
  ] },
  { name: "Company Size", id: "companySize", type: "select", options: [
    { value: 'STARTUP_1_10', label: 'Startup (1-10)' },
    { value: 'SMALL_11_50', label: 'Small (11-50)' },
    { value: 'MEDIUM_51_200', label: 'Medium (51-200)' },
    { value: 'LARGE_201_1000', label: 'Large (201-1000)' },
    { value: 'ENTERPRISE_1000_PLUS', label: 'Enterprise (1000+)' }
  ] },
  { name: "Company Stage", id: "companyStage", type: "select", options: [
    { value: 'IDEA', label: 'Idea' },
    { value: 'PROTOTYPE', label: 'Prototype' },
    { value: 'MVP', label: 'MVP' },
    { value: 'GROWTH', label: 'Growth' },
    { value: 'SCALING', label: 'Scaling' }
  ] },
  { name: "Team Culture", id: "teamCulture", type: "textarea" }
];

const cofounderFields = [
  { name: "Seeking or Offering", id: "seekingOrOffering", type: "radio", options: [
    { value: 'SEEKING_COFOUNDER', label: 'Seeking Co-founder' },
    { value: 'OFFERING_COFOUNDING', label: 'Offering Cofounding' }
  ], required: true },
  { name: "Role Title", id: "roleTitle", type: "text", required: true },
  { name: "Key Responsibilities", id: "keyResponsibilities", type: "tags", required: true },
  { name: "Decision Areas", id: "decisionAreas", type: "tags" },
  { name: "Equity Offered", id: "equityOffered", type: "number", min: 0, max: 100, suffix: '%' },
  { name: "Equity Expected", id: "equityExpected", type: "number", min: 0, max: 100, suffix: '%' },
  { name: "Vesting Schedule", id: "vestingSchedule", type: "select", options: [
    { value: '4 years, 1 year cliff', label: '4 years, 1 year cliff' },
    { value: '3 years, 6 month cliff', label: '3 years, 6 month cliff' },
    { value: '5 years, 1 year cliff', label: '5 years, 1 year cliff' },
    { value: 'Custom', label: 'Custom' }
  ], default: '4 years, 1 year cliff' },
  { name: "Time Commitment", id: "timeCommitment", type: "select", options: [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time (30+ hours)', label: 'Part-time (30+ hours)' },
    { value: 'Part-time (20-30 hours)', label: 'Part-time (20-30 hours)' },
    { value: 'Part-time (<20 hours)', label: 'Part-time (<20 hours)' }
  ], required: true },
  { name: "Required Skills", id: "requiredSkills", type: "tags", required: true },
  { name: "Preferred Background", id: "preferredBackground", type: "multiselect", options: INDUSTRY_OPTIONS },
  { name: "Must Have Experience", id: "mustHaveExperience", type: "tags" },
  { name: "Personality Traits", id: "personalityTraits", type: "multiselect", options: [
    { value: 'Leadership', label: 'Leadership' },
    { value: 'Analytical', label: 'Analytical' },
    { value: 'Creative', label: 'Creative' },
    { value: 'Detail-oriented', label: 'Detail-oriented' },
    { value: 'Risk-taker', label: 'Risk-taker' },
    { value: 'Collaborative', label: 'Collaborative' },
    { value: 'Independent', label: 'Independent' }
  ] },
  { name: "Business Stage", id: "businessStage", type: "select", options: [
    { value: 'IDEA', label: 'Idea' },
    { value: 'PROTOTYPE', label: 'Prototype' },
    { value: 'MVP', label: 'MVP' },
    { value: 'GROWTH', label: 'Growth' },
    { value: 'SCALING', label: 'Scaling' }
  ] },
  { name: "Current Team Size", id: "currentTeamSize", type: "number", min: 1 },
  { name: "Business Model", id: "businessModel", type: "textarea" },
  { name: "Target Market", id: "targetMarket", type: "textarea" },
  { name: "Work Style", id: "workStyle", type: "textarea" },
  { name: "Company Values", id: "companyValues", type: "tags" },
  { name: "Conflict Resolution", id: "conflictResolution", type: "textarea" }
];

const partnerFields = [
  { name: "Seeking or Offering", id: "seekingOrOffering", type: "radio", options: [
    { value: 'SEEKING_PARTNER', label: 'Seeking Partner' },
    { value: 'OFFERING_PARTNERSHIP', label: 'Offering Partnership' }
  ], required: true },
  { name: "Partnership Type", id: "partnershipType", type: "select", options: [
    { value: 'STRATEGIC', label: 'Strategic' },
    { value: 'DISTRIBUTION', label: 'Distribution' },
    { value: 'TECHNOLOGY', label: 'Technology' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'SUPPLY_CHAIN', label: 'Supply Chain' },
    { value: 'RESELLER', label: 'Reseller' }
  ], required: true },
  { name: "Value Offered", id: "valueOffered", type: "textarea", required: true },
  { name: "Value Expected", id: "valueExpected", type: "textarea", required: true },
  { name: "Mutual Benefits", id: "mutualBenefits", type: "tags" },
  { name: "Partnership Model", id: "partnershipModel", type: "select", options: [
    { value: 'REVENUE_SHARE', label: 'Revenue Share' },
    { value: 'FIXED_FEE', label: 'Fixed Fee' },
    { value: 'COMMISSION_BASED', label: 'Commission Based' },
    { value: 'EQUITY_BASED', label: 'Equity Based' },
    { value: 'BARTER', label: 'Barter' },
    { value: 'JOINT_VENTURE', label: 'Joint Venture' }
  ] },
  { name: "Revenue Sharing", id: "revenueSharing", type: "number", min: 0, max: 100, suffix: '%' },
  { name: "Exclusivity", id: "exclusivity", type: "select", options: [
    { value: 'EXCLUSIVE', label: 'Exclusive' },
    { value: 'NON_EXCLUSIVE', label: 'Non-exclusive' },
    { value: 'SEMI_EXCLUSIVE', label: 'Semi-exclusive' }
  ], default: 'NON_EXCLUSIVE' },
  { name: "Duration", id: "duration", type: "select", options: [
    { value: 'SHORT_TERM', label: 'Short Term' },
    { value: 'LONG_TERM', label: 'Long Term' },
    { value: 'PROJECT_BASED', label: 'Project Based' }
  ] },
  { name: "Partner Criteria", id: "partnerCriteria", type: "textarea" },
  { name: "Minimum Requirements", id: "minimumRequirements", type: "tags" },
  { name: "Ideal Partner Profile", id: "idealPartnerProfile", type: "textarea" },
  { name: "Current Partners", id: "currentPartners", type: "number", min: 0 },
  { name: "Market Reach", id: "marketReach", type: "multiselect", options: COUNTRY_OPTIONS },
  { name: "Customer Base", id: "customerBase", type: "number", min: 0 },
  { name: "Annual Revenue", id: "annualRevenue", type: "number", min: 0 }
];

const customerFields = [
  { name: "Selling or Buying", id: "sellingOrBuying", type: "radio", options: [
    { value: 'SELLING', label: 'Selling' },
    { value: 'BUYING', label: 'Buying' }
  ], required: true },
  { name: "Product/Service", id: "productService", type: "text", required: true },
  { name: "Category", id: "category", type: "select", options: PRODUCT_CATEGORIES, required: true },
  { name: "Description", id: "description", type: "textarea", required: true },
  { name: "Pricing Model", id: "pricingModel", type: "select", options: [
    { value: 'SUBSCRIPTION', label: 'Subscription' },
    { value: 'ONE_TIME', label: 'One Time' },
    { value: 'FREEMIUM', label: 'Freemium' },
    { value: 'PAY_PER_USE', label: 'Pay Per Use' }
  ] },
  { name: "Price Min", id: "priceRange.min", type: "number", min: 0 },
  { name: "Price Max", id: "priceRange.max", type: "number", min: 0 },
  { name: "Price Currency", id: "priceRange.currency", type: "select", options: CURRENCY_OPTIONS },
  { name: "Availability", id: "availability", type: "select", options: [
    { value: 'PROTOTYPE', label: 'Prototype' },
    { value: 'BETA', label: 'Beta' },
    { value: 'LAUNCHED', label: 'Launched' },
    { value: 'SCALING', label: 'Scaling' }
  ] },
  { name: "Delivery Time", id: "deliveryTime", type: "text" },
  { name: "Target Audience", id: "targetAudience", type: "textarea" },
  { name: "Customer Benefits", id: "customerBenefits", type: "tags" },
  { name: "Unique Selling Proposition", id: "uniqueSellingProposition", type: "textarea" },
  { name: "Previous Clients", id: "previousClients", type: "number", min: 0 },
  { name: "Testimonials", id: "testimonials", type: "textarea" },
  { name: "Requirements", id: "requirements", type: "tags" },
  { name: "Budget Min", id: "budgetRange.min", type: "number", min: 0 },
  { name: "Budget Max", id: "budgetRange.max", type: "number", min: 0 },
  { name: "Budget Currency", id: "budgetRange.currency", type: "select", options: CURRENCY_OPTIONS },
  { name: "Decision Criteria", id: "decisionCriteria", type: "tags" },
  { name: "Timeframe", id: "timeframe", type: "text" },
  { name: "Support Included", id: "supportIncluded", type: "multiselect", options: [
    { value: 'Documentation', label: 'Documentation' },
    { value: '24/7 Support', label: '24/7 Support' },
    { value: 'Training', label: 'Training' },
    { value: 'Implementation', label: 'Implementation' },
    { value: 'Maintenance', label: 'Maintenance' }
  ] },
  { name: "Warranty Terms", id: "warrantyTerms", type: "textarea" },
  { name: "Payment Terms", id: "paymentTerms", type: "select", options: [
    { value: 'Net 30', label: 'Net 30' },
    { value: 'Net 60', label: 'Net 60' },
    { value: 'Upfront', label: 'Upfront' },
    { value: '50/50 Split', label: '50/50 Split' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Custom', label: 'Custom' }
  ] }
];

const PROPOSAL_TYPES = [
    { type: "investment", title: "Seeking Investors", description: "Raise funding for your startup", icon: "💰", color: "bg-green-500" },
    { type: "mentorship", title: "Finding Mentors", description: "Get gidance from experienced professionals", icon: "🎯", color: "bg-blue-500" },
    { type: "team", title: "Building Team", description: "Recruit talented team members", icon: "👥", color: "bg-purple-500" },
    { type: "cofounder", title: "Finding Co-founders", description: "Partner with like-minded entrepreneurs", icon: "🤝", color: "bg-orange-500" },
    { type: "partnership", title: "Strategic Partners", description: "Form business partnerships", icon: "🔗", color: "bg-indigo-500" },
    { type: "customer", title: "Acquiring Customers", description: "Find your first customers", icon: "🎪", color: "bg-pink-500" },
];

enum ProposalIntent {
  SEEKING = "SEEKING",
  OFFERING = "OFFERING",
}

export {
  ProposalIntent,
  PROPOSAL_TYPES,
  universalFields,
  investorFields,
  mentorFields,
  teamFields,
  cofounderFields,
  partnerFields,
  customerFields
};




