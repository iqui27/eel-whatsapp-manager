-- Phase 32: Per-user password support
-- Adds password_hash column to users table for individual authentication

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;

-- Set initial password (844612) for Henrique Rocha
-- Hash format: salt:scrypt(password, salt, 64) — generated via Node.js crypto.scryptSync
UPDATE "users"
SET password_hash = '8a1fd07790e824ebbbd6e143da1199da:76583bc5ab00024681c1c31dcf769ed320f7d4c7a3bf5a9c8f4bce3093981d5f57dc9f74658eaef3044c76c53f8614563e9f5c35391da419dc16a89d37034f34'
WHERE lower(name) LIKE '%henrique%rocha%'
  AND password_hash IS NULL;
