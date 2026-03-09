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

export class ProposalMatcher {
  private embeddingHelper: EmbeddingHelper;
  private embeddingCache: Map<string, number[] | null>;

  constructor(private pool: Pool) {
    this.embeddingHelper = new EmbeddingHelper(pool);
    this.embeddingCache = new Map();
  }

  private async getProposalEmbedding(proposalId: string): Promise<number[] | null> {
    if (this.embeddingCache.has(proposalId)) {
      return this.embeddingCache.get(proposalId) ?? null;
    }
    const embedding = await this.embeddingHelper.ensureEmbedding(
      'proposal',
      proposalId,
      'proposals'
    );
    this.embeddingCache.set(proposalId, embedding ?? null);
    return embedding ?? null;
  }

  /**
   * Find matching projects for a proposal
   */
  async findProjects(
    proposalId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        visibility: true,
        industry: true,
        intent: true,
      },
    });

    if (proposal?.visibility !== 'PUBLIC') return [];

    const embedding = await this.getProposalEmbedding(proposalId);

    if (!embedding) return [];

    const seeking = proposal.intent === 'SEEKING';

    const result = await this.pool.query(
      `
      SELECT 
        pr.id,
        pr.name,
        pr.description,
        pr.industry,
        pr.hiring_roles,
        pr.is_hiring,
        pr.owner_id,
        1 - (pr.embedding <=> $1::vector) AS similarity
      FROM projects pr
      WHERE pr.embedding IS NOT NULL
        AND pr.is_public = true
        AND pr.is_active = true
        AND (pr.industry && $2::text[])
        AND ($3::boolean = false OR pr.is_hiring = true)
      ORDER BY pr.embedding <=> $1::vector
      LIMIT $4
      `,
      [embedding, proposal.industry || [], seeking, limit]
    );

    return this.buildProjectMatches(
      result.rows,
      proposal.industry || [],
      seeking
    );
  }

  /**
   * Find matching teams for a proposal
   */
  async findTeams(
    proposalId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        visibility: true,
        industry: true,
        intent: true,
      },
    });

    if (proposal?.visibility !== 'PUBLIC') return [];

    const embedding = await this.getProposalEmbedding(proposalId);

    if (!embedding) return [];

    const seeking = proposal.intent === 'SEEKING';

    const result = await this.pool.query(
      `
      SELECT 
        t.id,
        t.name,
        t.description,
        t.industry,
        t.skills,
        t.hiring_roles,
        t.is_hiring,
        1 - (t.embedding <=> $1::vector) AS similarity
      FROM teams t
      WHERE t.embedding IS NOT NULL
        AND t.is_active = true
        AND (t.industry && $2::text[])
        AND ($3::boolean = false OR t.is_hiring = true)
      ORDER BY t.embedding <=> $1::vector
      LIMIT $4
      `,
      [embedding, proposal.industry || [], seeking, limit]
    );

    return this.buildTeamMatches(result.rows, proposal.industry || [], seeking);
  }

  /**
   * Find matching profiles for a proposal
   */
  async findProfiles(
    proposalId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        visibility: true,
        industry: true,
        intent: true,
        keywords: true,
        tags: true,
      },
    });

    if (proposal?.visibility !== 'PUBLIC') return [];

    const embedding = await this.getProposalEmbedding(proposalId);

    if (!embedding) return [];

    const seeking = proposal.intent === 'SEEKING';
    const roleHints = [...(proposal.keywords || []), ...(proposal.tags || [])];

    const result = await this.pool.query(
      `
      SELECT 
        u.id as user_id,
        mp.role_preferences,
        mp.industry_preferences,
        u.name,
        u.bio,
        1 - (u.embedding <=> $1::vector) AS similarity
      FROM users u
      JOIN member_profiles mp ON mp.user_id = u.id
      WHERE u.embedding IS NOT NULL
        AND u.is_active = true
        AND (mp.industry_preferences && $2::text[])
        AND ($3::boolean = false OR (mp.role_preferences && $4::text[]))
      ORDER BY u.embedding <=> $1::vector
      LIMIT $5
      `,
      [embedding, proposal.industry || [], seeking, roleHints, limit]
    );

    return this.buildProfileMatches(
      result.rows,
      proposal.industry || [],
      roleHints,
      seeking
    );
  }

  private buildProjectMatches(
    rows: any[],
    industries: string[],
    seeking: boolean
  ): MatchResult[] {
    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );

      const hiringBoost =
        seeking && row.is_hiring ? MATCHING_CONFIG.boosts.hiring : 0;

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: row.is_hiring ? 1 : 0,
          boost: hiringBoost,
        },
        MATCHING_CONFIG.weights.proposal
      );

      return {
        id: row.id,
        similarity,
        finalScore: Math.min(1, score),
        metadata: {
          name: row.name,
          description: row.description,
          industry: row.industry,
          isHiring: row.is_hiring,
          hiringRoles: row.hiring_roles,
          ownerId: row.owner_id,
        },
      };
    });
  }

  private buildTeamMatches(
    rows: any[],
    industries: string[],
    seeking: boolean
  ): MatchResult[] {
    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );

      const hiringBoost =
        seeking && row.is_hiring ? MATCHING_CONFIG.boosts.hiring : 0;

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: row.hiring_roles?.length ? 1 : 0,
          boost: hiringBoost,
        },
        MATCHING_CONFIG.weights.proposal
      );

      return {
        id: row.id,
        similarity,
        finalScore: Math.min(1, score),
        metadata: {
          name: row.name,
          description: row.description,
          industry: row.industry,
          skills: row.skills,
          hiringRoles: row.hiring_roles,
        },
      };
    });
  }

  private buildProfileMatches(
    rows: any[],
    industries: string[],
    roleHints: string[],
    seeking: boolean
  ): MatchResult[] {
    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry_preferences || []
      );
      const roleSignal = seeking
        ? calculateRoleMatch(roleHints, row.role_preferences || [])
        : 0.5;

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: roleSignal,
        },
        MATCHING_CONFIG.weights.proposal
      );

      return {
        id: row.user_id,
        similarity,
        finalScore: score,
        metadata: {
          name: row.name,
          bio: row.bio,
          rolePreferences: row.role_preferences,
          industryPreferences: row.industry_preferences,
        },
      };
    });
  }
}