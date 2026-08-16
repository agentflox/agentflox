CREATE INDEX IF NOT EXISTS vector_embeddings_custom_kind_idx
  ON vector_embeddings ((metadata->>'kind'))
  WHERE source_type = 'CUSTOM';

CREATE INDEX IF NOT EXISTS vector_embeddings_custom_type_idx
  ON vector_embeddings ((metadata->>'type'))
  WHERE source_type = 'CUSTOM';

CREATE INDEX IF NOT EXISTS vector_embeddings_custom_expires_idx
  ON vector_embeddings ((metadata->>'expiresAt'))
  WHERE source_type = 'CUSTOM' AND metadata ? 'expiresAt';
