-- Applied via packages/database/scripts/apply_memory_indexes.sql (non-CONCURRENTLY)
-- because Prisma Migrate and `prisma db execute` wrap SQL in a transaction,
-- and CREATE INDEX CONCURRENTLY cannot run inside a transaction.
-- Original CONCURRENTLY DDL kept below for ops that apply outside a transaction.

CREATE INDEX IF NOT EXISTS vector_embeddings_custom_kind_idx
  ON vector_embeddings ((metadata->>'kind'))
  WHERE source_type = 'CUSTOM';

CREATE INDEX IF NOT EXISTS vector_embeddings_custom_type_idx
  ON vector_embeddings ((metadata->>'type'))
  WHERE source_type = 'CUSTOM';

CREATE INDEX IF NOT EXISTS vector_embeddings_custom_expires_idx
  ON vector_embeddings ((metadata->>'expiresAt'))
  WHERE source_type = 'CUSTOM' AND metadata ? 'expiresAt';

-- Optional ops path (must run outside a transaction):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ...
