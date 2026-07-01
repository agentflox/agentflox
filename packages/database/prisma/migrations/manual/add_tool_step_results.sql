CREATE TABLE IF NOT EXISTS tool_step_results (
  id               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  idempotency_key  TEXT        NOT NULL,
  tool_id          TEXT        NOT NULL,
  run_id           TEXT        NOT NULL,
  step_id          TEXT        NOT NULL,
  step_name        TEXT,
  result           JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tool_step_results_pkey                    PRIMARY KEY (id),
  CONSTRAINT tool_step_results_idempotency_key_key     UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS tool_step_results_run_id_idx         ON tool_step_results (run_id);
CREATE INDEX IF NOT EXISTS tool_step_results_tool_id_run_id_idx ON tool_step_results (tool_id, run_id);
