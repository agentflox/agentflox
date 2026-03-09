import { describe, it, expect, beforeEach } from '@jest/globals';
import { calculateWeightedScore, filterByThreshold } from '../../../src/services/matching/helpers/calculateScore';
import type { ScoreComponents } from '../../../src/services/matching/helpers/calculateScore';

describe('calculateScore', () => {
    describe('calculateWeightedScore', () => {
        it('should calculate weighted score correctly', () => {
            const components: ScoreComponents = {
                embedding: 0.9,
                industry: 0.8,
                role: 0.7,
            };

            const weights = {
                embedding: 0.5,
                industry: 0.3,
                role: 0.2,
            };

            const result = calculateWeightedScore(components, weights);

            // Expected: (0.9 * 0.5) + (0.8 * 0.3) + (0.7 * 0.2) = 0.45 + 0.24 + 0.14 = 0.83
            expect(result.score).toBeCloseTo(0.83, 2);
        });

        it('should normalize score to [0, 1] range', () => {
            const components: ScoreComponents = {
                embedding: 1.5, // Artificially high
                industry: 1.0,
            };

            const weights = {
                embedding: 0.8,
                industry: 0.3, // Weights don't sum to 1
            };

            const result = calculateWeightedScore(components, weights);

            // Score should be clamped to 1.0
            expect(result.score).toBeLessThanOrEqual(1.0);
            expect(result.score).toBeGreaterThanOrEqual(0.0);
        });

        it('should handle boost correctly', () => {
            const components: ScoreComponents = {
                embedding: 0.8,
                industry: 0.7,
                boost: 0.15,
            };

            const weights = {
                embedding: 0.6,
                industry: 0.4,
            };

            const result = calculateWeightedScore(components, weights);

            // Base score: (0.8 * 0.6) + (0.7 * 0.4) = 0.48 + 0.28 = 0.76
            // With boost: min(1, 0.76 + 0.15) = 0.91
            expect(result.score).toBeCloseTo(0.91, 2);
        });

        it('should cap boosted score at 1.0', () => {
            const components: ScoreComponents = {
                embedding: 0.9,
                industry: 0.9,
                boost: 0.5, // Large boost
            };

            const weights = {
                embedding: 0.6,
                industry: 0.4,
            };

            const result = calculateWeightedScore(components, weights);

            // Even with large boost, score should not exceed 1.0
            expect(result.score).toBe(1.0);
        });

        it('should include breakdown when requested', () => {
            const components: ScoreComponents = {
                embedding: 0.9,
                industry: 0.8,
                role: 0.7,
                stage: 0.6,
                location: 0.5,
                boost: 0.1,
            };

            const weights = {
                embedding: 0.5,
                industry: 0.2,
                role: 0.1,
                stage: 0.1,
                location: 0.1,
            };

            const result = calculateWeightedScore(components, weights, true);

            expect(result.breakdown).toBeDefined();
            expect(result.breakdown?.embedding).toBe(0.9);
            expect(result.breakdown?.industry).toBe(0.8);
            expect(result.breakdown?.role).toBe(0.7);
            expect(result.breakdown?.stage).toBe(0.6);
            expect(result.breakdown?.location).toBe(0.5);
            expect(result.breakdown?.boosts).toBe(0.1);
        });

        it('should handle missing optional components', () => {
            const components: ScoreComponents = {
                embedding: 0.9,
                industry: 0.8,
                // role, stage, location not provided
            };

            const weights = {
                embedding: 0.6,
                industry: 0.4,
                role: 0.1, // Weight provided but component missing
            };

            const result = calculateWeightedScore(components, weights);

            // Should only use embedding and industry
            // Expected: (0.9 * 0.6) + (0.8 * 0.4) = 0.54 + 0.32 = 0.86
            expect(result.score).toBeCloseTo(0.86, 2);
        });

        it('should handle zero weights gracefully', () => {
            const components: ScoreComponents = {
                embedding: 0.9,
                industry: 0.8,
            };

            const weights = {
                embedding: 0.0,
                industry: 1.0,
            };

            const result = calculateWeightedScore(components, weights);

            // Expected: (0.9 * 0) + (0.8 * 1) = 0 + 0.8 = 0.8
            expect(result.score).toBe(0.8);
        });
    });

    describe('filterByThreshold', () => {
        const matches = [
            { id: '1', finalScore: 0.95 },
            { id: '2', finalScore: 0.87 },
            { id: '3', finalScore: 0.76 },
            { id: '4', finalScore: 0.65 },
            { id: '5', finalScore: 0.50 },
        ];

        it('should filter matches above threshold', () => {
            const filtered = filterByThreshold(matches, 0.8);

            expect(filtered).toHaveLength(2);
            expect(filtered[0].id).toBe('1');
            expect(filtered[1].id).toBe('2');
        });

        it('should include matches equal to threshold', () => {
            const filtered = filterByThreshold(matches, 0.87);

            expect(filtered).toHaveLength(2);
            expect(filtered.some(m => m.finalScore === 0.87)).toBe(true);
        });

        it('should return empty array if no matches above threshold', () => {
            const filtered = filterByThreshold(matches, 0.99);

            expect(filtered).toHaveLength(0);
        });

        it('should return all matches if threshold is 0', () => {
            const filtered = filterByThreshold(matches, 0);

            expect(filtered).toHaveLength(5);
        });
    });
});
