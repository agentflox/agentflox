// src/services/matching/processors/batch.ts
import { Pool } from 'pg';
import { prisma } from '@/lib/prisma';
import env from '@/config/env';
import { MATCHING_CONFIG, ELIGIBLE_SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES } from '../config/shared';
import { ProjectMatcher } from '../matchers/project';
import { ProposalMatcher } from '../matchers/proposal';
import { MemberProfileMatcher } from '../matchers/profile';
import { TeamMatcher } from '../matchers/team';
import { filterByThreshold } from '../helpers/calculateScore';
import { logger } from '../lib/logger';
import { matchingErrors, batchDuration, batchProcessedEntities } from '../lib/metrics';
import type { MatchNotification } from '../types';

interface BatchProcessorOptions {
  threshold?: number;
  batchSize?: number;
  enableLogging?: boolean;
}

export class MatchBatchProcessor {
  private projectMatcher: ProjectMatcher;
  private proposalMatcher: ProposalMatcher;
  private memberProfileMatcher: MemberProfileMatcher;
  private teamMatcher: TeamMatcher;
  private threshold: number;
  private batchSize: number;
  private enableLogging: boolean;

  constructor(
    private pool: Pool,
    options: BatchProcessorOptions = {}
  ) {
    this.projectMatcher = new ProjectMatcher(pool);
    this.proposalMatcher = new ProposalMatcher(pool);
    this.memberProfileMatcher = new MemberProfileMatcher(pool);
    this.teamMatcher = new TeamMatcher(pool);

    this.threshold = options.threshold ?? parseFloat(env.MATCHING_SCORE_THRESHOLD || '0.85');
    this.batchSize = options.batchSize ?? Number.parseInt(env.MATCHING_BATCH_SIZE || '200', 10);
    this.enableLogging = options.enableLogging ?? true;
  }

  // Update processAll() to include team matches with parallel processing:
  async processAll(): Promise<MatchNotification[]> {
    const notifications: MatchNotification[] = [];

    try {
      logger.info('Starting parallel batch processing for all entity types');

      // Run in parallel instead of sequentially for better performance
      const results = await Promise.allSettled([
        this.processProjectMatches(),
        this.processTeamMatches(),
        this.processProposalMatches(),
        this.processMemberProfileMatches(),
      ]);

      // Process results and collect notifications
      const entityTypes = ['projects', 'teams', 'proposals', 'profiles'];
      results.forEach((result, index) => {
        const entityType = entityTypes[index];

        if (result.status === 'fulfilled') {
          notifications.push(...result.value);
          logger.info({
            entityType,
            notificationCount: result.value.length,
          }, 'Entity type processing completed successfully');
        } else {
          logger.error({
            entityType,
            error: result.reason?.message || 'Unknown error',
          }, 'Entity type processing failed');

          matchingErrors.inc({
            entity_type: entityType,
            error_type: 'batch_processing_failed',
            operation: 'processAll',
          });
        }
      });

      this.log(`Generated ${notifications.length} match notifications from parallel processing`);

      return this.deduplicateNotifications(notifications);
    } catch (error) {
      logger.error({ error }, 'Error in parallel batch processing');
      throw error;
    }
  }

  /**
   * Process project hiring matches
   */
  private async processProjectMatches(): Promise<MatchNotification[]> {
    const notifications: MatchNotification[] = [];

    const projects = await prisma.project.findMany({
      where: {
        isPublic: true,
        isActive: true,
        isHiring: true,
        hiringRoles: { isEmpty: false },
      },
      select: { id: true, name: true, ownerId: true },
      take: this.batchSize,
    });

    this.log(`Processing ${projects.length} hiring projects`);

    for (const project of projects) {
      try {
        const [profiles, teams, proposals] = await Promise.all([
          this.projectMatcher.findProfilesForHiring(project.id, 20),
          this.projectMatcher.findTeamsForHiring(project.id, 20),
          this.projectMatcher.findProposalsForHiring(project.id, 20),
        ]);

        // Filter by threshold and create notifications
        notifications.push(
          ...this.createNotifications(
            project.ownerId,
            filterByThreshold(profiles, this.threshold),
            'profile',
            `Candidate matches your hiring roles for project ${project.name}`
          ),
          ...this.createNotifications(
            project.ownerId,
            filterByThreshold(teams, this.threshold),
            'team',
            `Team aligns with your hiring needs for project ${project.name}`
          ),
          ...this.createNotifications(
            project.ownerId,
            filterByThreshold(proposals, this.threshold),
            'proposal',
            `Proposal seeking roles aligned with your hiring for ${project.name}`
          )
        );
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error);
      }
    }

    return notifications;
  }

  /**
   * Process team matches
   */
  private async processTeamMatches(): Promise<MatchNotification[]> {
    const notifications: MatchNotification[] = [];

    const teams = await prisma.team.findMany({
      where: {
        isActive: true,
      },
      select: { id: true, name: true, ownerId: true, isHiring: true },
      take: this.batchSize,
    });

    this.log(`Processing ${teams.length} teams`);

    for (const team of teams) {
      try {
        const [projects, proposals, profiles, collaborationTeams] = await Promise.all([
          this.teamMatcher.findProjects(team.id, 20),
          this.teamMatcher.findProposals(team.id, 20),
          team.isHiring ? this.teamMatcher.findProfilesForHiring(team.id, 20) : Promise.resolve([]),
          this.teamMatcher.findTeamsForCollaboration(team.id, 20),
        ]);

        notifications.push(
          ...this.createNotifications(
            team.ownerId,
            filterByThreshold(projects, this.threshold),
            'project',
            `Project matches your team's capabilities`
          ),
          ...this.createNotifications(
            team.ownerId,
            filterByThreshold(proposals, this.threshold),
            'proposal',
            `Proposal matches your team's expertise`
          ),
          ...this.createNotifications(
            team.ownerId,
            filterByThreshold(profiles, this.threshold),
            'profile',
            `Candidate matches your team's hiring needs`
          ),
          ...this.createNotifications(
            team.ownerId,
            filterByThreshold(collaborationTeams, this.threshold),
            'team',
            `Team has complementary skills for collaboration`
          )
        );
      } catch (error) {
        console.error(`Error processing team ${team.id}:`, error);
      }
    }

    return notifications;
  }

  /**
   * Process proposal matches
   */
  private async processProposalMatches(): Promise<MatchNotification[]> {
    const notifications: MatchNotification[] = [];

    const proposals = await prisma.proposal.findMany({
      where: {
        visibility: 'PUBLIC',
      },
      select: { id: true, userId: true },
      take: this.batchSize,
    });

    this.log(`Processing ${proposals.length} public proposals`);

    for (const proposal of proposals) {
      try {
        const [projects, teams, profiles] = await Promise.all([
          this.proposalMatcher.findProjects(proposal.id, 20),
          this.proposalMatcher.findTeams(proposal.id, 20),
          this.proposalMatcher.findProfiles(proposal.id, 20),
        ]);

        notifications.push(
          ...this.createNotifications(
            proposal.userId,
            filterByThreshold(projects, this.threshold),
            'project',
            'Project matches your proposal context'
          ),
          ...this.createNotifications(
            proposal.userId,
            filterByThreshold(teams, this.threshold),
            'team',
            'Team matches your proposal context'
          ),
          ...this.createNotifications(
            proposal.userId,
            filterByThreshold(profiles, this.threshold),
            'profile',
            'Candidate matches your proposal needs'
          )
        );
      } catch (error) {
        console.error(`Error processing proposal ${proposal.id}:`, error);
      }
    }

    return notifications;
  }

  /**
   * Process member profile matches
   */
  private async processMemberProfileMatches(): Promise<MatchNotification[]> {
    const notifications: MatchNotification[] = [];

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
      take: this.batchSize,
    });

    this.log(`Processing ${users.length} users for user-centric matches`);

    for (const user of users) {
      try {
        const [teams, projects] = await Promise.all([
          this.memberProfileMatcher.findTeams(user.id, 20),
          this.memberProfileMatcher.findProjects(user.id, 20),
        ]);

        notifications.push(
          ...this.createNotifications(
            user.id,
            filterByThreshold(teams, this.threshold),
            'team',
            'Team hiring for your preferred roles'
          ),
          ...this.createNotifications(
            user.id,
            filterByThreshold(projects, this.threshold),
            'project',
            'Project hiring for your preferred roles'
          )
        );
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    return notifications;
  }

  /**
   * Create notifications from match results
   */
  private createNotifications(
    userId: string,
    matches: any[],
    matchType: 'project' | 'proposal' | 'team' | 'profile',
    reason: string
  ): MatchNotification[] {
    return matches.map((match) => ({
      userId,
      matchType,
      matchId: match.id,
      matchTitle: match.metadata.name || match.metadata.title || 'Match',
      score: match.finalScore,
      reason,
      metadata: match.metadata,
    }));
  }

  /**
   * Deduplicate notifications by userId + matchId + matchType
   */
  private deduplicateNotifications(
    notifications: MatchNotification[]
  ): MatchNotification[] {
    const seen = new Map<string, MatchNotification>();

    for (const notification of notifications) {
      const key = `${notification.userId}-${notification.matchId}-${notification.matchType}`;

      const existing = seen.get(key);
      if (!existing || notification.score > existing.score) {
        seen.set(key, notification);
      }
    }

    return Array.from(seen.values());
  }

  private log(message: string): void {
    if (this.enableLogging) {
      console.log(`[MatchBatchProcessor] ${message}`);
    }
  }
}