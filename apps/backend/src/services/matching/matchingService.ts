import { Pool } from 'pg';
import env from '@/config/env';
import { ProjectMatcher } from './matchers/project';
import { ProposalMatcher } from './matchers/proposal';
import { MemberProfileMatcher } from './matchers/profile';
import { TeamMatcher } from './matchers/team';
import { MatchBatchProcessor } from './processors/batch';
import { logger } from './lib/logger';
import { dbPoolConnections } from './lib/metrics';

// Export types
export * from './types';
export * from './config/shared';
export * from './config/queue';
export * from './config/worker';

// Create connection pool with production configuration
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: Number.parseInt(env.MATCHING_DB_POOL_MAX || '100', 10), // Maximum pool size
  min: Number.parseInt(env.MATCHING_DB_POOL_MIN || '10', 10), // Minimum idle connections
  idleTimeoutMillis: Number.parseInt(env.MATCHING_DB_POOL_IDLE_TIMEOUT_MS || '30000', 10), // Close idle connections after 30s
  connectionTimeoutMillis: Number.parseInt(env.MATCHING_DB_POOL_CONNECTION_TIMEOUT_MS || '10000', 10), // Fail fast if can't get connection in 10s
  statement_timeout: Number.parseInt(env.MATCHING_DB_STATEMENT_TIMEOUT_MS || '30000', 10), // Kill queries running > 30s
  query_timeout: Number.parseInt(env.MATCHING_DB_QUERY_TIMEOUT_MS || '30000', 10),

  // Graceful shutdown
  allowExitOnIdle: false,

  // Error handling
  onError: (err, client) => {
    logger.error({ error: err.message }, 'Database pool error');
  },
});

// Monitor pool health
setInterval(() => {
  dbPoolConnections.set({ state: 'total' }, pool.totalCount);
  dbPoolConnections.set({ state: 'idle' }, pool.idleCount);
  dbPoolConnections.set({ state: 'waiting' }, pool.waitingCount);
}, 5000);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing matching service pool');
  await pool.end();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing matching service pool');
  await pool.end();
});

// Singleton instances
let projectMatcherInstance: ProjectMatcher;
let proposalMatcherInstance: ProposalMatcher;
let memberProfileMatcherInstance: MemberProfileMatcher;
let teamMatcherInstance: TeamMatcher; // ADD THIS

/**
 * Get ProjectMatcher instance
 */
export function getProjectMatcher(): ProjectMatcher {
  if (!projectMatcherInstance) {
    projectMatcherInstance = new ProjectMatcher(pool);
  }
  return projectMatcherInstance;
}

/**
 * Get ProposalMatcher instance
 */
export function getProposalMatcher(): ProposalMatcher {
  if (!proposalMatcherInstance) {
    proposalMatcherInstance = new ProposalMatcher(pool);
  }
  return proposalMatcherInstance;
}

/**
 * Get MemberProfileMatcher instance
 */
export function getMemberProfileMatcher(): MemberProfileMatcher {
  if (!memberProfileMatcherInstance) {
    memberProfileMatcherInstance = new MemberProfileMatcher(pool);
  }
  return memberProfileMatcherInstance;
}

/**
 * Get TeamMatcher instance
 */
export function getTeamMatcher(): TeamMatcher {
  if (!teamMatcherInstance) {
    teamMatcherInstance = new TeamMatcher(pool);
  }
  return teamMatcherInstance;
}

/**
 * Process all matches (batch processing)
 */
export async function processAllMatches(options?: {
  threshold?: number;
  batchSize?: number;
  enableLogging?: boolean;
}) {
  const processor = new MatchBatchProcessor(pool, options);
  return processor.processAll();
}

// Convenience exports for direct matching functions

// Project matching
export const findMatchingProfilesForProjectHiring = (projectId: string, limit?: number) =>
  getProjectMatcher().findProfilesForHiring(projectId, limit);

export const findMatchingTeamsForProjectHiring = (projectId: string, limit?: number) =>
  getProjectMatcher().findTeamsForHiring(projectId, limit);

export const findMatchingProposalsForProjectHiring = (projectId: string, limit?: number) =>
  getProjectMatcher().findProposalsForHiring(projectId, limit);

// Proposal matching
export const findMatchingProjectsForProposal = (proposalId: string, limit?: number) =>
  getProposalMatcher().findProjects(proposalId, limit);

export const findMatchingTeamsForProposal = (proposalId: string, limit?: number) =>
  getProposalMatcher().findTeams(proposalId, limit);

export const findMatchingProfilesForProposal = (proposalId: string, limit?: number) =>
  getProposalMatcher().findProfiles(proposalId, limit);

// Member profile matching
export const findMatchingTeamsForMemberProfile = (userId: string, limit?: number) =>
  getMemberProfileMatcher().findTeams(userId, limit);

export const findMatchingProjectsForMemberProfile = (userId: string, limit?: number) =>
  getMemberProfileMatcher().findProjects(userId, limit);

// Team matching (NEW)
export const findMatchingProjectsForTeam = (teamId: string, limit?: number) =>
  getTeamMatcher().findProjects(teamId, limit);

export const findMatchingProposalsForTeam = (teamId: string, limit?: number) =>
  getTeamMatcher().findProposals(teamId, limit);

export const findMatchingProfilesForTeamHiring = (teamId: string, limit?: number) =>
  getTeamMatcher().findProfilesForHiring(teamId, limit);

export const findMatchingTeamsForCollaboration = (teamId: string, limit?: number) =>
  getTeamMatcher().findTeamsForCollaboration(teamId, limit);