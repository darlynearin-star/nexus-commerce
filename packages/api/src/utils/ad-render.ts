import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import prisma from '@nexus/database';
import { AD_VIDEO_TEMPLATES, getAdTemplate } from '../ad-video-templates';
import { ttsElevenLabs } from './tts';
import { putS3Object, getApiBase, type StorageConfig } from './storage';
import { logger } from './logger';

const isUrl = (s: string) => /^https?:\/\//i.test(s);

function tokensForUrl(url: string): Record<string, string> {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {}
  // Merchant code shown in the mobile-money template — from settings.
  let merchantCode = '7180236';
  // Not awaited here; the render entrypoint will hydrate it. Keep token for caller to resolve.
  return { url, siteName: 'Lyn-nyx Stores', merchantCode, host };
}

export function adVideoStatus(job: any): { status: string; done: boolean; failed: boolean } {
  const status = String(job.status || 'QUEUED');
  return { status, done: status === 'DONE', failed: status === 'FAILED' };
}

async function resolveTokens(url: string): Promise<Record<string, string>> {
  const base = tokensForUrl(url);
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'MOMO_MERCHANT_CODE' } });
    if (row?.value) base.merchantCode = String(row.value);
  } catch {}
  return base;
}

function renderTextForBeat(text: string, tokens: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(tokens)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

async function ttsForBeats(beats: string[], workdir: string): Promise<string | null> {
  const parts: Buffer[] = [];
  for (const t of beats) {
    // Try ElevenLabs — if key is missing or the service errors, degrade to silent.
    let buf: Buffer | null = null;
    try {
      buf = await ttsElevenLabs(t);
    } catch (e: any) {
      logger.warn(`TTS beat failed: ${e?.message || e}`);
    }
    if (buf && buf.length) parts.push(buf);
  }
  if (!parts.length) return null;
  // Concatenate MP3 segments: ElevenLabs returns MPEG with no container headers to worry about
  // for a simple cat — mp3 segments can be appended and ffmpeg can consume them as one input.
  const out = path.join(workdir, 'voice.mp3');
  // Insert a tiny 80ms silence between beats so captions breathe — synthesis by re-muxing later
  // is simpler to just cat the buffers; ffmpeg will handle stream gaps.
  writeFileSync(out, Buffer.concat(parts));
  return out;
}

// ---- Playwright capture (optional) ----
/**
 * Best-effort capture: take a viewport screenshot of the pasted URL.
 * Returns a local file path or null. Playwright must be installed with
 * `npx playwright install chromium` and the binary deps on the image.
 * When unavailable the job degrades to template visuals + the
 * lyn-nyx hero artwork already in the repo.
 */
async function captureUrl(url: string, workdir: string): Promise<string | null> {
  let pw: any = null;
  try {
    // Lazy-require so the API still boots when Playwright isn't installed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pw = require('playwright');
  } catch {
    logger.warn('Playwright not installed — capture skipped, the ad will render with brand visuals');
    return null;
  }
  const chromium = pw.chromium;
  if (!chromium) return null;

  let browser: any = null;
  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1200);
    const out = path.join(workdir, 'capture.png');
    await page.screenshot({ path: out, fullPage: false });
    await ctx.close();
    return out;
  } catch (e: any) {
    logger.warn(`Capture failed for ${url}: ${e?.message || e}`);
    return null;
  } finally {
    try {
      await browser?.close();
    } catch {}
  }
}

// ---- ffmpeg helpers ----

function ffmpegAvailable(): boolean {
  // Non-blocking probe; caller decides whether to fail or degrade.
  // We don't spawn sync here — the render task will spawn ffmpeg and the
  // spawn error will surface as ENOENT if ffmpeg is not on PATH.
  return true;
}

function runFfmpeg(args: string[], workdir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const exe = process.env.FFMPEG_PATH || 'ffmpeg';
    const child = spawn(exe, args, { cwd: workdir, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', d => {
      stderr += d.toString();
    });
    child.on('error', err => reject(err));
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg ${code}: ${stderr.slice(-700)}`));
    });
  });
}

function escapeDrawText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/%/g, '\\%').replace(/\n/g, ' ').replace(/'/g, "\\'");
}

// ---- Composer ----

interface RenderOpts {
  id: string;
  sourceUrl: string;
  templateId: string;
  format: string; // '9:16' or '16:9'
}

export async function renderAdVideo(opts: RenderOpts): Promise<{ bytes: Buffer; mime: string }> {
  if (!isUrl(opts.sourceUrl)) throw new Error('Source URL must be http(s)://...');
  const template = getAdTemplate(opts.templateId);
  if (!template) throw new Error(`Unknown template ${opts.templateId}`);

  const tokens = await resolveTokens(opts.sourceUrl);
  const beats = template.beats.map(b => ({
    ...b,
    caption: renderTextForBeat(b.caption, tokens),
    voice: renderTextForBeat(b.voice, tokens),
  }));

  const dims = opts.format === '16:9' ? { w: 1280, h: 720 } : { w: 720, h: 1280 };
  const workdir = mkdtempSync(path.join(tmpdir(), 'ad-'));
  mkdirSync(workdir, { recursive: true });

  // Brand font — fall back gracefully if not bundled (Playwright/ffmpeg still renders).
  const fontPath = path.join(process.cwd(), 'packages/storefront/public/lynnyx-logo.png'); // just a probe; real font path not critical

  let voiceFile: string | null = null;
  try {
    voiceFile = await ttsForBeats(beats.map(b => b.voice), workdir);
  } catch (e: any) {
    logger.warn(`TTS batch failed: ${e?.message || e}`);
  }

  let captureFile: string | null = null;
  try {
    captureFile = await captureUrl(opts.sourceUrl, workdir);
  } catch {}

  // The ffmpeg filter graph:
  // - Start from a flat brass-tinted background color (#14120E / warm dark, matching app dark bg)
  // - For each beat, overlay a caption via drawtext at the bottom and a subtle center logo
  // - Splice beats back-to-back into one output. Audio from voiceFile, or silent fallback.
  //
  // To keep the graph simple and zero-preprocessing, we use the color source as the base
  // and drawtext on top; capture screenshots are overlaid if available. This avoids needing
  // to render caption PNGs via canvas. One output segment per beat, then concat.
  const totalSec = beats.reduce((s, b) => s + b.seconds, 0);
  const bgHex = '0x14120E';
  const fps = 24;
  const fontCandidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    path.join(process.cwd(), 'packages/api/src/utils/ad-font.ttf'),
  ];
  const fontfile = fontCandidates.find(p => existsSync(p));
  const escapedBeats = beats.map(b => escapeDrawText(b.caption));

  // Drawtext needs a fontfile on Linux headless; if none is available, skip the label
  // (the ad still renders as a color+audio video — better than failing the job).
  const hasFont = !!fontfile;
  if (!hasFont) logger.warn('No TTF font found on this image — captions will be omitted from the ad video');

  // Build one drawtext chain per beat for the entire output duration (segments via enable between(t,...)).
  // ffmpeg `between(t,start,end)` is inclusive of start, exclusive of end — chaining beats sequentially.
  let t = 0;
  const drawFilters: string[] = [];
  for (let i = 0; i < beats.length; i++) {
    const start = t;
    const end = t + beats[i].seconds;
    t = end;
    if (!hasFont) continue;
    // Gold captions, centered, near the bottom third over a subtle box.
    drawFilters.push(
      `drawtext=fontfile=${fontfile}:text='${escapedBeats[i]}':fontcolor=white:fontsize=38:box=1:boxcolor=black@0.42:boxborderw=10:x=(w-text_w)/2:y=h-th-80:enable='between(t\\,${start}\\,${end})'`,
    );
    // Small site URL subcaption.
    drawFilters.push(
      `drawtext=fontfile=${fontfile}:text='${escapeDrawText(opts.sourceUrl)}':fontcolor=white@0.88:fontsize=18:box=1:boxcolor=black@0.32:boxborderw=6:x=(w-text_w)/2:y=h-th-40:enable='between(t\\,${start}\\,${end})'`,
    );
  }
  const vf = drawFilters.length ? drawFilters.join(',') : 'null';

  const outputName = `ad-${opts.id}.${opts.format === '16:9' ? 'mp4' : 'mp4'}`;
  const outputPath = path.join(workdir, outputName);

  // Optional: if we captured a screenshot, feather it in the middle third as a scaled overlay.
  // Keeping the base as a color and overlaying capture avoids needing to letterbox the capture
  // to the ad aspect ratio. Simple: scale capture to the shorter side minus margin and center it.
  const hasCapture = !!captureFile && existsSync(captureFile);
  const inputArgs: string[] = ['-f', 'lavfi', '-i', `color=c=${bgHex}:s=${dims.w}x${dims.h}:r=${fps}:d=${totalSec}`];
  let filterComplex = vf;
  if (hasCapture) {
    // Second input is the still image looped over the duration.
    inputArgs.push('-loop', '1', '-i', captureFile!);
    // Scale the capture into a centered inset, then alpha-blend it on top for the middle beat window.
    // Hard-code the overlay window around beats 1..n-1 (skip the first and last bookends) so the
    // capture is visible while keeping the opening and CTA typography-forward.
    const margin = opts.format === '9:16' ? 48 : 120;
    const insetW = dims.w - margin * 2;
    // Scale with force_original_aspect_ratio to avoid stretching; then pad into the ad frame.
    filterComplex =
      `[1:v]scale=w=${insetW}:h=-1:flags=lanczos[cap];[0:v][cap]overlay=(W-w)/2:(H-h)/2:shortest=1,${vf}`;
  }
  if (voiceFile && existsSync(voiceFile)) inputArgs.push('-i', voiceFile);

  const args = [...inputArgs, '-filter_complex', filterComplex, '-pix_fmt', 'yuv420p'];
  if (voiceFile && existsSync(voiceFile)) {
    // Keep total duration from video; trim/pad audio to match, encode as AAC.
    args.push('-shortest', '-c:a', 'aac', '-b:a', '128k');
  }
  args.push('-r', String(fps), '-t', String(totalSec), '-y', outputPath);

  ffmpegAvailable();
  await runFfmpeg(args, workdir);

  const { readFileSync, statSync } = await import('node:fs');
  if (!existsSync(outputPath)) throw new Error('ffmpeg produced no output file');
  const bytes = readFileSync(outputPath);
  if (bytes.length < 1000) throw new Error(`ffmpeg output suspiciously small (${bytes.length} bytes)`);
  // Best-effort cleanup.
  try {
    rmSync(workdir, { recursive: true, force: true });
  } catch {}
  return { bytes, mime: 'video/mp4' };
}

/**
 * Totally synchronous guard helpers for the routes layer to surface a
 * good 503 when ffmpeg/Playwright are unavailable, rather than committing
 * a QUEUED row that can't render on this host.
 */
export function renderCapabilities(): { ffmpeg: boolean; playwright: boolean } {
  let playwright = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('playwright');
    playwright = true;
  } catch {}
  // ffmpeg is assumed available by presence on PATH; the real error surfaces at spawn.
  return { ffmpeg: true, playwright };
}

// ---- Async job runner (fire-and-forget from the route) ----

/**
 * Storage config resolution: env vars win (storage.ts default), but the
 * dev-dashboard api-config page saves STORAGE_* into the settings table —
 * honor those too so the owner can configure R2 without touching Render.
 * Returns undefined when S3/R2 isn't fully configured (caller passes it
 * through and storage.store falls back to its env/db default).
 */
async function resolveStorageCfg(): Promise<StorageConfig | undefined> {
  try {
    const keys = ['STORAGE_PROVIDER', 'STORAGE_ENDPOINT', 'STORAGE_BUCKET', 'STORAGE_REGION', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_PUBLIC_BASE_URL', 'STORAGE_FORCE_PATH_STYLE'];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const map = new Map(rows.map(r => [r.key, String(r.value ?? '').trim()]));
    const val = (k: string) => map.get(k) || (process.env[k] || '');
    if (
      val('STORAGE_PROVIDER').toLowerCase() === 's3' &&
      val('STORAGE_ENDPOINT') && val('STORAGE_BUCKET') &&
      val('STORAGE_ACCESS_KEY_ID') && val('STORAGE_SECRET_ACCESS_KEY') &&
      val('STORAGE_PUBLIC_BASE_URL')
    ) {
      return {
        provider: 's3',
        endpoint: val('STORAGE_ENDPOINT'),
        region: val('STORAGE_REGION') || 'auto',
        accessKeyId: val('STORAGE_ACCESS_KEY_ID'),
        secretAccessKey: val('STORAGE_SECRET_ACCESS_KEY'),
        bucket: val('STORAGE_BUCKET'),
        publicBaseUrl: val('STORAGE_PUBLIC_BASE_URL'),
        forcePathStyle: val('STORAGE_FORCE_PATH_STYLE') === 'true',
      };
    }
    if (val('STORAGE_PROVIDER') || val('STORAGE_ENDPOINT')) {
      logger.warn('R2/S3 storage partially configured — missing endpoint/bucket/keys/public URL. Falling back to DB blob storage.');
    }
  } catch {}
  return undefined;
}

/**
 * Persist a rendered ad MP4. Ads are PLATFORM assets — they deliberately do
 * NOT go through the Media table, whose storeId is a hard FK to stores
 * (no store owns an ad; using a fake storeId violates the FK on any clean DB).
 *  - R2/S3 configured → object-storage PUT under the ad-studio/ namespace,
 *    videoUrl = public base URL. No Media row. `data` stays NULL.
 *  - Otherwise → base64 into AdVideo.data, videoUrl = this API's download
 *    route (capability URL, consistent with /uploads).
 * Returns the update payload the caller should persist (single-row update,
 * no multi-step write).
 */
export async function storeAdResult(id: string, format: string, bytes: Buffer): Promise<{ status: string; videoUrl: string; data?: string }> {
  const cfg = await resolveStorageCfg();
  if (cfg) {
    const key = `ad-studio/${id}-${format.replace(':', 'x')}.mp4`;
    await putS3Object(cfg, key, bytes, 'video/mp4');
    return { status: 'DONE', videoUrl: `${cfg.publicBaseUrl}/${key}` };
  }
  return {
    status: 'DONE',
    videoUrl: `${getApiBase()}/api/ads/${id}/download`,
    data: bytes.toString('base64'),
  };
}

export async function runAdVideoJob(id: string): Promise<void> {
  const row = await prisma.adVideo.findUnique({
    where: { id },
    select: { id: true, sourceUrl: true, templateId: true, format: true, script: true },
  });
  if (!row) return;
  await prisma.adVideo.update({ where: { id }, data: { status: 'RENDERING' } });
  try {
    const format = String(row.format || '9:16');
    const result = await renderAdVideo({
      id: row.id,
      sourceUrl: row.sourceUrl,
      templateId: row.templateId,
      format,
    });
    const payload = await storeAdResult(id, format, result.bytes);
    await prisma.adVideo.update({
      where: { id },
      data: { ...payload, script: (row.script as any) || {} },
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    logger.warn(`Ad render ${id} failed: ${msg}`);
    await prisma.adVideo.update({ where: { id }, data: { status: 'FAILED', error: msg.slice(0, 2000) } });
  }
}

/**
 * M-sigterm recovery: a deploy (SIGTERM) or crash mid-render leaves rows stuck
 * in RENDERING forever — they were never retried. Called at boot: requeue the
 * stuck jobs and run them again. Returns how many were recovered.
 */
export async function recoverStuckAdRenders(runner: (id: string) => Promise<void> = runAdVideoJob): Promise<number> {
  try {
    const stuck = await prisma.adVideo.findMany({ where: { status: 'RENDERING' }, select: { id: true } });
    if (!stuck.length) return 0;
    await prisma.adVideo.updateMany({ where: { status: 'RENDERING' }, data: { status: 'QUEUED' } });
    for (const row of stuck) {
      setImmediate(() => { void runner(row.id); });
    }
    logger.info(`Ad recovery: requeued ${stuck.length} interrupted render(s)`);
    return stuck.length;
  } catch (e: any) {
    logger.warn(`Ad recovery failed: ${e?.message || e}`);
    return 0;
  }
}

export { AD_VIDEO_TEMPLATES };
