import type { Request, Response } from 'express';

/**
 * M-video: minimal HTTP Range support for buffered assets (store videos and
 * Ad Studio MP4s). Without partial content, mobile Safari refuses to play
 * <video> sources served from this API, and seeking is impossible.
 *
 * Sentence semantics: full response 200 when no Range header. Valid ranges →
 * 206 with Content-Range. Invalid/unsatisfiable → 416 with Content-Range: bytes *.
 * Multi-range requests are treated as a single range (first only).
 */
export function serveRangeBuffer(req: Request, res: Response, buffer: Buffer, baseHeaders: Record<string, string> = {}): void {
  const total = buffer.length;
  const base: Record<string, string> = {
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    ...baseHeaders,
  };

  const range = req.headers.range;
  if (!range) {
    for (const [k, v] of Object.entries(base)) res.setHeader(k, v);
    res.setHeader('Content-Length', total);
    res.status(200).send(buffer);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    res.setHeader('Content-Range', `bytes */${total}`);
    res.status(416).end();
    return;
  }

  let start: number;
  let end: number;
  if (match[1] === '') {
    // suffix: last N bytes
    const suffix = parseInt(match[2], 10);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      res.setHeader('Content-Range', `bytes */${total}`);
      res.status(416).end();
      return;
    }
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = parseInt(match[1], 10);
    end = match[2] === '' ? total - 1 : parseInt(match[2], 10);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
    res.setHeader('Content-Range', `bytes */${total}`);
    res.status(416).end();
    return;
  }
  end = Math.min(end, total - 1);
  const chunk = buffer.subarray(start, end + 1);

  for (const [k, v] of Object.entries(base)) res.setHeader(k, v);
  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  res.setHeader('Content-Length', chunk.length);
  res.send(chunk);
}
