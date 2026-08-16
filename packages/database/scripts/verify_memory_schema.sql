SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'memory_view_id';
SELECT indexname FROM pg_indexes WHERE indexname LIKE 'vector_embeddings_custom%';
