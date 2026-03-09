export function mapFormDataToProposal(formData: any, proposalId: string, selectedType: string) {
  const baseData = {
    id: proposalId,
    category: selectedType ? String(selectedType).toUpperCase() : undefined,
    projectId: formData.projectId,
    title: formData.title,
    shortSummary: formData.shortSummary,
    detailedDesc: formData.detailedDesc,
    industry: formData.industry || [],
    keywords: formData.keywords || [],
    teamId: formData.teamId,
    
    location: extractLocation(formData),
    timeline: extractTimeline(formData),
    budget: extractBudget(formData),
    contact: extractContact(formData),
    attachments: formData?.attachments?.length > 0
    ? formData.attachments
    : undefined,
    visibility: formData.visibility || 'PUBLIC',
    expiresAt: formData.expiresAt,
    language: formData.language || 'en',
    metadata: formData,
  };

  return {
    ...baseData,
    ...extractCategorySpecificData(formData, selectedType),
  };
}

function extractLocation(formData: any) {
  return {
    country: formData["location.country"],
    city: formData["location.city"],
    remote: formData["location.remote"] || false,
    hybrid: formData["location.hybrid"] || false,
    willRelocate: formData["location.willRelocate"] || false,
    timeZones: formData["location.timeZones"] || [],
  };
}

function extractTimeline(formData: any) {
  return {
    startDate: formData["timeline.startDate"],
    endDate: formData["timeline.endDate"],
    duration: formData["timeline.duration"],
    commitment: formData["timeline.commitment"],
    availability: formData["timeline.availability"],
    urgency: formData["timeline.urgency"] || 'MEDIUM',
  };
}

function extractBudget(formData: any) {
  return {
    minAmount: formData["budget.minAmount"] ? Number(formData["budget.minAmount"]) : undefined,
    maxAmount: formData["budget.maxAmount"] ? Number(formData["budget.maxAmount"]) : undefined,
    currency: formData["budget.currency"] || 'USD',
    type: formData["budget.type"],
    description: formData["budget.description"],
  };
}

function extractContact(formData: any) {
  return {
    name: formData["contact.name"],
    email: formData["contact.email"],
    phone: formData["contact.phone"],
    website: formData["contact.website"],
    linkedin: formData["contact.linkedin"],
    preferredContact: formData["contact.preferredContact"] || 'EMAIL',
  };
}

function extractCategorySpecificData(formData: any, selectedType: string) {
  const type = selectedType?.toLowerCase();
  
  switch (type) {
    case 'INVESTMENT':
      return { investor: extractInvestorData(formData) };
    case 'MENTORSHIP':
      return { mentor: extractMentorData(formData) };
    case 'TEAM':
      return { team: extractTeamData(formData) };
    case 'COFOUNDER':
      return { cofounder: extractCofounderData(formData) };
    case 'PARTNERSHIP':
      return { partner: extractPartnerData(formData) };
    case 'CUSTOMER':
      return { customer: extractCustomerData(formData) };
    default:
      return {};
  }
}

// Extract category-specific data functions
function extractInvestorData(formData: any) {
  return {
    fundingNeeded: formData.fundingNeeded ? Number(formData.fundingNeeded) : undefined,
    fundingType: formData.fundingType,
    stage: formData.stage,
    currentRevenue: formData.currentRevenue ? Number(formData.currentRevenue) : undefined,
    projectedRevenue: formData.projectedRevenue ? Number(formData.projectedRevenue) : undefined,
    customers: formData.customers ? Number(formData.customers) : undefined,
    monthlyUsers: formData.monthlyUsers ? Number(formData.monthlyUsers) : undefined,
    growthRate: formData.growthRate ? Number(formData.growthRate) : undefined,
    useOfFunds: formData.useOfFunds,
    teamSize: formData.teamSize ? Number(formData.teamSize) : undefined,
    foundedDate: formData.foundedDate,
    equityOffered: formData.equityOffered ? Number(formData.equityOffered) : undefined,
    minInvestment: formData.minInvestment ? Number(formData.minInvestment) : undefined,
    maxInvestment: formData.maxInvestment ? Number(formData.maxInvestment) : undefined,
    boardSeat: formData.boardSeat || false,
    expectedROI: formData.expectedROI ? Number(formData.expectedROI) : undefined,
    investorKind: formData.investorType || [],
    exitStrategy: formData.exitStrategy,
  };
}

function extractMentorData(formData: any) {
  return {
    seekingOrOffering: formData.seekingOrOffering,
    guidanceAreas: formData.guidanceAreas || formData.gidanceAreas || [],
    specificChallenges: formData.specificChallenges,
    currentStage: formData.currentStage,
    preferredMentorBackground: formData.preferredMentorBackground || [],
    expertiseAreas: formData.expertiseAreas || [],
    yearsExperience: formData.yearsExperience ? Number(formData.yearsExperience) : undefined,
    industriesServed: formData.industriesServed || [],
    successStories: formData.successStories,
    menteesCriteria: formData.menteesCriteria,
    preferredEngagement: formData.preferredEngagement,
    sessionFrequency: formData.sessionFrequency,
    compensationExpectation: formData.compensationExpectation,
  };
}

function extractTeamData(formData: any) {
  return {
    hiringOrSeeking: formData.hiringOrSeeking,
    roleTitle: formData.roleTitle,
    department: formData.department,
    seniority: formData.seniority,
    mustHaveSkills: formData.mustHaveSkills || [],
    niceToHaveSkills: formData.niceToHaveSkills || [],
    certifications: formData.certifications || [],
    languagesRequired: formData.languagesRequired || [],
    workArrangement: formData.workArrangement,
    compensationType: formData.compensationType,
    salaryRange: extractSalaryRange(formData),
    benefits: formData.benefits || [],
    companySize: formData.companySize,
    companyStage: formData.companyStage,
    teamCulture: formData.teamCulture,
  };
}

function extractCofounderData(formData: any) {
  return {
    seekingOrOffering: formData.seekingOrOffering,
    roleTitle: formData.roleTitle,
    keyResponsibilities: formData.keyResponsibilities || [],
    decisionAreas: formData.decisionAreas || [],
    equityOffered: formData.equityOffered ? Number(formData.equityOffered) : undefined,
    equityExpected: formData.equityExpected ? Number(formData.equityExpected) : undefined,
    vestingSchedule: formData.vestingSchedule,
    timeCommitment: formData.timeCommitment,
    requiredSkills: formData.requiredSkills || [],
    preferredBackground: formData.preferredBackground || [],
    mustHaveExperience: formData.mustHaveExperience || [],
    personalityTraits: formData.personalityTraits || [],
    businessStage: formData.businessStage,
    currentTeamSize: formData.currentTeamSize ? Number(formData.currentTeamSize) : undefined,
    businessModel: formData.businessModel,
    targetMarket: formData.targetMarket,
    workStyle: formData.workStyle,
    companyValues: formData.companyValues || [],
    conflictResolution: formData.conflictResolution,
  };
}

function extractPartnerData(formData: any) {
  return {
    seekingOrOffering: formData.seekingOrOffering,
    partnershipType: formData.partnershipType,
    valueOffered: formData.valueOffered,
    valueExpected: formData.valueExpected,
    mutualBenefits: formData.mutualBenefits || [],
    partnershipModel: formData.partnershipModel,
    revenueSharing: formData.revenueSharing ? Number(formData.revenueSharing) : undefined,
    exclusivity: formData.exclusivity || 'NON_EXCLUSIVE',
    duration: formData.duration,
    partnerCriteria: formData.partnerCriteria,
    minimumRequirements: formData.minimumRequirements || [],
    idealPartnerProfile: formData.idealPartnerProfile,
    currentPartners: formData.currentPartners ? Number(formData.currentPartners) : undefined,
    marketReach: formData.marketReach || [],
    customerBase: formData.customerBase ? Number(formData.customerBase) : undefined,
    annualRevenue: formData.annualRevenue ? Number(formData.annualRevenue) : undefined,
  };
}

function extractCustomerData(formData: any) {
  return {
    sellingOrBuying: formData.sellingOrBuying,
    productService: formData.productService,
    category: formData.category,
    description: formData.description,
    pricingModel: formData.pricingModel,
    priceRange: extractPriceRange(formData, 'priceRange'),
    availability: formData.availability,
    deliveryTime: formData.deliveryTime,
    targetAudience: formData.targetAudience,
    customerBenefits: formData.customerBenefits || [],
    uniqueSellingProposition: formData.uniqueSellingProposition,
    previousClients: formData.previousClients ? Number(formData.previousClients) : undefined,
    testimonials: formData.testimonials,
    requirements: formData.requirements || [],
    budgetRange: extractPriceRange(formData, 'budgetRange'),
    decisionCriteria: formData.decisionCriteria || [],
    timeframe: formData.timeframe,
    supportIncluded: formData.supportIncluded || [],
    warrantyTerms: formData.warrantyTerms,
    paymentTerms: formData.paymentTerms,
  };
}

function extractSalaryRange(formData: any) {
  if (formData.salaryRange) {
    return {
      min: formData["salaryRange.min"] ? Number(formData["salaryRange.min"]) : formData.salaryRange.min,
      max: formData["salaryRange.max"] ? Number(formData["salaryRange.max"]) : formData.salaryRange.max,
      currency: formData["salaryRange.currency"] || formData.salaryRange.currency,
    };
  }
  return {
    min: formData["salaryRange.min"] ? Number(formData["salaryRange.min"]) : undefined,
    max: formData["salaryRange.max"] ? Number(formData["salaryRange.max"]) : undefined,
    currency: formData["salaryRange.currency"],
  };
}

function extractPriceRange(formData: any, prefix: string) {
  return {
    min: formData[`${prefix}.min`] ? Number(formData[`${prefix}.min`]) : undefined,
    max: formData[`${prefix}.max`] ? Number(formData[`${prefix}.max`]) : undefined,
    currency: formData[`${prefix}.currency`],
  };
}
