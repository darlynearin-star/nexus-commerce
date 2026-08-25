import { PrismaClient } from '@nexus/database';

export const BACKUP_TABLES = [
  'users', 'customers', 'retailers', 'developers', 'stores', 'store_settings', 'store_themes',
  'products', 'product_variants', 'categories', 'brands', 'orders', 'order_items', 'payments',
  'carts', 'cart_items', 'reviews', 'wishlists', 'wishlist_items', 'coupons', 'media',
  'addresses', 'sessions', 'notifications', 'activity_logs', 'support_tickets', 'ticket_messages',
  'retailer_subscriptions', 'subscription_payments', 'magic_link_tokens', 'feature_flags',
  'kill_switch', 'settings', 'announcements', 'analytics_events', 'store_emails', 'product_downloads',
];

// Read lazily (not at module load) so runtime/test configuration changes are
// honored and boot order doesn't freeze the value.
function rawFallbackUrl(): string {
  return process.env.DATABASE_URL_FALLBACK || '';
}
let fallbackClient: PrismaClient | null = null;

function normalizedFallbackUrl(): string {
  const raw = rawFallbackUrl();
  if (!raw) return raw;
  if (raw.includes('pooler.supabase.com') && !raw.includes('pgbouncer')) {
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}pgbouncer=true&connection_limit=1`;
  }
  return raw;
}

export function getFallbackClient(): PrismaClient | null {
  if (!rawFallbackUrl()) return null;
  if (!fallbackClient) {
    fallbackClient = new PrismaClient({ datasources: { db: { url: normalizedFallbackUrl() } } });
  }
  return fallbackClient;
}

export async function closeFallbackClient(): Promise<void> {
  if (fallbackClient) {
    await fallbackClient.$disconnect().catch(() => {});
    fallbackClient = null;
  }
}

async function tableColumnTypes(prisma: PrismaClient, table: string): Promise<Record<string, string>> {
  const cols: any[] = await prisma.$queryRawUnsafe(
    `SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = $1`,
    table,
  );
  const map: Record<string, string> = {};
  for (const c of cols) map[c.column_name] = c.udt_name;
  return map;
}

function sqlLiteral(value: any, udt: string): string {
  if (value === null || value === undefined) return 'NULL';
  if (udt.startsWith('_')) {
    const elem = udt.slice(1);
    const items = value.map((v: any) => sqlLiteral(v, elem));
    return `ARRAY[${items.join(',')}]::${udt}`;
  }
  switch (udt) {
    case 'json':
    case 'jsonb':
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    case 'bool':
      return value ? 'TRUE' : 'FALSE';
    case 'int2':
    case 'int4':
    case 'int8':
    case 'float4':
    case 'float8':
    case 'numeric':
    case 'money':
      return String(value);
    case 'bytea':
      return `'\\x${value.toString('hex')}'::bytea`;
    case 'uuid':
      return `'${value}'::uuid`;
    case 'timestamp':
    case 'timestamptz':
    case 'date':
    case 'time':
    case 'timetz':
      return `'${new Date(value).toISOString()}'::${udt}`;
    default:
      return `'${String(value).replace(/'/g, "''")}'`;
  }
}

export async function buildInsertSql(prisma: PrismaClient, table: string, rows: any[]): Promise<string | null> {
  if (!rows.length) return null;
  const types = await tableColumnTypes(prisma, table);
  const columns = Object.keys(rows[0]);
  const colList = columns.map((c) => `"${c}"`).join(',');
  const values = rows
    .map((row) => {
      const tuple = columns.map((c) => sqlLiteral(row[c], types[c] || 'text')).join(',');
      return `(${tuple})`;
    })
    .join(',');
  return `INSERT INTO "${table}" (${colList}) VALUES ${values};`;
}

export async function buildTableSql(prisma: PrismaClient): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const table of BACKUP_TABLES) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      const sql = await buildInsertSql(prisma, table, rows);
      if (sql) out[table] = sql;
    } catch {
      // table missing on this database - skip
    }
  }
  return out;
}

export async function computeDigest(prisma: PrismaClient): Promise<Record<string, number>> {
  const digest: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) AS c FROM "${table}"`);
      digest[table] = Number(rows[0]?.c || 0);
    } catch {
      // table missing on this database - skip
    }
  }
  return digest;
}

/**
 * H7: row counts alone cannot see UPDATEs (a price edit or password change
 * keeps the count identical, so the fallback snapshot silently went stale).
 * Postgres tracks tuple-level counters per table in pg_stat_user_tables —
 * ONE cheap query covers every table and moves on any INSERT/UPDATE/DELETE.
 */
async function changeCounters(prisma: PrismaClient): Promise<Record<string, number>> {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT relname AS tbl, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables`,
    );
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.tbl] = Number(r.n_tup_ins || 0) + Number(r.n_tup_upd || 0) + Number(r.n_tup_del || 0);
    }
    return map;
  } catch {
    return {};
  }
}

export async function mirrorToFallback(prisma: PrismaClient): Promise<void> {
  const fb = getFallbackClient();
  if (!fb) return;
  const sql = await buildTableSql(prisma);
  const digest = await computeDigest(prisma);
  const payload = {
    createdAt: new Date().toISOString(),
    tables: sql,
    digest,
  };
  await fb.setting.upsert({
    where: { key: 'fallback_mirror' },
    update: { value: payload },
    create: { key: 'fallback_mirror', value: payload },
  });
}

export async function mirrorToFallbackIfChanged(prisma: PrismaClient): Promise<{ mirrored: boolean; skipped: boolean }> {
  const fb = getFallbackClient();
  if (!fb) return { mirrored: false, skipped: false };
  const [digest, changes] = [await computeDigest(prisma), await changeCounters(prisma)];
  const stored = await fb.setting.findUnique({ where: { key: 'fallback_mirror' } }).catch(() => null);
  const storedValue = stored?.value && typeof stored.value === 'object' ? (stored.value as any) : null;
  const storedDigest = storedValue?.digest ?? null;
  const storedChanges = storedValue?.changes ?? null;
  if (
    storedDigest && storedChanges &&
    JSON.stringify(storedDigest) === JSON.stringify(digest) &&
    JSON.stringify(storedChanges) === JSON.stringify(changes)
  ) {
    return { mirrored: false, skipped: true };
  }
  const sql = await buildTableSql(prisma);
  const payload = {
    createdAt: new Date().toISOString(),
    tables: sql,
    digest,
    changes,
  };
  await fb.setting.upsert({
    where: { key: 'fallback_mirror' },
    update: { value: payload },
    create: { key: 'fallback_mirror', value: payload },
  });
  return { mirrored: true, skipped: false };
}

export async function hasData(prisma: PrismaClient): Promise<boolean> {
  try {
    const count: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "users"`);
    const n = Number(count[0]?.count || 0);
    return n > 0;
  } catch {
    return false;
  }
}

export async function restoreFallbackIfEmpty(prisma: PrismaClient): Promise<{ restored: boolean; tables: string[]; skipped: boolean }> {
  if (await hasData(prisma)) return { restored: false, tables: [], skipped: true };

  const mirror = await prisma.setting.findUnique({ where: { key: 'fallback_mirror' } }).catch(() => null);
  if (!mirror) return { restored: false, tables: [], skipped: false };

  const payload = mirror.value as any;
  const tables: string[] = Object.keys(payload?.tables || {});

  // Atomic restore: previously the inserts ran one-by-one, so a mid-way
  // failure left a half-restored DB that hasData() then treated as healthy —
  // permanently skipping repair. One transaction fixes both the partial
  // state and the once-only skip.
  // SET LOCAL is transaction-scoped: FK enforcement is restored automatically
  // at commit and the connection returns to the pool un-poisoned.
  await prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');
    for (const table of tables) {
      await tx.$executeRawUnsafe(payload.tables[table]);
    }
  });
  return { restored: true, tables, skipped: false };
}