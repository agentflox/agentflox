"use client";
import { z } from "zod";
import { 
  universalFields, 
  investorFields, 
  mentorFields, 
  teamFields, 
  cofounderFields, 
  partnerFields, 
  customerFields 
} from "../constants";
import { 
  investorProposalSchema,
  mentorProposalSchema,
  teamProposalSchema,
  cofounderProposalSchema,
  partnerProposalSchema,
  customerProposalSchema
} from "../validations/proposal.schema";

// Helper function to get form fields based on proposal type
const getFormFields = (type: string) => {
  switch (type) {
    case 'INVESTMENT':
      return [...universalFields, ...investorFields];
    case 'MENTORSHIP':
      return [...universalFields, ...mentorFields];
    case 'TEAM':
      return [...universalFields, ...teamFields];
    case 'COFOUNDER':
      return [...universalFields, ...cofounderFields];
    case 'PARTNERSHIP':
      return [...universalFields, ...partnerFields];
    case 'CUSTOMER':
      return [...universalFields, ...customerFields];
    default:
      return [...universalFields];
  }
};

// Helper function to get validation schema based on proposal type
const getValidationSchema = (type: string) => {
  switch (type) {
    case 'INVESTMENT':
      return investorProposalSchema;
    case 'MENTORSHIP':
      return mentorProposalSchema;
    case 'TEAM':
      return teamProposalSchema;
    case 'COFOUNDER':
      return cofounderProposalSchema;
    case 'PARTNERSHIP':
      return partnerProposalSchema;
    case 'CUSTOMER':
      return customerProposalSchema;
    default:
      return z.object({});
  }
};

export { getFormFields, getValidationSchema };
