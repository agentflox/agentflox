import { z } from 'zod';
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

// Base validation schemas
const baseLocationSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  city: z.string().optional(),
  remote: z.boolean().optional(),
  hybrid: z.boolean().optional(),
  willRelocate: z.boolean().optional(),
  timeZones: z.array(z.string()).optional()
});

const baseTimelineSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.string().optional(),
  commitment: z.enum(['PART_TIME', 'FULL_TIME', 'FLEXIBLE']).optional(),
  availability: z.string().optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
});

const baseContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  phone: z.string().optional(),
  website: z.url().optional().or(z.literal('')),
  linkedin: z.url().optional().or(z.literal('')),
  preferredContact: z.enum(['EMAIL', 'PHONE', 'LINKEDIN']).optional()
});

const baseBudgetSchema = z.object({
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  currency: z.enum(CURRENCY_OPTIONS.map(opt => opt.value) as [string, ...string[]]).default('USD'),
  description: z.string().optional()
});

// Universal fields schema
const universalFieldsSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  shortSummary: z.string().min(1, 'Short summary is required').max(500, 'Summary must be less than 500 characters'),
  detailedDesc: z.string().min(1, 'Detailed description is required'),
  industry: z.array(z.string()).min(1, 'At least one industry must be selected'),
  keywords: z.array(z.string()).max(10, 'Maximum 10 keywords allowed').optional(),
  location: baseLocationSchema,
  timeline: baseTimelineSchema,
  contact: baseContactSchema,
  budget: baseBudgetSchema,
  language: z.enum(LANGUAGE_OPTIONS.map(l => l.value) as [string, ...string[]]).default('en'),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'MEMBERS_ONLY']).optional(),
  expiresAt: z.string().optional(),

  // ✅ Attachments validation
  attachments: z
    .array(
      z
        .any() // could be File in browser or object after upload
        .refine((file: File) => file instanceof File, { message: 'Invalid file type' })
        .refine((file: File) => file.size <= 10 * 1024 * 1024, { message: 'File must be less than 10MB' })
        .refine((file: File) =>
          [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/gif",
            "video/mp4",
            "audio/mpeg",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          ].includes(file.type),
          { message: 'Unsupported file type' }
        )
    )
    .max(10, 'Maximum 10 attachments allowed')
    .optional()
});

// Investor-specific fields schema
const investorFieldsSchema = z.object({
  fundingNeeded: z.number().min(0, 'Funding amount must be positive'),
  fundingType: z.enum(['EQUITY', 'CONVERTIBLE_NOTE', 'SAFE', 'LOAN', 'GRANT']),
  stage: z.enum(['IDEA', 'PROTOTYPE', 'MVP', 'GROWTH', 'SCALING']),
  currentRevenue: z.number().min(0).optional(),
  projectedRevenue: z.number().min(0).optional(),
  customers: z.number().min(0).optional(),
  monthlyUsers: z.number().min(0).optional(),
  growthRate: z.number().min(0).max(100).optional(),
  teamSize: z.number().min(1).optional(),
  foundedDate: z.string().optional(),
  useOfFunds: z.string().min(1, 'Use of funds description is required'),
  equityOffered: z.number().min(0).max(100).optional(),
  minInvestment: z.number().min(0).optional(),
  maxInvestment: z.number().min(0).optional(),
  boardSeat: z.boolean().optional(),
  expectedROI: z.number().min(0).optional(),
  investorType: z.array(z.enum(['ANGEL', 'VC', 'STRATEGIC', 'CROWDFUNDING', 'GOVERNMENT', 'FAMILY_OFFICE'])).optional(),
  exitStrategy: z.string().optional()
});

// Mentor-specific fields schema
const mentorFieldsSchema = z.object({
  seekingOrOffering: z.enum(['SEEKING_MENTORSHIP', 'OFFERING_MENTORSHIP']),
  guidanceAreas: z.array(z.string()).min(1, 'At least one guidance area must be selected').optional(),
  specificChallenges: z.string().optional(),
  currentStage: z.enum(['IDEA', 'PROTOTYPE', 'MVP', 'GROWTH', 'SCALING']).optional(),
  preferredMentorBackground: z.array(z.string()).optional(),
  expertiseAreas: z.array(z.string()).optional(),
  yearsExperience: z.number().min(0).optional(),
  industriesServed: z.array(z.string()).optional(),
  successStories: z.string().optional(),
  menteesCriteria: z.string().optional(),
  preferredEngagement: z.enum(['ADVISORY', 'BOARD_MEMBER', 'OCCASIONAL_CALLS', 'ONGOING_SUPPORT']).optional(),
  sessionFrequency: z.enum(['Weekly', 'Bi-weekly', 'Monthly', 'As needed']).optional(),
  compensationExpectation: z.enum(['FREE', 'EQUITY', 'ADVISORY_SHARES', 'PAID', 'BARTER']).optional()
});

// Team-specific fields schema
const teamFieldsSchema = z.object({
  hiringOrSeeking: z.enum(['HIRING', 'SEEKING_POSITION']),
  teamId: z.string().optional(),
  roleTitle: z.string().min(1, 'Role title is required'),
  department: z.enum(['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'Design', 'Other']).optional(),
  seniority: z.enum(['INTERN', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'LEAD', 'PRINCIPAL', 'DIRECTOR', 'VP', 'C_LEVEL']).optional(),
  mustHaveSkills: z.array(z.string()).min(1, 'At least one required skill must be specified'),
  niceToHaveSkills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  languagesRequired: z.array(z.string()).optional(),
  workArrangement: z.enum(['REMOTE', 'ONSITE', 'HYBRID']).default('HYBRID'),
  compensationType: z.enum(['SALARY', 'EQUITY', 'VOLUNTEER', 'INTERNSHIP']).optional(),
  salaryRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    currency: z.enum(CURRENCY_OPTIONS.map(opt => opt.value) as [string, ...string[]]).optional()
  }).optional(),
  benefits: z.array(z.string()).optional(),
  companySize: z.enum(['STARTUP_1_10', 'SMALL_11_50', 'MEDIUM_51_200', 'LARGE_201_1000', 'ENTERPRISE_1000_PLUS']).optional(),
  companyStage: z.enum(['IDEA', 'PROTOTYPE', 'MVP', 'GROWTH', 'SCALING']).optional(),
  teamCulture: z.string().optional()
});

// Cofounder-specific fields schema
const cofounderFieldsSchema = z.object({
  seekingOrOffering: z.enum(['SEEKING_COFOUNDER', 'OFFERING_COFOUNDING']),
  roleTitle: z.string().min(1, 'Role title is required'),
  keyResponsibilities: z.array(z.string()).min(1, 'At least one key responsibility must be specified'),
  decisionAreas: z.array(z.string()).optional(),
  equityOffered: z.number().min(0).max(100).optional(),
  equityExpected: z.number().min(0).max(100).optional(),
  vestingSchedule: z.string().default('4 years, 1 year cliff'),
  timeCommitment: z.enum(['Full-time', 'Part-time (30+ hours)', 'Part-time (20-30 hours)', 'Part-time (<20 hours)']),
  requiredSkills: z.array(z.string()).min(1, 'At least one required skill must be specified'),
  preferredBackground: z.array(z.string()).optional(),
  mustHaveExperience: z.array(z.string()).optional(),
  personalityTraits: z.array(z.string()).optional(),
  businessStage: z.enum(['IDEA', 'PROTOTYPE', 'MVP', 'GROWTH', 'SCALING']).optional(),
  currentTeamSize: z.number().min(1).optional(),
  businessModel: z.string().optional(),
  targetMarket: z.string().optional(),
  workStyle: z.string().optional(),
  companyValues: z.array(z.string()).optional(),
  conflictResolution: z.string().optional()
});

// Partner-specific fields schema
const partnerFieldsSchema = z.object({
  seekingOrOffering: z.enum(['SEEKING_PARTNER', 'OFFERING_PARTNERSHIP']),
  partnershipType: z.enum(['STRATEGIC', 'DISTRIBUTION', 'TECHNOLOGY', 'MARKETING', 'SUPPLY_CHAIN', 'RESELLER']),
  valueOffered: z.string().min(1, 'Value offered description is required'),
  valueExpected: z.string().min(1, 'Value expected description is required'),
  mutualBenefits: z.array(z.string()).optional(),
  partnershipModel: z.enum(['REVENUE_SHARE', 'FIXED_FEE', 'COMMISSION_BASED', 'EQUITY_BASED', 'BARTER', 'JOINT_VENTURE']).optional(),
  revenueSharing: z.number().min(0).max(100).optional(),
  exclusivity: z.enum(['EXCLUSIVE', 'NON_EXCLUSIVE', 'SEMI_EXCLUSIVE']).default('NON_EXCLUSIVE'),
  duration: z.enum(['SHORT_TERM', 'LONG_TERM', 'PROJECT_BASED']).optional(),
  partnerCriteria: z.string().optional(),
  minimumRequirements: z.array(z.string()).optional(),
  idealPartnerProfile: z.string().optional(),
  currentPartners: z.number().min(0).optional(),
  marketReach: z.array(z.string()).optional(),
  customerBase: z.number().min(0).optional(),
  annualRevenue: z.number().min(0).optional()
});

// Customer-specific fields schema
const customerFieldsSchema = z.object({
  sellingOrBuying: z.enum(['SELLING', 'BUYING']),
  productService: z.string().min(1, 'Product/service name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  pricingModel: z.enum(['SUBSCRIPTION', 'ONE_TIME', 'FREEMIUM', 'PAY_PER_USE']).optional(),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    currency: z.enum(CURRENCY_OPTIONS.map(opt => opt.value) as [string, ...string[]]).optional()
  }).optional(),
  availability: z.enum(['PROTOTYPE', 'BETA', 'LAUNCHED', 'SCALING']).optional(),
  deliveryTime: z.string().optional(),
  targetAudience: z.string().optional(),
  customerBenefits: z.array(z.string()).optional(),
  uniqueSellingProposition: z.string().optional(),
  previousClients: z.number().min(0).optional(),
  testimonials: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  budgetRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    currency: z.enum(CURRENCY_OPTIONS.map(opt => opt.value) as [string, ...string[]]).optional()
  }).optional(),
  decisionCriteria: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  supportIncluded: z.array(z.string()).optional(),
  warrantyTerms: z.string().optional(),
  paymentTerms: z.enum(['Net 30', 'Net 60', 'Upfront', '50/50 Split', 'Monthly', 'Custom']).optional()
});

// Combined schemas for each proposal type
export const investorProposalSchema = universalFieldsSchema.merge(investorFieldsSchema).extend({
  type: z.literal('investment').optional()
});
export const mentorProposalSchema = universalFieldsSchema.merge(mentorFieldsSchema).extend({
  type: z.literal('mentorship').optional()
});
export const teamProposalSchema = universalFieldsSchema.merge(teamFieldsSchema).extend({
  type: z.literal('team').optional(),
  teamId: z.string().min(1, 'Please select a team').optional()
});
export const cofounderProposalSchema = universalFieldsSchema.merge(cofounderFieldsSchema).extend({
  type: z.literal('cofounder').optional()
});
export const partnerProposalSchema = universalFieldsSchema.merge(partnerFieldsSchema).extend({
  type: z.literal('partnership').optional()
});
export const customerProposalSchema = universalFieldsSchema.merge(customerFieldsSchema).extend({
  type: z.literal('customer').optional()
});

// Union type for all proposal schemas
export const proposalSchema = z.discriminatedUnion('type', [
  investorProposalSchema.extend({ type: z.literal('investor') }),
  mentorProposalSchema.extend({ type: z.literal('mentor') }),
  teamProposalSchema.extend({ type: z.literal('team') }),
  cofounderProposalSchema.extend({ type: z.literal('cofounder') }),
  partnerProposalSchema.extend({ type: z.literal('partner') }),
  customerProposalSchema.extend({ type: z.literal('customer') })
]);

// Type exports
export type InvestorProposal = z.infer<typeof investorProposalSchema>;
export type MentorProposal = z.infer<typeof mentorProposalSchema>;
export type TeamProposal = z.infer<typeof teamProposalSchema>;
export type CofounderProposal = z.infer<typeof cofounderProposalSchema>;
export type PartnerProposal = z.infer<typeof partnerProposalSchema>;
export type CustomerProposal = z.infer<typeof customerProposalSchema>;
export type Proposal = z.infer<typeof proposalSchema>;

