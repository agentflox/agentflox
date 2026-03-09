import { Pool } from 'pg';
import type { MatchResult } from '../types';
import { logger } from '../lib/logger';
import { withSpan } from '../lib/tracer';

export interface BulkVectorSearchResult {
    sourceId: string;
    targetId: string;
    similarity: number;
    metadata: Record<string, any>;
}

/**
 * Execute bulk vector search for multiple source entities
 * This eliminates N+1 queries by fetching matches for all sources in one query
 */
export async function bulkVectorSearch(
    pool: Pool,
    sourceTable: string,
    sourceIds: string[],
    targetTable: string,
    targetColumns: string[],
    filters: {
        industries?: string[];
        roles?: string[];
        isActive?: boolean;
        isPublic?: boolean;
        isHiring?: boolean;
    },
    limit: number = 20
): Promise<Map<string, MatchResult[]>> {
    return withSpan('bulkVectorSearch', {
        sourceTable,
        targetTable,
        sourceCount: sourceIds.length,
    }, async (span) => {
        if (sourceIds.length === 0) {
            return new Map();
        }

        logger.info({
            sourceTable,
            targetTable,
            sourceCount: sourceIds.length,
            limit,
        }, 'Executing bulk vector search');

        // Build dynamic SQL for bulk search
        const selectCols = targetColumns.map(col => `t.${col}`).join(', ');

        let whereConditions = ['t.embedding IS NOT NULL'];
        const params: any[] = [sourceIds];
        let paramIndex = 2;

        if (filters.isActive !== undefined) {
            whereConditions.push(`t.is_active = $${paramIndex++}`);
            params.push(filters.isActive);
        }

        if (filters.isPublic !== undefined) {
            whereConditions.push(`t.is_public = $${paramIndex++}`);
            params.push(filters.isPublic);
        }

        if (filters.isHiring !== undefined) {
            whereConditions.push(`t.is_hiring = $${paramIndex++}`);
            params.push(filters.isHiring);
        }

        if (filters.industries && filters.industries.length > 0) {
            whereConditions.push(`t.industry && $${paramIndex++}::text[]`);
            params.push(filters.industries);
        }

        if (filters.roles && filters.roles.length > 0) {
            whereConditions.push(`(t.hiring_roles && $${paramIndex}::text[] OR t.skills && $${paramIndex}::text[])`);
            params.push(filters.roles);
            paramIndex++;
        }

        params.push(limit);

        const query = `
      WITH source_entities AS (
        SELECT id, embedding 
        FROM ${sourceTable}
        WHERE id = ANY($1::uuid[])
          AND embedding IS NOT NULL
      )
      SELECT 
        s.id AS source_id,
        ${selectCols},
        1 - (t.embedding <=> s.embedding) AS similarity
      FROM source_entities s
      CROSS JOIN LATERAL (
        SELECT ${targetColumns.join(', ')}, embedding
        FROM ${targetTable} t
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY t.embedding <=> s.embedding
        LIMIT $${paramIndex}
      ) t
      ORDER BY s.id, similarity DESC
    `;

        try {
            const result = await pool.query(query, params);

            // Group results by source_id
            const matchesBySource = new Map<string, MatchResult[]>();

            result.rows.forEach(row => {
                const sourceId = row.source_id;

                if (!matchesBySource.has(sourceId)) {
                    matchesBySource.set(sourceId, []);
                }

                matchesBySource.get(sourceId)!.push({
                    id: row.id || row.target_id || row.user_id,
                    similarity: row.similarity,
                    finalScore: row.similarity, // Can be enhanced with weighted scoring
                    metadata: {
                        ...row,
                        source_id: undefined, // Remove internal field
                        similarity: undefined,
                    },
                });
            });

            span.setAttribute('results.sourceCount', matchesBySource.size);
            span.setAttribute('results.totalMatches', result.rows.length);

            logger.info({
                sourceCount: matchesBySource.size,
                totalMatches: result.rows.length,
                avgMatchesPerSource: result.rows.length / Math.max(1, matchesBySource.size),
            }, 'Bulk vector search completed');

            return matchesBySource;
        } catch (error: any) {
            logger.error({
                error: error.message,
                sourceTable,
                targetTable,
                sourceCount: sourceIds.length,
            }, 'Bulk vector search failed');
            throw error;
        }
    });
}

/**
 * Helper to convert bulk results to structured MatchResult arrays
 */
export function processBulkResults(
    bulkResults: Map<string, MatchResult[]>,
    entityIds: string[]
): Map<string, MatchResult[]> {
    const processed = new Map<string, MatchResult[]>();

    entityIds.forEach(id => {
        processed.set(id, bulkResults.get(id) || []);
    });

    return processed;
}
