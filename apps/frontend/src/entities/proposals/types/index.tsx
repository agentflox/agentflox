export const PROPOSAL_TYPE_MAPPING = {
  INVESTOR: 'investor',
  MENTOR: 'mentor',
  TEAM: 'team',
  COFOUNDER: 'cofounder',
  PARTNER: 'partner',
  CUSTOMER: 'customer',
} as const;

export type ProposalTypeKey = keyof typeof PROPOSAL_TYPE_MAPPING;
export type ProposalTypeValue = typeof PROPOSAL_TYPE_MAPPING[ProposalTypeKey];
