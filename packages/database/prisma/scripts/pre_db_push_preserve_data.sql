BEGIN;

-- 1) Backup to preserve data from columns that schema.prisma drops.
CREATE TABLE IF NOT EXISTS migration_backup_features_removed_columns AS
SELECT
  id,
  max_proposals,
  max_chats_per_proposal,
  NOW() AS backed_up_at
FROM features
WHERE max_proposals IS NOT NULL
   OR max_chats_per_proposal IS NOT NULL;

CREATE TABLE IF NOT EXISTS migration_backup_usage_removed_columns AS
SELECT
  id,
  max_proposals,
  remaining_proposals,
  max_chats_per_proposal,
  remaining_chats_per_proposal,
  NOW() AS backed_up_at
FROM usage
WHERE max_proposals IS NOT NULL
   OR remaining_proposals IS NOT NULL
   OR max_chats_per_proposal IS NOT NULL
   OR remaining_chats_per_proposal IS NOT NULL;

CREATE TABLE IF NOT EXISTS migration_backup_marketplace_listings_removed_columns AS
SELECT
  id,
  proposal_schema,
  NOW() AS backed_up_at
FROM marketplace_listings
WHERE proposal_schema IS NOT NULL;

-- 2) Backup duplicate reviews that would violate the new unique key.
CREATE TABLE IF NOT EXISTS migration_backup_reviews_duplicates AS
WITH ranked AS (
  SELECT
    r.*,
    ROW_NUMBER() OVER (
      PARTITION BY giver_id, receiver_id, context_type, project_id, team_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM reviews r
)
SELECT * FROM ranked WHERE rn > 1;

-- 3) Remove duplicates, keep newest review per unique key group.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY giver_id, receiver_id, context_type, project_id, team_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM reviews
)
DELETE FROM reviews r
USING ranked d
WHERE r.id = d.id
  AND d.rn > 1;

COMMIT;
