export function buildProjectText(project: {
  name: string;
  description: string;
  tagline?: string | null;
  industry: string[];
  tags: string[];
  targetMarket?: string | null;
  competitiveEdge?: string | null;
  stage?: string | null;
  hiringRoles: string[];
  location?: string | null;
  isRemoteFriendly?: boolean | null;
}): string {
  const parts = [
    project.name,
    project.tagline || '',
    project.description,
    `Industry: ${project.industry.join(', ')}`,
    `Tags: ${project.tags.join(', ')}`,
    project.targetMarket ? `Target Market: ${project.targetMarket}` : '',
    project.competitiveEdge ? `Competitive Edge: ${project.competitiveEdge}` : '',
    project.stage ? `Stage: ${project.stage}` : '',
    project.hiringRoles.length ? `Hiring Roles: ${project.hiringRoles.join(', ')}` : '',
    project.location ? `Location: ${project.location}` : '',
    project.isRemoteFriendly !== undefined && project.isRemoteFriendly !== null
      ? `Remote Friendly: ${project.isRemoteFriendly ? 'Yes' : 'No'}`
      : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

export function buildProposalText(proposal: {
  title: string;
  shortSummary: string;
  detailedDesc: string;
  industry: string[];
  keywords: string[];
  tags: string[];
}): string {
  const parts = [
    proposal.title,
    proposal.shortSummary,
    proposal.detailedDesc,
    `Industry: ${proposal.industry.join(', ')}`,
    `Keywords: ${proposal.keywords.join(', ')}`,
    `Tags: ${proposal.tags.join(', ')}`,
  ].filter(Boolean);
  return parts.join('\n\n');
}

export function buildTeamText(team: {
  name: string;
  description: string;
  industry: string[];
  skills: string[];
  hiringRoles: string[];
  location?: string | null;
  isHiring?: boolean | null;
}): string {
  const parts = [
    team.name,
    team.description,
    `Industry: ${team.industry.join(', ')}`,
    `Skills: ${team.skills.join(', ')}`,
    team.hiringRoles.length ? `Hiring Roles: ${team.hiringRoles.join(', ')}` : '',
    team.location ? `Location: ${team.location}` : '',
    team.isHiring !== undefined && team.isHiring !== null
      ? `Actively Hiring: ${team.isHiring ? 'Yes' : 'No'}`
      : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

export function buildFounderProfileText(profile: {
  user: { bio?: string | null; name?: string | null };
  industryPreferences: string[];
  locationPreferences: string[];
  previousExits: string[];
  companyExperience?: number | null;
}): string {
  const parts = [
    profile.user.name || '',
    profile.user.bio || '',
    `Industry Preferences: ${profile.industryPreferences.join(', ')}`,
    `Location Preferences: ${profile.locationPreferences.join(', ')}`,
    profile.previousExits.length > 0 ? `Previous Exits: ${profile.previousExits.join(', ')}` : '',
    profile.companyExperience ? `Experience: ${profile.companyExperience} years` : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

export function buildInvestorProfileText(profile: {
  user: { bio?: string | null; name?: string | null };
  firmName?: string | null;
  investmentThesis?: string | null;
  preferredIndustries: string[];
  preferredStages: string[];
  geographicFocus: string[];
  valueAddServices: string[];
}): string {
  const parts = [
    profile.user.name || '',
    profile.user.bio || '',
    profile.firmName ? `Firm: ${profile.firmName}` : '',
    profile.investmentThesis || '',
    `Preferred Industries: ${profile.preferredIndustries.join(', ')}`,
    `Preferred Stages: ${profile.preferredStages.join(', ')}`,
    `Geographic Focus: ${profile.geographicFocus.join(', ')}`,
    `Value Add Services: ${profile.valueAddServices.join(', ')}`,
  ].filter(Boolean);
  return parts.join('\n\n');
}

export function buildMemberProfileText(profile: {
  user: { bio?: string | null; name?: string | null };
  jobTitle?: string | null;
  rolePreferences: string[];
  industryPreferences: string[];
  achievements: string[];
  experience?: number | null;
}): string {
  const parts = [
    profile.user.name || '',
    profile.user.bio || '',
    profile.jobTitle ? `Job Title: ${profile.jobTitle}` : '',
    `Role Preferences: ${profile.rolePreferences.join(', ')}`,
    `Industry Preferences: ${profile.industryPreferences.join(', ')}`,
    profile.achievements.length > 0 ? `Achievements: ${profile.achievements.join(', ')}` : '',
    profile.experience ? `Experience: ${profile.experience} years` : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}


