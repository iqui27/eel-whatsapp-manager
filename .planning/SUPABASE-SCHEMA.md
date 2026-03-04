# EEL — Supabase Database Schema

## Migration Plan: JSON Local → PostgreSQL

### Current Data Files
- `.eel-config.json` → `config` table
- `.eel-chips.json` → `chips` table
- `.eel-contacts.json` → `contacts` table
- `.eel-logs.json` → `logs` table
- `.eel-sessions.json` → `sessions` table
- Clusters (in contacts) → `clusters` table
- Chip↔Cluster → `chip_clusters` junction table
- Contact↔Cluster → `contact_clusters` junction table

---

## Schema

### `config`
```sql
CREATE TABLE config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evolution_api_url TEXT NOT NULL,
  evolution_api_key TEXT NOT NULL,
  auth_password TEXT NOT NULL,
  warming_enabled BOOLEAN DEFAULT true,
  warming_interval_minutes INTEGER DEFAULT 60,
  warming_message TEXT DEFAULT '',
  instance_name TEXT NOT NULL,
  last_cron_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `chips`
```sql
CREATE TABLE chips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  instance_name TEXT,
  group_id TEXT,
  enabled BOOLEAN DEFAULT true,
  last_warmed TIMESTAMPTZ,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'warming')),
  warm_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `contacts`
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_contacted TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `clusters`
```sql
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  messages TEXT[] DEFAULT '{}',
  max_messages_per_day INTEGER DEFAULT 10,
  priority INTEGER DEFAULT 1,
  window_start TIME DEFAULT '08:00',
  window_end TIME DEFAULT '22:00',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `chip_clusters` (junction)
```sql
CREATE TABLE chip_clusters (
  chip_id UUID REFERENCES chips(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
  PRIMARY KEY (chip_id, cluster_id)
);
```

### `contact_clusters` (junction)
```sql
CREATE TABLE contact_clusters (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, cluster_id)
);
```

### `logs`
```sql
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_id UUID REFERENCES chips(id) ON DELETE SET NULL,
  chip_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_logs_chip_id ON logs(chip_id);
CREATE INDEX idx_logs_status ON logs(status);
```

### `sessions`
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_token ON sessions(token);
```

---

## Views (para Dashboard charts)

### `warming_daily_stats`
```sql
CREATE VIEW warming_daily_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'error') as error_count
FROM logs
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### `chip_activity_stats`
```sql
CREATE VIEW chip_activity_stats AS
SELECT 
  c.id,
  c.name,
  c.phone,
  c.status,
  c.enabled,
  c.warm_count,
  c.last_warmed,
  COUNT(l.id) as total_logs,
  COUNT(l.id) FILTER (WHERE l.status = 'success') as success_logs,
  COUNT(l.id) FILTER (WHERE l.status = 'error') as error_logs
FROM chips c
LEFT JOIN logs l ON l.chip_id = c.id
GROUP BY c.id;
```

---

## Drizzle ORM Setup

```
src/
  db/
    index.ts          # Drizzle client
    schema.ts         # Schema definitions
    migrate.ts        # Migration runner
    seed.ts           # JSON → DB migration script
  drizzle/
    0001_initial.sql  # Generated migration
```

**Connection:** `DATABASE_URL` from `.env.local`
**ORM:** Drizzle (edge-compatible, type-safe)
