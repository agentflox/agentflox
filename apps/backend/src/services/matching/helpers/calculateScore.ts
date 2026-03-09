import type { MatchingWeights, ScoreBreakdown } from '../types';

export interface ScoreComponents {
  embedding: number;
  industry: number;
  role?: number;
  stage?: number;
  location?: number;
  boost?: number;
}

/**
 * Calculate weighted final score with optional breakdown
 */
export function calculateWeightedScore(
  components: ScoreComponents,
  weights: MatchingWeights,
  includeBreakdown = false
): { score: number; breakdown?: ScoreBreakdown } {
  let score = weights.embedding * components.embedding;
  score += weights.industry * components.industry;

  if (weights.role !== undefined && components.role !== undefined) {
    score += weights.role * components.role;
  }

  if (weights.stage !== undefined && components.stage !== undefined) {
    score += weights.stage * components.stage;
  }

  if (weights.location !== undefined && components.location !== undefined) {
    score += weights.location * components.location;
  }

  // Apply boost if provided
  if (components.boost) {
    score = Math.min(1, score + components.boost);
  }

  // Normalize to [0, 1]
  score = Math.max(0, Math.min(1, score));

  const result: { score: number; breakdown?: ScoreBreakdown } = { score };

  if (includeBreakdown) {
    result.breakdown = {
      embedding: components.embedding,
      industry: components.industry,
      role: components.role,
      stage: components.stage,
      location: components.location,
      boosts: components.boost,
    };
  }

  return result;
}

/**
 * Sort and limit matches by final score
 */
export function finalizeMatches<T extends { finalScore: number }>(
  matches: T[],
  limit: number
): T[] {
  return matches
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, Math.max(0, limit));
}

/**
 * Filter matches by threshold
 */
export function filterByThreshold<T extends { finalScore: number }>(
  matches: T[],
  threshold: number
): T[] {
  return matches.filter((m) => m.finalScore >= threshold);
}