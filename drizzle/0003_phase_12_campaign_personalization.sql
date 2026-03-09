-- Phase 12 campaign personalization foundation
-- Adds an optional candidate profile to the existing config/settings source of truth

ALTER TABLE "config"
  ADD COLUMN IF NOT EXISTS "candidate_display_name" text,
  ADD COLUMN IF NOT EXISTS "candidate_office" text,
  ADD COLUMN IF NOT EXISTS "candidate_party" text,
  ADD COLUMN IF NOT EXISTS "candidate_region" text;
