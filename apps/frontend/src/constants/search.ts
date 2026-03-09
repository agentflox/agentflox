const searchConfig = {
  // Full-text search fields with weights
  searchFields: {
    title: { weight: 3.0 },
    shortSummary: { weight: 2.0 },
    detailedDesc: { weight: 1.0 },
    keywords: { weight: 2.5 },
    tags: { weight: 1.5 }
  },
  
  // Filterable fields
  filters: {
    category: { type: 'enum', multiple: true },
    industry: { type: 'array', multiple: true },
    location: {
      country: { type: 'string' },
      remote: { type: 'boolean' },
      hybrid: { type: 'boolean' }
    },
    budget: {
      minAmount: { type: 'range' },
      maxAmount: { type: 'range' },
      currency: { type: 'enum' }
    },
    timeline: {
      startDate: { type: 'date-range' },
      commitment: { type: 'enum', multiple: true },
      urgency: { type: 'enum', multiple: true }
    },
    status: { type: 'enum', multiple: true },
    language: { type: 'enum', multiple: true },
    createdAt: { type: 'date-range' }
  },
  
  // Category-specific filters
  categoryFilters: {
    INVESTOR: {
      fundingType: { type: 'enum', multiple: true },
      stage: { type: 'enum', multiple: true },
      fundingNeeded: { type: 'range' },
      equityOffered: { type: 'range' }
    },
    MENTOR: {
      seekingOrOffering: { type: 'enum' },
      guidanceAreas: { type: 'array', multiple: true },
      compensationExpectation: { type: 'enum', multiple: true }
    },
    TEAM: {
      hiringOrSeeking: { type: 'enum' },
      roleTitle: { type: 'text' },
      workArrangement: { type: 'enum', multiple: true },
      seniority: { type: 'enum', multiple: true },
      compensationType: { type: 'enum', multiple: true }
    }
  }
};
