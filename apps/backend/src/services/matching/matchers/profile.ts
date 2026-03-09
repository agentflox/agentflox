import { Pool } from 'pg';
import { prisma } from '@/lib/prisma';
import { MATCHING_CONFIG } from '@/services/matching/config/shared';
import { EmbeddingHelper } from '@/services/matching/helpers/embedding';
import {
  calculateSimilarity,
  calculateIndustryMatch,
  calculateRoleMatch,
  calculateStageMatch,
  calculateLocationMatch,
} from '@/services/matching/helpers/calculateSimilarity';
import { calculateWeightedScore } from '@/services/matching/helpers/calculateScore';
import type { MatchResult } from '@/services/matching/types';

type SkillSelection = { skill: { name: string | null } | null };
type InterestSelection = { interest: { name: string | null } | null };

const extractSkillNames = (skills?: SkillSelection[]) =>
  (skills || [])
    .map(({ skill }) => skill?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);

const extractInterestNames = (interests?: InterestSelection[]) =>
  (interests || [])
    .map(({ interest }) => interest?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);

export class MemberProfileMatcher {
  private embeddingHelper: EmbeddingHelper;
  private embeddingCache: Map<string, number[] | null>;

  constructor(private pool: Pool) {
    this.embeddingHelper = new EmbeddingHelper(pool);
    this.embeddingCache = new Map();
  }

  private async getMemberEmbedding(userId: string): Promise<number[] | null> {
    if (this.embeddingCache.has(userId)) {
      return this.embeddingCache.get(userId) ?? null;
    }
    const embedding = await this.embeddingHelper.ensureEmbedding(
      'user',
      userId,
      'users',
      'id'
    );
    this.embeddingCache.set(userId, embedding ?? null);
    return embedding ?? null;
  }

  /**
   * Find matching teams for a member profile
   */
  async findTeams(
    userId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        // User skills
        skills: { select: { skill: { select: { name: true } } } },
        // Member preferences (optional)
        memberProfile: {
          select: {
            rolePreferences: true,
            industryPreferences: true,
          },
        },
        // Founder/investor preferences (optional)
        founderProfile: { select: { industryPreferences: true, locationPreferences: true } },
        investorProfile: {
          select: { preferredIndustries: true, preferredStages: true, geographicFocus: true },
        },
        // Interests (optional)
        interests: { select: { interest: { select: { name: true } } } },
      },
    });

    if (!user?.isActive) return [];

    const userSkillNames = extractSkillNames(user.skills);

    const rolePrefs = user.memberProfile?.rolePreferences || [];
    const industryPrefs = [
      ...(user.memberProfile?.industryPreferences || []),
      ...(user.founderProfile?.industryPreferences || []),
      ...(user.investorProfile?.preferredIndustries || []),
    ];
    const interestNames = extractInterestNames(user.interests);

    // Flags to relax filters when arrays are empty
    const hasIndustry = industryPrefs.length > 0;
    const hasRole = rolePrefs.length > 0;
    const hasSkills = userSkillNames.length > 0;

    const embedding = await this.getMemberEmbedding(userId);

    if (!embedding) return [];

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
        AND ($6::boolean = false OR (t.industry && $2::text[]))
        AND t.is_hiring = true
        AND (
          ($7::boolean = false AND $8::boolean = false)
          OR (t.hiring_roles && $3::text[])
          OR (t.skills && $5::text[])
        )
      ORDER BY t.embedding <=> $1::vector
      LIMIT $4
      `,
      [
        embedding,
        industryPrefs,
        rolePrefs,
        limit,
        userSkillNames,
        hasIndustry,
        hasRole,
        hasSkills,
      ]
    );

    return this.buildTeamMatches(
      result.rows,
      industryPrefs,
      rolePrefs
    );
  }

  /**
   * Find matching projects for a member profile
   */
  async findProjects(
    userId: string,
    limit: number = MATCHING_CONFIG.limits.default
  ): Promise<MatchResult[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        userType: true,
        skills: { select: { skill: { select: { name: true } } } },
        memberProfile: {
          select: {
            rolePreferences: true,
            industryPreferences: true,
          },
        },
        founderProfile: { select: { industryPreferences: true, locationPreferences: true } },
        investorProfile: {
          select: { preferredIndustries: true, preferredStages: true, geographicFocus: true },
        },
        interests: { select: { interest: { select: { name: true } } } },
      },
    });

    if (!user?.isActive) return [];

    const userSkillNames = extractSkillNames(user.skills);

    const roleRefs = [
      ...(user.memberProfile?.rolePreferences || []),
      ...userSkillNames,
      ...(user.investorProfile ? ['Investor'] : []),
      ...(user.founderProfile ? ['Founder'] : []),
      user.userType === 'INVESTOR' ? ['Investor'] : [],
      user.userType === 'FOUNDER' ? ['Founder'] : [],
      user.userType === 'MEMBER' ? ['Member'] : [],
    ].filter((role): role is string => typeof role === 'string' && role.length > 0);

    const industryRefs = [
      ...(user.memberProfile?.industryPreferences || []),
      ...(user.founderProfile?.industryPreferences || []),
      ...(user.investorProfile?.preferredIndustries || []),
    ];
    const stageRefs = [
      ...(user.investorProfile?.preferredStages || []),
    ];
    const geoRefs = [
      ...(user.founderProfile?.locationPreferences || []),
      ...(user.investorProfile?.geographicFocus || []),
    ];
    const normalizedStageRefs = stageRefs
      .map((stage) => stage?.toLowerCase())
      .filter((stage): stage is string => Boolean(stage));
    const normalizedGeoRefs = geoRefs
      .map((geo) => geo?.toLowerCase())
      .filter((geo): geo is string => Boolean(geo));
    const matchableRoles = Array.from(new Set([...roleRefs, ...userSkillNames]));

    const hasIndustry = industryRefs.length > 0;
    const hasRoleSignals = matchableRoles.length > 0;
    const hasStage = normalizedStageRefs.length > 0;
    const hasGeo = normalizedGeoRefs.length > 0;

    const embedding = await this.getMemberEmbedding(userId);

    if (!embedding) return [];

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
        p.owner_id,
        1 - (p.embedding <=> $1::vector) AS similarity
      FROM projects p
      WHERE p.embedding IS NOT NULL
        AND p.is_public = true
        AND p.is_hiring = true
        AND ($7::boolean = false OR (p.industry && $2::text[]))
        AND ($8::boolean = false OR (p.hiring_roles && $3::text[]))
        AND ($9::boolean = false OR LOWER(COALESCE(p.stage::text, '')) = ANY($4::text[]))
        AND ($10::boolean = false OR LOWER(COALESCE(p.location, '')) = ANY($5::text[]))
      ORDER BY p.embedding <=> $1::vector
      LIMIT $6
      `,
      [
        embedding,
        industryRefs,
        matchableRoles,
        normalizedStageRefs,
        normalizedGeoRefs,
        limit,
        hasIndustry,
        hasRoleSignals,
        hasStage,
        hasGeo,
      ]
    );

    return this.buildProjectMatches(
      result.rows,
      industryRefs,
      roleRefs,
      stageRefs,
      geoRefs,
      userSkillNames,
    );
  }

  private buildTeamMatches(
    rows: any[],
    industries: string[],
    roles: string[]
  ): MatchResult[] {
    const weights = MATCHING_CONFIG.weights.memberProfile;

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );
      const roleSignal = calculateRoleMatch(roles, row.hiring_roles || []);

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: roleSignal,
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
          hiringRoles: row.hiring_roles,
        },
      };
    });
  }

  private buildProjectMatches(
    rows: any[],
    industries: string[],
    roles: string[],
    stageRefs: string[],
    geoRefs: string[],
    skillRefs: string[],
  ): MatchResult[] {
    const weights = MATCHING_CONFIG.weights.memberProfile;

    return rows.map((row) => {
      const similarity = calculateSimilarity(row.similarity);
      const industryMatch = calculateIndustryMatch(
        industries,
        row.industry || []
      );
      const roleSignal = Math.max(
        calculateRoleMatch(roles, row.hiring_roles || []),
        calculateRoleMatch(skillRefs, row.hiring_roles || [])
      );
      const stageMatch = calculateStageMatch(row.stage ?? null, stageRefs);
      const locationMatch = calculateLocationMatch(row.location ?? null, geoRefs);

      const { score } = calculateWeightedScore(
        {
          embedding: similarity,
          industry: industryMatch,
          role: roleSignal,
          stage: stageMatch,
          location: locationMatch,
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
          ownerId: row.owner_id,
          stage: row.stage,
          location: row.location,
        },
      };
    });
  }
}