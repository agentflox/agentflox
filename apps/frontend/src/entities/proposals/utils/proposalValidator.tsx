import { z } from "zod";
import { getValidationSchema } from "../helpers";

export function buildSchemaData(data: any, type: string) {
  const baseSchema: any = {
    type: type?.toLowerCase(),
    projectId: data.projectId,
    title: data.title,
    shortSummary: data.shortSummary,
    detailedDesc: data.detailedDesc,
    industry: data.industry || [],
    keywords: data.keywords || [],
    
    location: {
      country: data["location.country"],
      city: data["location.city"],
      remote: data["location.remote"] || false,
      hybrid: data["location.hybrid"] || false,
      willRelocate: data["location.willRelocate"] || false,
      timeZones: data["location.timeZones"] || [],
    },
    
    timeline: {
      startDate: data["timeline.startDate"],
      endDate: data["timeline.endDate"],
      duration: data["timeline.duration"],
      commitment: data["timeline.commitment"],
      availability: data["timeline.availability"],
      urgency: data["timeline.urgency"] || 'MEDIUM',
    },
    
    contact: {
      name: data["contact.name"],
      email: data["contact.email"],
      phone: data["contact.phone"],
      website: data["contact.website"] || '',
      linkedin: data["contact.linkedin"] || '',
      preferredContact: data["contact.preferredContact"] || 'EMAIL',
    },
    
    budget: {
      minAmount: data["budget.minAmount"] ? Number(data["budget.minAmount"]) : undefined,
      maxAmount: data["budget.maxAmount"] ? Number(data["budget.maxAmount"]) : undefined,
      currency: data["budget.currency"] || 'USD',
      type: data["budget.type"],
      description: data["budget.description"],
    },
    
    language: data.language || 'en',
    visibility: data.visibility || 'PUBLIC',
    expiresAt: data.expiresAt,
    attachments: data?.attachments?.length > 0
    ? data.attachments
    : undefined,
  };

  // Add type-specific fields
  const typeSpecificData = getTypeSpecificSchemaData(data, type);
  return { ...baseSchema, ...typeSpecificData };
}

function getTypeSpecificSchemaData(data: any, type: string) {
  const typeUpper = type?.toUpperCase();
  
  switch (typeUpper) {
    case 'INVESTMENT':
      return {
        fundingNeeded: data.fundingNeeded ? Number(data.fundingNeeded) : undefined,
        fundingType: data.fundingType,
        useOfFunds: data.useOfFunds,
        stage: data.stage,
      };
    
    case 'TEAM':
      return {
        teamId: data.teamId,
        hiringOrSeeking: data.hiringOrSeeking,
        roleTitle: data.roleTitle,
      };
    
    case 'MENTORSHIP':
      return {
        seekingOrOffering: data.seekingOrOffering,
        guidanceAreas: data.guidanceAreas || data.gidanceAreas,
        specificChallenges: data.specificChallenges,
        currentStage: data.currentStage,
        preferredMentorBackground: data.preferredMentorBackground,
        expertiseAreas: data.expertiseAreas,
        yearsExperience: data.yearsExperience ? Number(data.yearsExperience) : undefined,
        industriesServed: data.industriesServed,
        successStories: data.successStories,
        menteesCriteria: data.menteesCriteria,
        preferredEngagement: data.preferredEngagement,
        sessionFrequency: data.sessionFrequency,
        compensationExpectation: data.compensationExpectation,
      };
    
    case 'COFOUNDER':
      return {
        seekingOrOffering: data.seekingOrOffering,
        roleTitle: data.roleTitle,
        keyResponsibilities: data.keyResponsibilities,
        decisionAreas: data.decisionAreas,
        equityOffered: data.equityOffered ? Number(data.equityOffered) : undefined,
        equityExpected: data.equityExpected ? Number(data.equityExpected) : undefined,
        vestingSchedule: data.vestingSchedule,
        timeCommitment: data.timeCommitment,
        requiredSkills: data.requiredSkills,
        preferredBackground: data.preferredBackground,
        mustHaveExperience: data.mustHaveExperience,
        personalityTraits: data.personalityTraits,
        businessStage: data.businessStage,
        currentTeamSize: data.currentTeamSize ? Number(data.currentTeamSize) : undefined,
        businessModel: data.businessModel,
        targetMarket: data.targetMarket,
        workStyle: data.workStyle,
        companyValues: data.companyValues,
        conflictResolution: data.conflictResolution,
      };
    
    case 'PARTNERSHIP':
      return {
        seekingOrOffering: data.seekingOrOffering,
        partnershipType: data.partnershipType,
        valueOffered: data.valueOffered,
        valueExpected: data.valueExpected,
        mutualBenefits: data.mutualBenefits,
        partnershipModel: data.partnershipModel,
        revenueSharing: data.revenueSharing ? Number(data.revenueSharing) : undefined,
        exclusivity: data.exclusivity,
        duration: data.duration,
        partnerCriteria: data.partnerCriteria,
        minimumRequirements: data.minimumRequirements,
        idealPartnerProfile: data.idealPartnerProfile,
        currentPartners: data.currentPartners ? Number(data.currentPartners) : undefined,
        marketReach: data.marketReach,
        customerBase: data.customerBase ? Number(data.customerBase) : undefined,
        annualRevenue: data.annualRevenue ? Number(data.annualRevenue) : undefined,
      };
    
    case 'CUSTOMER':
      return {
        sellingOrBuying: data.sellingOrBuying,
        productService: data.productService,
        category: data.category,
        description: data.description,
        pricingModel: data.pricingModel,
        priceRange: {
          min: data["priceRange.min"] ? Number(data["priceRange.min"]) : undefined,
          max: data["priceRange.max"] ? Number(data["priceRange.max"]) : undefined,
          currency: data["priceRange.currency"],
        },
        availability: data.availability,
        deliveryTime: data.deliveryTime,
        targetAudience: data.targetAudience,
        customerBenefits: data.customerBenefits,
        uniqueSellingProposition: data.uniqueSellingProposition,
        previousClients: data.previousClients ? Number(data.previousClients) : undefined,
        testimonials: data.testimonials,
        requirements: data.requirements,
        budgetRange: {
          min: data["budgetRange.min"] ? Number(data["budgetRange.min"]) : undefined,
          max: data["budgetRange.max"] ? Number(data["budgetRange.max"]) : undefined,
          currency: data["budgetRange.currency"],
        },
        decisionCriteria: data.decisionCriteria,
        timeframe: data.timeframe,
        supportIncluded: data.supportIncluded,
        warrantyTerms: data.warrantyTerms,
        paymentTerms: data.paymentTerms,
      };
    
    default:
      return {};
  }
}

export function validateFormData(data: any, type: string) {
  const schema = getValidationSchema(type.toLowerCase());
  const schemaData = buildSchemaData(data, type);
  return schema.parse(schemaData);
}
