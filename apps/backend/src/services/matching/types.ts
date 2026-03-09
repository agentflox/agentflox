export interface MatchResult {
  id: string;
  similarity: number;
  finalScore: number;
  metadata: Record<string, any>;
  breakdown?: ScoreBreakdown;
}

export interface ScoreBreakdown {
  embedding: number;
  industry: number;
  role?: number;
  stage?: number;
  location?: number;
  boosts?: number;
}

export interface MatchNotification {
  userId: string;
  matchType: 'project' | 'proposal' | 'team' | 'profile';
  matchId: string;
  matchTitle: string;
  score: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingRow {
  embedding: number[] | null;
  industry?: string[];
  location?: string;
  stage?: string;
  hiring_roles?: string[];
  [key: string]: any;
}

export interface MatchingWeights {
  embedding: number;
  industry: number;
  role?: number;
  stage?: number;
  location?: number;
}

export type MatchEntityType = 'project' | 'proposal' | 'team' | 'profile';