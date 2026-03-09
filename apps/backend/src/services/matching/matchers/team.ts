import { Pool } from 'pg';
import { prisma } from '@/lib/prisma';
import { MATCHING_CONFIG } from '@/services/matching/config/shared';
import { EmbeddingHelper } from '@/services/matching/helpers/embedding';
import {
  calculateSimilarity,
  calculateIndustryMatch,
  calculateRoleMatch,
} from '@/services/matching/helpers/calculateSimilarity';
import { calculateWeightedScore } from '@/services/matching/helpers/calculateScore';
import type { MatchResult } from '@/services/matching/types';

export class TeamMatcher {
  private embeddingHelper: EmbeddingHelper;
  private embeddingCache: Map<string, number[] | null>;

  constructor(private pool: Pool) {
    this.embeddingHelper = new EmbeddingHelper(pool);
    this.embeddingCache = new Map();
  }

  private async getTeamEmbedding(teamId: string): Promise<number[] | null> {
    if (this.embeddingCache.has(teamId)) {
      return this.embeddingCache.get(teamId) ?? null;
    }
    const embedding = await this.embeddingHelper.ensureEmbedding(
      'team',
      teamId,
      'teams'
    );
    this.embeddingCache.set(teamId, embedding ?? null);
    return embedding ?? null;
  }

  /**
   * Find matching projects for a team
   */
  async findProjects(
    teamId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isActive: true,
        industry: true,
        skills: true,
        hiringRoles: true,
        isHiring: true,
      },
    });

    if (!team?.isActive) return [];

    const embedding = await this.getTeamEmbedding(teamId);

    if (!embedding) return [];

    // If team is hiring, prefer projects that are also hiring (potential partnerships)
    // If team has skills, match with projects needing those skills
    const result = await this.pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.industry,
        p.hiring_roles,
        p.stage,
        p.location,
        p.is_hiring,
        p.owner_id,
        1 - (p.embedding <=> $1::vector) AS similarity
      FROM projects p
      WHERE p.embedding IS NOT NULL
        AND p.is_public = true
        AND (p.industry && $2::text[])
        AND ($3::boolean = false OR (p.hiring_roles && $4::text[]))
      ORDER BY p.embedding <=> $1::vector
      LIMIT $5
      `,
      [
        embedding,
        team.industry || [],
        team.skills && team.skills.length > 0,
        team.skills || [],
        limit,
      ]
    );

    return this.buildProjectMatches(
      result.rows,
      team.industry || [],
      team.skills || [],
      team.isHiring || false
    );
  }

  /**
   * Find matching proposals for a team
   */
  async findProposals(
    teamId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isActive: true,
        industry: true,
        skills: true,
        hiringRoles: true,
      },
    });

    if (!team?.isActive) return [];

    const embedding = await this.getTeamEmbedding(teamId);

    if (!embedding) return [];

    const result = await this.pool.query(
      `
      SELECT 
        p.id,
        p.title,
        p."shortSummary" AS "shortSummary",
        p.industry,
        p.category,
        p.intent,
        p.keywords,
        p.tags,
        p.user_id,
        1 - (p.embedding <=> $1::vector) AS similarity
      FROM proposals p
      WHERE p.embedding IS NOT NULL
        AND p.visibility = 'PUBLIC'
        AND (p.industry && $2::text[])
        AND ((p.keywords && $3::text[]) OR (p.tags && $3::text[]))
      ORDER BY p.embedding <=> $1::vector
      LIMIT $4
      `,
      [
        embedding,
        team.industry || [],
        [...(team.skills || []), ...(team.hiringRoles || [])],
        limit,
      ]
    );

    return this.buildProposalMatches(
      result.rows,
      team.industry || [],
      [...(team.skills || []), ...(team.hiringRoles || [])]
    );
  }

  /**
   * Find matching member profiles for a team's hiring needs
   */
  async findProfilesForHiring(
    teamId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isActive: true,
        isHiring: true,
        hiringRoles: true,
        industry: true,
        skills: true,
      },
    });

    if (!team?.isActive || !team?.isHiring || !team.hiringRoles?.length) {
      return [];
    }

    const embedding = await this.getTeamEmbedding(teamId);

    if (!embedding) return [];

    const result = await this.pool.query(
      `
      SELECT 
        u.id as user_id,
        mp.role_preferences,
        mp.industry_preferences,
        mp.skills,
        mp.experience_level,
        u.name,
        u.bio,
        u.location,
        1 - (u.embedding <=> $1::vector) AS similarity
      FROM users u
      JOIN member_profiles mp ON mp.user_id = u.id
      WHERE u.embedding IS NOT NULL
        AND u.is_active = true
        AND (mp.industry_preferences && $2::text[])
        AND (mp.role_preferences && $3::text[])
      ORDER BY u.embedding <=> $1::vector
      LIMIT $4
      `,
      [
        embedding,
        team.industry || [],
        team.hiringRoles,
        limit,
      ]
    );

    return this.buildProfileMatches(
      result.rows,
      team.industry || [],
      team.hiringRoles
    );
  }

  /**
   * Find matching teams for potential collaboration/partnership
   */
  async findTeamsForCollaboration(
    teamId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isActive: true,
        industry: true,
        skills: true,
        description: true,
      },
    });

    if (!team?.isActive) return [];

    const embedding = await this.embeddingHelper.ensureEmbedding(
      'team',
      teamId,
      'teams'
    );

    if (!embedding) return [];

    const result = await this.pool.query(
      `
      SELECT 
        t.id,
        t.name,
        t.description,
        t.industry,
        t.skills,
        t.size,
        t.owner_id,
        1 - (t.embedding <=> $1::vector) AS similarity
      FROM teams t
      WHERE t.embedding IS NOT NULL
        AND t.id != $2
        AND (t.industry && $3::text[])
      ORDER BY t.embedding <=> $1::vector
      LIMIT $4
      `,
      [
        embedding,
        teamId, // Exclude self
        team.industry || [],
        limit,
      ]
    );

    return this.buildTeamCollaborationMatches(
      result.rows,
      team.industry || [],
      team.skills || []
    );
  }

  private buildProjectMatches(
    rows: any[],
    industries: string[],
    skills: string[],
    isHiring: boolean
  ): MatchResult[] {
    const weights = MATCHING_CONFIG.weights.hiring;

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );
      
      // If team has skills, check if project needs them
      const skillMatch = skills.length > 0
        ? calculateRoleMatch(skills, row.hiring_roles || [])
        : 0.5;

      // Boost if both are hiring (partnership opportunity)
      const partnershipBoost = isHiring && row.is_hiring 
        ? MATCHING_CONFIG.boosts.hiring 
        : 0;

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: skillMatch,
          boost: partnershipBoost,
        },
        weights
      );

      return {
        id: row.id,
        similarity,
        finalScore: score,
        metadata: {
          name: row.name,
          description: row.description,
          industry: row.industry,
          hiringRoles: row.hiring_roles,
          stage: row.stage,
          location: row.location,
          isHiring: row.is_hiring,
          ownerId: row.owner_id,
        },
      };
    });
  }

  private buildProposalMatches(
    rows: any[],
    industries: string[],
    teamCapabilities: string[]
  ): MatchResult[] {
    const weights = MATCHING_CONFIG.weights.proposal;

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );
      
      // Check if team capabilities align with proposal keywords/tags
      const capabilityMatch = Math.max(
        calculateRoleMatch(teamCapabilities, row.keywords || []),
        calculateRoleMatch(teamCapabilities, row.tags || [])
      );

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: capabilityMatch,
        },
        weights
      );

      return {
        id: row.id,
        similarity,
        finalScore: score,
        metadata: {
          title: row.title,
          shortSummary: row.shortSummary,
          industry: row.industry,
          category: row.category,
          intent: row.intent,
          keywords: row.keywords,
          tags: row.tags,
          userId: row.user_id,
        },
      };
    });
  }

  private buildProfileMatches(
    rows: any[],
    industries: string[],
    hiringRoles: string[]
  ): MatchResult[] {
    const weights = MATCHING_CONFIG.weights.hiring;

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry_preferences || []
      );
      const roleMatch = calculateRoleMatch(
        hiringRoles,
        row.role_preferences || []
      );

      // Bonus for skill match
      const skillBoost = row.skills?.length > 0 
        ? calculateRoleMatch(hiringRoles, row.skills) * 0.05 
        : 0;

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: roleMatch,
          boost: skillBoost,
        },
        weights
      );

      return {
        id: row.user_id,
        similarity,
        finalScore: score,
        metadata: {
          name: row.name,
          bio: row.bio,
          location: row.location,
          rolePreferences: row.role_preferences,
          industryPreferences: row.industry_preferences,
          skills: row.skills,
          experienceLevel: row.experience_level,
        },
      };
    });
  }

  private buildTeamCollaborationMatches(
    rows: any[],
    industries: string[],
    skills: string[]
  ): MatchResult[] {
    const weights = {
      embedding: 0.5,
      industry: 0.3,
      role: 0.2, // Complementary skills score
    };

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );
      
      // For collaboration, we want complementary skills (low overlap = good)
      const skillOverlap = calculateRoleMatch(skills, row.skills || []);
      const complementaryScore = 1 - skillOverlap * 0.5; // Prefer some difference

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: complementaryScore,
        },
        weights
      );

      return {
        id: row.id,
        similarity,
        finalScore: score,
        metadata: {
          name: row.name,
          description: row.description,
          industry: row.industry,
          skills: row.skills,
          size: row.size,
          ownerId: row.owner_id,
        },
      };
    });
  }
}