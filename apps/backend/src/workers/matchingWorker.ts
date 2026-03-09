import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import {
  processAllMatches,
  // Project-centric
  findMatchingProfilesForProjectHiring,
  findMatchingTeamsForProjectHiring,
  findMatchingProposalsForProjectHiring,
  // Proposal-centric
  findMatchingProjectsForProposal,
  findMatchingTeamsForProposal,
  findMatchingProfilesForProposal,
  // Member profile-centric
  findMatchingTeamsForMemberProfile,
  findMatchingProjectsForMemberProfile,
  // Team-centric
  findMatchingProjectsForTeam,
  findMatchingProposalsForTeam,
  findMatchingProfilesForTeamHiring,
} from '@/services/matching/matchingService';
import { sendMatchNotification } from '@/services/matching/utils/notificationUtils';
import { filterByThreshold } from '@/services/matching/helpers/calculateScore';
import type { MatchingJobData } from '@/services/matching/processors/queue';
import type { MatchNotification } from '@/services/matching/types';
import { workerQueueOptions } from '@/services/matching/config/worker';
import env from '@/config/env';
import { prisma } from '@/lib/prisma';

// Helper function to create notifications from matches
function createNotifications(
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

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const limit = Math.max(1, concurrency);
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const runners = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current]);
    }
  });

  await Promise.all(runners);
  return results;
}

export const matchingWorker = new Worker<MatchingJobData>(
  'matching',
  async (job: Job<MatchingJobData>) => {
    const { type, entityId } = job.data;

    console.log(`[Matching Worker] Processing job: ${type}${entityId ? ` (${entityId})` : ''}`);

    const threshold = parseFloat(env.MATCHING_SCORE_THRESHOLD);
    const batchSize = Number.parseInt(env.MATCHING_BATCH_SIZE || '200', 10);
    const notificationConcurrency = Number.parseInt(env.MATCHING_NOTIFICATION_CONCURRENCY || '10', 10);

    try {
      switch (type) {
        case 'full':
          // Process all matches
          const notifications = await processAllMatches({ threshold, batchSize, enableLogging: true });
          console.log(`[Matching Worker] Found ${notifications.length} matches`);
          
          // Send notifications
          await runWithConcurrency(notifications, notificationConcurrency, async (notification) => {
            try {
              await sendMatchNotification(notification);
            } catch (error) {
              console.error(`[Matching Worker] Failed to send notification:`, error);
            }
          });
          
          return { processed: notifications.length, type: 'full' };

        case 'project':
          if (!entityId) throw new Error('entityId required for project matching');
          // Hiring context: teams, profiles, proposals
          const [teamsForProject, profilesForProject, proposalsForProject] = await Promise.all([
            findMatchingTeamsForProjectHiring(entityId),
            findMatchingProfilesForProjectHiring(entityId),
            findMatchingProposalsForProjectHiring(entityId),
          ]);
          
          // Get project owner for notifications
          const project = await prisma.project.findUnique({
            where: { id: entityId },
            select: { ownerId: true, name: true },
          });
          
          if (!project) {
            throw new Error(`Project ${entityId} not found`);
          }

          // Filter by threshold and send notifications
          const projectNotifications = [
            ...createNotifications(
              project.ownerId,
              filterByThreshold(profilesForProject, threshold),
              'profile',
              `Candidate matches your hiring roles for project ${project.name}`
            ),
            ...createNotifications(
              project.ownerId,
              filterByThreshold(teamsForProject, threshold),
              'team',
              `Team aligns with your hiring needs for project ${project.name}`
            ),
            ...createNotifications(
              project.ownerId,
              filterByThreshold(proposalsForProject, threshold),
              'proposal',
              `Proposal seeking roles aligned with your hiring for ${project.name}`
            ),
          ];

          console.log(`[Matching Worker] Found ${projectNotifications.length} matches above threshold for project ${entityId}`);
          
          await runWithConcurrency(projectNotifications, notificationConcurrency, async (notification) => {
            try {
              await sendMatchNotification(notification);
            } catch (error) {
              console.error(`[Matching Worker] Failed to send notification:`, error);
            }
          });

          return {
            type: 'project',
            entityId,
            teamsForHiring: teamsForProject.length,
            profilesForHiring: profilesForProject.length,
            proposalsForHiring: proposalsForProject.length,
            notificationsSent: projectNotifications.length,
          };

        case 'proposal':
          if (!entityId) throw new Error('entityId required for proposal matching');
          // Proposal-centric: projects, teams, profiles
          const [projectsForProposal, teamsForProposal, profilesForProposal] = await Promise.all([
            findMatchingProjectsForProposal(entityId),
            findMatchingTeamsForProposal(entityId),
            findMatchingProfilesForProposal(entityId),
          ]);
          
          // Get proposal owner for notifications
          const proposal = await prisma.proposal.findUnique({
            where: { id: entityId },
            select: { userId: true, title: true },
          });
          
          if (!proposal) {
            throw new Error(`Proposal ${entityId} not found`);
          }

          const proposalNotifications = [
            ...createNotifications(
              proposal.userId,
              filterByThreshold(projectsForProposal, threshold),
              'project',
              `Project matches your proposal context`
            ),
            ...createNotifications(
              proposal.userId,
              filterByThreshold(teamsForProposal, threshold),
              'team',
              `Team matches your proposal context`
            ),
            ...createNotifications(
              proposal.userId,
              filterByThreshold(profilesForProposal, threshold),
              'profile',
              `Candidate matches your proposal needs`
            ),
          ];

          console.log(`[Matching Worker] Found ${proposalNotifications.length} matches above threshold for proposal ${entityId}`);
          
          await runWithConcurrency(proposalNotifications, notificationConcurrency, async (notification) => {
            try {
              await sendMatchNotification(notification);
            } catch (error) {
              console.error(`[Matching Worker] Failed to send notification:`, error);
            }
          });

          return {
            type: 'proposal',
            entityId,
            projectsForProposal: projectsForProposal.length,
            teamsForProposal: teamsForProposal.length,
            profilesForProposal: profilesForProposal.length,
            notificationsSent: proposalNotifications.length,
          };

        case 'team':
          if (!entityId) throw new Error('entityId required for team matching');
          // Team-centric: projects, proposals, and profiles for team hiring
          const [projectsForTeam, proposalsForTeam, profilesForTeam] = await Promise.all([
            findMatchingProjectsForTeam(entityId),
            findMatchingProposalsForTeam(entityId),
            findMatchingProfilesForTeamHiring(entityId),
          ]);
          
          // Get team owner for notifications
          const team = await prisma.team.findUnique({
            where: { id: entityId },
            select: { ownerId: true, name: true },
          });
          
          if (!team) {
            throw new Error(`Team ${entityId} not found`);
          }

          const teamNotifications = [
            ...createNotifications(
              team.ownerId,
              filterByThreshold(projectsForTeam, threshold),
              'project',
              `Project matches your team's capabilities`
            ),
            ...createNotifications(
              team.ownerId,
              filterByThreshold(proposalsForTeam, threshold),
              'proposal',
              `Proposal matches your team's expertise`
            ),
            ...createNotifications(
              team.ownerId,
              filterByThreshold(profilesForTeam, threshold),
              'profile',
              `Candidate matches your team's hiring needs`
            ),
          ];

          console.log(`[Matching Worker] Found ${teamNotifications.length} matches above threshold for team ${entityId}`);
          
          await runWithConcurrency(teamNotifications, notificationConcurrency, async (notification) => {
            try {
              await sendMatchNotification(notification);
            } catch (error) {
              console.error(`[Matching Worker] Failed to send notification:`, error);
            }
          });

          return {
            type: 'team',
            entityId,
            projectsForTeam: projectsForTeam.length,
            proposalsForTeam: proposalsForTeam.length,
            profilesForTeam: profilesForTeam.length,
            notificationsSent: teamNotifications.length,
          };

        case 'profile':
          if (!entityId) throw new Error('entityId required for profile (userId) matching');
          // Member profile-centric: teams and projects hiring
          const [teamsForMember, projectsForMember] = await Promise.all([
            findMatchingTeamsForMemberProfile(entityId),
            findMatchingProjectsForMemberProfile(entityId),
          ]);
          
          // Filter by threshold and send notifications
          const profileNotifications = [
            ...createNotifications(
              entityId,
              filterByThreshold(teamsForMember, threshold),
              'team',
              'Team hiring for your preferred roles'
            ),
            ...createNotifications(
              entityId,
              filterByThreshold(projectsForMember, threshold),
              'project',
              'Project hiring for your preferred roles'
            ),
          ];

          console.log(`[Matching Worker] Found ${teamsForMember.length} teams and ${projectsForMember.length} projects for user ${entityId}`);
          console.log(`[Matching Worker] ${profileNotifications.length} matches above threshold (${threshold}). Details:`);
          
          // Log match details for debugging
          projectsForMember.forEach((match) => {
            console.log(`[Matching Worker]   Project: ${match.metadata.name}, similarity: ${match.similarity.toFixed(3)}, finalScore: ${match.finalScore.toFixed(3)}`);
          });
          
          await runWithConcurrency(profileNotifications, notificationConcurrency, async (notification) => {
            try {
              await sendMatchNotification(notification);
              console.log(`[Matching Worker] Sent notification for ${notification.matchType} ${notification.matchId} to user ${entityId}`);
            } catch (error) {
              console.error(`[Matching Worker] Failed to send notification:`, error);
            }
          });

          return {
            type: 'profile',
            entityId,
            teamsForMember: teamsForMember.length,
            projectsForMember: projectsForMember.length,
            notificationsSent: profileNotifications.length,
            threshold,
          };

        default:
          throw new Error(`Unknown matching type: ${type}`);
      }
    } catch (error) {
      console.error(`[Matching Worker] Error processing job:`, error);
      throw error;
    }
  },
  workerQueueOptions
);

// Event handlers
matchingWorker.on('completed', (job) => {
  console.log(`[Matching Worker] Job ${job.id} completed`);
});

matchingWorker.on('failed', (job, err) => {
  console.error(`[Matching Worker] Job ${job?.id} failed:`, err);
});

matchingWorker.on('error', (err) => {
  console.error(`[Matching Worker] Error:`, err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Matching Worker] Shutting down gracefully...');
  await matchingWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Matching Worker] Shutting down gracefully...');
  await matchingWorker.close();
  process.exit(0);
});

