import { Pool } from 'pg';
import type { EmbeddingRow } from '../types';

export class EmbeddingHelper {
  private failedEntities = new Set<string>();

  constructor(private pool: Pool) {}

  /**
   * Ensure entity has embedding, generate if missing
   */
  async ensureEmbedding(
    entityType: 'project' | 'proposal' | 'member_profile' | 'team' | 'user',
    entityId: string,
    tableName: string,
    idColumn: string = 'id'
  ): Promise<number[] | null> {
    // Check existing embedding
    const result = await this.pool.query<EmbeddingRow>(
      `SELECT embedding FROM ${tableName} WHERE ${idColumn} = $1`,
      [entityId]
    );

    let embedding = result.rows[0]?.embedding;

    if (!embedding) {
      try {
        await this.generateEmbedding(entityType, entityId);
      } catch (err) {
        const key = `${entityType}:${entityId}`;
        if (!this.failedEntities.has(key)) {
          this.failedEntities.add(key);
          console.warn(
            `[EmbeddingHelper] Failed to generate embedding for ${entityType} ${entityId}:`,
            err
          );
        }
        return null;
      }

      // Fetch again
      const retry = await this.pool.query<EmbeddingRow>(
        `SELECT embedding FROM ${tableName} WHERE ${idColumn} = $1`,
        [entityId]
      );

      embedding = retry.rows[0]?.embedding;
    }

    return embedding || null;
  }

  /**
   * Generate embedding for entity
   */
  private async generateEmbedding(
    entityType: 'project' | 'proposal' | 'member_profile' | 'team' | 'user',
    entityId: string
  ): Promise<void> {
    const { 
      updateProjectEmbedding,
      updateProposalEmbedding,
      updateMemberProfileEmbedding,
      updateTeamEmbedding,
      updateUserEmbedding,
    } = await import('@/services/matching/embeddingService');

    switch (entityType) {
      case 'project':
        await updateProjectEmbedding(entityId);
        break;
      case 'proposal':
        await updateProposalEmbedding(entityId);
        break;
      case 'member_profile':
        await updateMemberProfileEmbedding(entityId);
        break;
      case 'team':
        await updateTeamEmbedding(entityId);
        break;
      case 'user':
        await updateUserEmbedding(entityId);
        break;
    }
  }
}