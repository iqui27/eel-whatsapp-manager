/**
 * DB Migration script — EEL Eleicao
 *
 * Applies the 0001_electoral_tables.sql migration to the production database.
 * Run with: DATABASE_URL=<url> npx tsx scripts/migrate.ts
 *
 * Safe: uses CREATE TABLE IF NOT EXISTS and ADD CONSTRAINT ... NOT VALID
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { readdirSync } from 'fs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌  DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  console.log('🔌  Connecting to database…');
  const sql = postgres(url!, { max: 1 });

  try {
    const drizzleDir = join(process.cwd(), 'drizzle');
    const migrationFiles = readdirSync(drizzleDir)
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort();

    for (const migrationFile of migrationFiles) {
      const migrationPath = join(drizzleDir, migrationFile);
      const migration = readFileSync(migrationPath, 'utf-8');

      const statements = migration
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean);

      console.log(`📋  Running ${migrationFile} (${statements.length} statements)…\n`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const label = stmt.split('\n')[0].slice(0, 80);
        try {
          await sql.unsafe(stmt);
          console.log(`  ✓ [${i + 1}/${statements.length}] ${label}`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('already exists')) {
            console.log(`  ⚠  [${i + 1}/${statements.length}] Already exists — skipped`);
          } else {
            console.error(`  ✗ [${i + 1}/${statements.length}] FAILED: ${label}`);
            console.error(`     ${msg}`);
            throw err;
          }
        }
      }
    }

    console.log('\n✅  Migrations complete.');
  } finally {
    await sql.end();
  }
}

main().catch(err => {
  console.error('\n💥  Migration failed:', err.message);
  process.exit(1);
});
