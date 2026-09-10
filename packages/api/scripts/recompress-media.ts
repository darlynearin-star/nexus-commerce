/* One-off: re-compress existing S3-backed images in place using the same
 * optimizer the upload path now uses. Download -> shrink -> re-upload (same
 * key) -> update size/width/height. Run a dry run first:
 *     npx tsx scripts/recompress-media.ts             # reports only
 *     npx tsx scripts/recompress-media.ts --commit    # applies
 *
 * DATABASE_URL comes from packages/database/.env; STORAGE_* from .env.s3
 * (both already point at the Supabase bucket used in prod).
 */
import fs from 'fs';
import path from 'path';
import { optimizeImage } from '../src/utils/image-optimize';
import { storage, getStorageConfig, isS3Configured, putS3Object, mimeFromFilename } from '../src/utils/storage';

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
    if (value.length >= 2 && (value.startsWith('"') || value.startsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  const root = path.resolve(__dirname, '../../..');
  loadDotEnv(path.join(root, 'packages/database/.env'));
  loadDotEnv(path.join(root, 'packages/database/.env.s3'));

  const commit = process.argv.includes('--commit');
  const cfg = getStorageConfig();
  if (!isS3Configured(cfg)) {
    console.error('S3 not configured — check packages/database/.env.s3');
    process.exit(1);
  }

  const { default: prisma } = await import('@nexus/database');
  const rows: any[] = await prisma.media.findMany({
    where: { mimeType: { in: ['image/jpeg', 'image/png', 'image/webp'] } },
    select: { id: true, storeId: true, alt: true, mimeType: true, size: true, url: true },
  });

  let inBytes = 0;
  let outBytes = 0;
  let shrunk = 0;
  let skipped = 0;
  const failures: string[] = [];
  let done = 0;

  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY RUN'} | ${rows.length} image rows on ${cfg.publicBaseUrl}`);

  const processRow = async (row: any): Promise<void> => {
    if (!row.url || !row.url.startsWith(cfg.publicBaseUrl!)) { skipped++; return; }
    try {
      const fetched = await storage.retrieve(row.storeId, row.id, cfg);
      if (!fetched) { skipped++; return; }
      inBytes += fetched.buffer.length;
      const optimized = await optimizeImage(fetched.buffer, row.alt || 'image.jpg');
      if (!optimized) { outBytes += fetched.buffer.length; return; }
      outBytes += optimized.data.length;
      shrunk++;
      if (commit) {
        const key = row.url.slice(cfg.publicBaseUrl!.length + 1);
        await putS3Object(cfg, key, optimized.data, mimeFromFilename(row.alt || key));
        await prisma.media.update({
          where: { id: row.id },
          data: { size: optimized.data.length, width: optimized.width, height: optimized.height },
        });
      }
    } catch (e: any) {
      failures.push(`${row.id}: ${e?.message || e}`);
    } finally {
      done++;
      if (done % 5 === 0 || done === rows.length) {
        console.log(`  processed ${done}/${rows.length}`);
      }
    }
  };

  const pool = Array.from({ length: Math.min(4, rows.length) }, async (_: unknown, i: number) => {
    for (let j = i; j < rows.length; j += 4) await processRow(rows[j]);
  });
  await Promise.all(pool);

  let round = 1;
  while (failures.length > 0 && round < 3) {
    const retry = failures.splice(0, failures.length);
    console.log(`\nretry round ${round} — ${retry.length} rows`);
    const retryRows = retry.map((f) => rows.find((r) => f.startsWith(r.id))!).filter(Boolean);
    const pool2 = Array.from({ length: Math.min(4, retryRows.length) }, async (_: unknown, i: number) => {
      for (let j = i; j < retryRows.length; j += 4) await processRow(retryRows[j]);
    });
    await Promise.all(pool2);
    round++;
  }

  const pct = inBytes > 0 ? ((inBytes - outBytes) / inBytes) * 100 : 0;
  console.log(`\nrows scanned: ${rows.length} | shrunk: ${shrunk} | skipped: ${skipped} | failures: ${failures.length}`);
  console.log(`bytes before: ${(inBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`bytes after : ${(outBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`projected saving: ${((inBytes - outBytes) / 1024 / 1024).toFixed(2)} MB (${pct.toFixed(1)}%)`);
  if (failures.length) console.log('failures:\n' + failures.join('\n'));
  if (!commit) console.log('\nRun with --commit to apply in place.');
  await prisma.$disconnect().catch(() => {});
}

main().catch((e) => { console.error(e); process.exit(1); });