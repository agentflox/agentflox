import type { Pool, QueryResult } from 'pg';

export interface QueryFilters {
  industries?: string[];
  roles?: string[];
  keywords?: string[];
  tags?: string[];
  seeking?: boolean;
  isHiring?: boolean;
  isPublic?: boolean;
  isActive?: boolean;
}

export class MatchQueryBuilder {
  constructor(private pool: Pool) {}

  /**
   * Build and execute vector similarity query with filters
   */
  async executeVectorQuery<T extends Record<string, any> = Record<string, any>>(
    tableName: string,
    selectColumns: string[],
    embedding: number[],
    filters: QueryFilters,
    limit: number,
    joinClauses: string[] = []
  ) {
    const whereClauses: string[] = [`${tableName}.embedding IS NOT NULL`];
    const params: unknown[] = [embedding];
    let paramIndex = 2;

    // Build WHERE clauses
    if (filters.isPublic !== undefined) {
      whereClauses.push(`${tableName}.is_public = $${paramIndex++}`);
      params.push(filters.isPublic);
    }

    if (filters.isActive !== undefined) {
      whereClauses.push(`${tableName}.is_active = $${paramIndex++}`);
      params.push(filters.isActive);
    }

    if (filters.isHiring !== undefined) {
      whereClauses.push(`${tableName}.is_hiring = $${paramIndex++}`);
      params.push(filters.isHiring);
    }

    if (filters.industries && filters.industries.length > 0) {
      whereClauses.push(`${tableName}.industry && $${paramIndex++}::text[]`);
      params.push(filters.industries);
    }

    if (filters.roles && filters.roles.length > 0) {
      whereClauses.push(
        `(${tableName}.hiring_roles && $${paramIndex}::text[] OR ${tableName}.skills && $${paramIndex}::text[])`
      );
      params.push(filters.roles);
      paramIndex++;
    }

    if (filters.keywords && filters.keywords.length > 0) {
      whereClauses.push(`${tableName}.keywords && $${paramIndex++}::text[]`);
      params.push(filters.keywords);
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClauses.push(`${tableName}.tags && $${paramIndex++}::text[]`);
      params.push(filters.tags);
    }

    if (filters.seeking !== undefined) {
      whereClauses.push(`$${paramIndex++}::boolean = false OR ${tableName}.intent = 'SEEKING'`);
      params.push(filters.seeking);
    }

    params.push(limit);

    const query = `
      SELECT 
        ${selectColumns.join(',\n        ')},
        1 - (${tableName}.embedding <=> $1::vector) AS similarity
      FROM ${tableName}
      ${joinClauses.join('\n      ')}
      WHERE ${whereClauses.join('\n        AND ')}
      ORDER BY ${tableName}.embedding <=> $1::vector
      LIMIT $${paramIndex}
    `;

    return this.pool.query<T>(query, params);
  }
}