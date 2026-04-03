-- Manual @lid mapping table (Phase 43 fallback)
-- Operator-curated table for persistent @lid participants that cannot be auto-resolved

CREATE TABLE "lid_manual_mapping" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_jid" text NOT NULL,
  "lid_jid" text NOT NULL,
  "voter_name" text NOT NULL,
  "voter_id" uuid REFERENCES "voters"("id") ON DELETE SET NULL,
  "notes" text,
  "created_by" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE INDEX "idx_lid_manual_mapping_group" ON "lid_manual_mapping"("group_jid");
CREATE UNIQUE INDEX "lid_manual_mapping_group_lid_unique" ON "lid_manual_mapping"("group_jid", "lid_jid");