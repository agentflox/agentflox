import env from '@/config/env';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from './lib/logger';
import { embeddingGenerationTime, matchingErrors } from './lib/metrics';
import { withSpan } from './lib/tracer';
import { MAX_EMBEDDING_TEXT_LENGTH } from './middleware/validation';
import { generateEmbeddingWithCircuitBreaker } from './lib/circuit-breaker';
import {
  buildProjectText,
  buildProposalText,
  buildTeamText,
  buildFounderProfileText,
  buildInvestorProfileText,
  buildMemberProfileText,
} from '@/utils/utilities/textBuilders';

type ProfileUserRecord = { name?: string | null; bio?: string | null };

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return withSpan('generateEmbedding', { 'text.length': text.length }, async (span) => {
    // Validation
    if (!text || text.trim().length === 0) {
      const error = new Error('Text cannot be empty');
      matchingErrors.inc({ entity_type: 'generic', error_type: 'validation', operation: 'generateEmbedding' });
      throw error;
    }

    if (text.length > MAX_EMBEDDING_TEXT_LENGTH) {
      const error = new Error(`Text exceeds max length of ${MAX_EMBEDDING_TEXT_LENGTH} characters`);
      matchingErrors.inc({ entity_type: 'generic', error_type: 'validation', operation: 'generateEmbedding' });
      throw error;
    }

    const model = env.EMBEDDING_MODEL || 'text-embedding-3-large';
    span.setAttribute('model', model);

    const timer = embeddingGenerationTime.startTimer({ entity_type: 'generic', status: 'pending' });

    try {
      // Use circuit breaker for OpenAI API calls
      const embedding = await generateEmbeddingWithCircuitBreaker(text);

      timer({ status: 'success' });

      logger.info({
        operation: 'generateEmbedding',
        textLength: text.length,
        embeddingDim: embedding.length,
        model,
      }, 'Generated embedding successfully');

      span.setAttribute('embedding.dimensions', embedding.length);
      return embedding;
    } catch (error: any) {
      timer({ status: 'error' });
      matchingErrors.inc({
        entity_type: 'generic',
        error_type: error.code || 'unknown',
        operation: 'generateEmbedding'
      });

      logger.error({
        operation: 'generateEmbedding',
        error: error.message,
        errorCode: error.code,
        textLength: text.length,
        model,
      }, 'Failed to generate embedding');

      throw error;
    }
  });
}

/**
 * Update embedding for a project
 */
export async function updateProjectEmbedding(projectId: string): Promise<void> {
  // Read via Supabase to avoid pool usage
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select(
      'id,name,description,tagline,industry,tags,target_market,competitive_edge,stage,hiring_roles,location,is_remote_friendly'
    )
    .eq('id', projectId)
    .single();

  if (error || !project) {
    console.log("this is error", error);
    throw new Error(`Project ${projectId} not found`);
  }

  const text = buildProjectText({
    name: project.name,
    description: project.description,
    tagline: project.tagline,
    industry: project.industry || [],
    tags: project.tags || [],
    targetMarket: project.target_market || undefined,
    competitiveEdge: project.competitive_edge || undefined,
    stage: project.stage || undefined,
    hiringRoles: project.hiring_roles || [],
    location: project.location || undefined,
    isRemoteFriendly: project.is_remote_friendly ?? undefined,
  });
  const embedding = await generateEmbedding(text);

  // Use raw SQL to update the vector
  await prisma.$executeRaw`
    UPDATE projects 
    SET embedding = ${JSON.stringify(embedding)}::vector, 
        embedding_updated_at = NOW()
    WHERE id = ${projectId}
  `;
}

/**
 * Update embedding for a proposal
 */
export async function updateProposalEmbedding(proposalId: string): Promise<void> {
  const { data: proposal, error } = await supabaseAdmin
    .from('proposals')
    .select('id,title,short_summary,detailed_desc,industry,keywords,tags')
    .eq('id', proposalId)
    .single();

  if (error || !proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  const text = buildProposalText({
    title: proposal.title,
    shortSummary: proposal.short_summary,
    detailedDesc: proposal.detailed_desc,
    industry: proposal.industry || [],
    keywords: proposal.keywords || [],
    tags: proposal.tags || [],
  });
  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    UPDATE proposals 
    SET embedding = ${JSON.stringify(embedding)}::vector, 
        embedding_updated_at = NOW()
    WHERE id = ${proposalId}
  `;
}

/**
 * Update embedding for a team
 */
export async function updateTeamEmbedding(teamId: string): Promise<void> {
  const { data: team, error } = await supabaseAdmin
    .from('teams')
    .select('id,name,description,industry,skills,hiring_roles,location,is_hiring')
    .eq('id', teamId)
    .single();

  if (error || !team) {
    throw new Error(`Team ${teamId} not found`);
  }

  const text = buildTeamText({
    name: team.name,
    description: team.description,
    industry: team.industry || [],
    skills: team.skills || [],
    hiringRoles: team.hiring_roles || [],
    location: team.location || undefined,
    isHiring: team.is_hiring ?? undefined,
  });
  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    UPDATE teams 
    SET embedding = ${JSON.stringify(embedding)}::vector, 
        embedding_updated_at = NOW()
    WHERE id = ${teamId}
  `;
}

/**
 * Update embedding for a founder profile
 */
export async function updateFounderProfileEmbedding(userId: string): Promise<void> {
  const { data: profile, error } = await supabaseAdmin
    .from('founder_profiles')
    .select('user_id,industry_preferences,location_preferences,previous_exits,company_experience,user:users(email,name,bio)')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {
    throw new Error(`Founder profile for user ${userId} not found`);
  }

  const profileUser = Array.isArray(profile.user)
    ? (profile.user[0] as ProfileUserRecord | undefined)
    : (profile.user as ProfileUserRecord | undefined);

  const text = buildFounderProfileText({
    user: { name: profileUser?.name, bio: profileUser?.bio },
    industryPreferences: profile.industry_preferences || [],
    locationPreferences: profile.location_preferences || [],
    previousExits: profile.previous_exits || [],
    companyExperience: profile.company_experience,
  });
  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    UPDATE founder_profiles 
    SET embedding = ${JSON.stringify(embedding)}::vector, 
        embedding_updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

/**
 * Update embedding for an investor profile
 */
export async function updateInvestorProfileEmbedding(userId: string): Promise<void> {
  const { data: profile, error } = await supabaseAdmin
    .from('investor_profiles')
    .select('user_id,preferred_industries,preferred_stages,geographic_focus,value_add_services,firm_name,investment_thesis,user:users(email,name,bio)')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {
    throw new Error(`Investor profile for user ${userId} not found`);
  }

  const profileUser = Array.isArray(profile.user)
    ? (profile.user[0] as ProfileUserRecord | undefined)
    : (profile.user as ProfileUserRecord | undefined);

  const text = buildInvestorProfileText({
    user: { name: profileUser?.name, bio: profileUser?.bio },
    firmName: profile.firm_name,
    investmentThesis: profile.investment_thesis || undefined,
    preferredIndustries: profile.preferred_industries || [],
    preferredStages: profile.preferred_stages || [],
    geographicFocus: profile.geographic_focus || [],
    valueAddServices: profile.value_add_services || [],
  });
  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    UPDATE investor_profiles 
    SET embedding = ${JSON.stringify(embedding)}::vector, 
        embedding_updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

/**
 * Update embedding for a member profile
 */
export async function updateMemberProfileEmbedding(userId: string): Promise<void> {
  const { data: profile, error } = await supabaseAdmin
    .from('member_profiles')
    .select('user_id,job_title,role_preferences,industry_preferences,achievements,experience,user:users(email,name,bio)')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {
    throw new Error(`Member profile for user ${userId} not found`);
  }

  const profileUser = Array.isArray(profile.user)
    ? (profile.user[0] as ProfileUserRecord | undefined)
    : (profile.user as ProfileUserRecord | undefined);

  const text = buildMemberProfileText({
    user: { name: profileUser?.name, bio: profileUser?.bio },
    jobTitle: profile.job_title || undefined,
    rolePreferences: profile.role_preferences || [],
    industryPreferences: profile.industry_preferences || [],
    achievements: profile.achievements || [],
    experience: profile.experience,
  });
  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    UPDATE member_profiles 
    SET embedding = ${JSON.stringify(embedding)}::vector, 
        embedding_updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

/**
 * Update embedding stored on users table
 */
export async function updateUserEmbedding(userId: string): Promise<void> {
  // Fetch user and optional member profile fields to enrich text
  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id,name,bio,location')
    .eq('id', userId)
    .single();

  if (userErr || !user) {
    throw new Error(`User ${userId} not found`);
  }

  const { data: memberProfile } = await supabaseAdmin
    .from('member_profiles')
    .select('role_preferences,industry_preferences,achievements,experience,job_title')
    .eq('user_id', userId)
    .maybeSingle();

  const text = buildMemberProfileText({
    user: { name: user.name, bio: user.bio },
    jobTitle: memberProfile?.job_title || undefined,
    rolePreferences: memberProfile?.role_preferences || [],
    industryPreferences: memberProfile?.industry_preferences || [],
    achievements: memberProfile?.achievements || [],
    experience: memberProfile?.experience,
  });

  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    UPDATE users 
    SET embedding = ${JSON.stringify(embedding)}::vector, 
        embedding_updated_at = NOW()
    WHERE id = ${userId}
  `;
}

