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
  const content = fs.readFileSync(abs, 'utf8');
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  const root = path.resolve(__dirname, '../../..');
  loadDotEnv(path.join(root, 'packages/database/.env'));
  loadDotEnv(path.join(root, 'packages/database/.env.s3'));

  const dryRun = !process.argv.includes('--commit');

  const { default: prisma } = await import('@nexus/database');
  const { backfillStorage, rewriteUploadReferences } = await import('../src/utils/backfill');
  const { getStorageConfig, isS3Configured } = await import('../src/utils/storage');

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

  const report = await backfillStorage(cfg, dryRun);
  console.log('\n== blob migration ==');
  console.log(JSON.stringify(report, null, 2));

  const refs = await rewriteUploadReferences(cfg, { dryRun });
  console.log('\n== reference rewrite ==');
  console.log(JSON.stringify(refs, null, 2));

  const remaining = report.mediaRemaining + report.adsRemaining;
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