/**
 * Calculate cosine similarity from distance
 * pgvector's <=> operator returns cosine distance (1 - similarity)
 */
export function calculateSimilarity(distance: number): number {
  return Math.max(0, Math.min(1, 1 - distance));
}

/**
 * Calculate Jaccard similarity between two string arrays (case-insensitive)
 */
export function calculateJaccardSimilarity(
  a: string[] | null | undefined,
  b: string[] | null | undefined
): number {
  const arrA = normalizeArray(a);
  const arrB = normalizeArray(b);

  if (arrA.length === 0 || arrB.length === 0) {
    return 0;
  }

  const setA = new Set(arrA);
  const setB = new Set(arrB);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate industry match score using Jaccard similarity
 */
export function calculateIndustryMatch(
  sourceIndustries: string[],
  targetIndustries: string[]
): number {
  return calculateJaccardSimilarity(sourceIndustries, targetIndustries);
}

/**
 * Calculate stage match score (exact or neutral)
 */
export function calculateStageMatch(
  sourceStage: string | null,
  targetStages: string[]
): number {
  if (!sourceStage || targetStages.length === 0) {
    return 0.5; // Neutral score if no stage info
  }

  return targetStages
    .map((s) => s.toLowerCase())
    .includes(sourceStage.toLowerCase())
    ? 1.0
    : 0.0;
}

/**
 * Calculate location match score (substring matching)
 */
export function calculateLocationMatch(
  sourceLocation: string | null,
  targetLocations: string[]
): number {
  if (!sourceLocation || targetLocations.length === 0) {
    return 0.5; // Neutral score if no location info
  }

  const sourceLower = sourceLocation.toLowerCase();
  return targetLocations.some((loc) => loc.toLowerCase().includes(sourceLower))
    ? 1.0
    : 0.0;
}

/**
 * Calculate role overlap score
 */
export function calculateRoleMatch(
  sourceRoles: string[] | null | undefined,
  targetRoles: string[] | null | undefined
): number {
  return calculateJaccardSimilarity(sourceRoles, targetRoles);
}

/**
 * Normalize array: convert to lowercase strings and filter empty
 */
function normalizeArray(arr: string[] | null | undefined): string[] {
  return (arr || [])
    .filter(Boolean)
    .map((x) => String(x).toLowerCase().trim());
}