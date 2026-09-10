/* One-off migration runner: move Media.data / AdVideo.data base64 blobs out of
 * Postgres into S3-compatible object storage (Supabase Storage) and rewrite
 * every reference that still points at the old /uploads/... URLs.
 *
 * Usage (from packages/api):
 *   Set STORAGE_* env vars (or create packages/database/.env.s3), then:
 *     npx tsx scripts/migrate-media-to-s3.ts            # dry run, reports only
 *     npx tsx scripts/migrate-media-to-s3.ts --commit   # actually move + rewrite
 *
 * DATABASE_URL is read from packages/database/.env automatically, so the script
 * runs against prod from a laptop without touching Render or needing a JWT.
 */
import fs from 'fs';
import path from 'path';

function loadDotEnv(file: string): void {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) return;
  const content = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function toTxPoolUrl(url: string): string {
  const u = new URL(url);
  u.port = '5432';
  u.searchParams.set('pgbouncer', 'true');
  u.searchParams.delete('connection_limit');
  u.searchParams.delete('pool_timeout');
  if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
  return u.toString();
}

async function main(): Promise<void> {
  const root = path.resolve(__dirname, '../../..');
  loadDotEnv(path.join(root, 'packages/database/.env'));
  loadDotEnv(path.join(root, 'packages/database/.env.s3'));

  const dryRun = !process.argv.includes('--commit');
  const httpFetch = process.argv.includes('--http-fetch');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !/^postgres(ql)?:\/\//.test(dbUrl)) {
    console.error('DATABASE_URL is missing or invalid. Expected postgresql:// in packages/database/.env');
    console.error(`  checked: ${path.join(root, 'packages/database/.env')}`);
    console.error(`  got: ${dbUrl ? `${dbUrl.slice(0, 24)}... (len ${dbUrl.length})` : '(unset)'}`);
    process.exit(1);
  }
if (process.argv.includes('--tx-pool')) {
    process.env.DATABASE_URL = toTxPoolUrl(dbUrl);
  }

const { default: prisma } = await import('@nexus/database');
  const { backfillStorage, rewriteUploadReferences, withTimeout } = await import('../src/utils/backfill');
  const { getStorageConfig, isS3Configured, getApiBase } = await import('../src/utils/storage');

  const cfg = getStorageConfig();
  if (!isS3Configured(cfg)) {
    console.error('S3-compatible storage is not configured. Set in packages/database/.env.s3 (or the shell):');
    console.error('  STORAGE_PROVIDER=s3');
    console.error('  STORAGE_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3');
    console.error('  STORAGE_REGION=auto');
    console.error('  STORAGE_ACCESS_KEY_ID=...');
    console.error('  STORAGE_SECRET_ACCESS_KEY=...');
    console.error('  STORAGE_BUCKET=media');
    console.error('  STORAGE_PUBLIC_BASE_URL=https://<project-ref>.supabase.co/storage/v1/object/public/media');
    console.error('  STORAGE_FORCE_PATH_STYLE=true');
    process.exit(1);
  }

  console.log(`Mode: ${dryRun ? 'DRY RUN (nothing will change)' : 'COMMIT'}`);
  console.log(`Storage: ${cfg.endpoint} bucket=${cfg.bucket} public=${cfg.publicBaseUrl}`);
  console.log(`DB: ${process.argv.includes('--tx-pool') ? 'transaction pooler (5432)' : process.env.DATABASE_URL?.slice(0, 40) + '...'}`);

const report = await withTimeout(
    backfillStorage(
      cfg,
      dryRun,
      httpFetch
        ? {
            fetchBlob: async (row) => {
              const api = getApiBase();
              const res = await fetch(`${api}/uploads/${row.storeId}/${row.id}`);
              if (!res.ok) throw new Error(`GET ${api}/uploads/${row.storeId}/${row.id}: ${res.status}`);
              return Buffer.from(await res.arrayBuffer());
            },
          }
        : undefined,
    ),
    20 * 60_000,
    'blob migration',
  );
  console.log('\n== blob migration ==');
  console.log(JSON.stringify(report, null, 2));

  const remaining = report.mediaRemaining + report.adsRemaining;

  if (!dryRun && remaining > 0) {
    console.log(`\n${remaining} blobs remain — re-run with --commit to continue. ` +
      `Reference rewrite is deferred until zero remain so images never 404.`);
    await prisma.$disconnect().catch(() => {});
    return;
  }

  const refs = await withTimeout(rewriteUploadReferences(cfg, { dryRun }), 5 * 60_000, 'reference rewrite');
  console.log('\n== reference rewrite ==');
  console.log(JSON.stringify(refs, null, 2));

  if (!dryRun && remaining > 0) {
    console.log(`\n${remaining} blobs remain — re-run with --commit to continue.`);
  }
  if (dryRun) {
    console.log('\nRun with --commit to perform the migration.');
  }
  await prisma.$disconnect().catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
