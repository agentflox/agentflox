export const MATCHING_CONFIG = {
  weights: {
    project: {
      embedding: 0.6,
      industry: 0.2,
      stage: 0.1,
      location: 0.1,
    },
    hiring: {
      embedding: 0.5,
      industry: 0.25,
      role: 0.25,
    },
    proposal: {
      embedding: 0.55,
      industry: 0.2,
      role: 0.25,
    },
    memberProfile: {
      embedding: 0.5,
      industry: 0.2,
      role: 0.15,
      stage: 0.1,
      location: 0.05,
    },
  },
  limits: {
    default: 20,
    max: 100,
  },
  threshold: {
    default: 0.85,
    min: 0.5,
    max: 1.0,
  },
  boosts: {
    hiring: 0.05,
    exactMatch: 0.1,
  },
} as const;

export const ELIGIBLE_SUBSCRIPTION_PLANS = [
  'BASIC',
  'PROFESSIONAL',
  'BUSINESS',
  'ENTERPRISE',
] as const;

export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIALING'] as const;