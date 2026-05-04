'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const STEAM_SAFE = Math.floor(4.95 * 1024 * 1024); // 4.95 MB
const TIMEOUT_MS = 45_000;

let ffmpeg: FFmpeg | null = null;
let initPromise: Promise<void> | null = null;
let recentLogs: string[] = [];

// ─── init ────────────────────────────────────────────────────────────────────
export function initFFmpeg(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }: { message: string }) => {
      recentLogs.push(message);
    });
    await ffmpeg.load({
      coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
    });
  })();
  return initPromise;
}

// ─── filter builder ──────────────────────────────────────────────────────────
function buildFilter(
  scaleW: number,
  cropW: number | null,
  cropX: number | null,
  fps: number | null,
  colors: number,
  lossy: number
): string {
  const parts: string[] = [];
  if (fps !== null) parts.push(`fps=${fps}`);
  parts.push(`scale=${scaleW}:-1:flags=lanczos`);
  if (cropW !== null) parts.push(`crop=${cropW}:ih:${cropX}:0`);
  const chain = parts.join(',');
  // [out] etiketi zorunlu: -filter_complex ile kullanılıyor
  return (
    `${chain},split[s0][s1]` +
    `;[s0]palettegen=max_colors=${colors}:stats_mode=diff[p]` +
    `;[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle:lossy=${lossy}[out]`
  );
}

function parseDuration(logs: string[]): number {
  for (const line of logs) {
    const m = line.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  }
  return 0;
}

function parseFps(logs: string[]): number {
  for (const line of logs) {
    const m = line.match(/(\d+(?:\.\d+)?)\s*fps/i);
    if (m) {
      const v = parseFloat(m[1]);
      if (v > 0 && v <= 60) return v;
    }
  }
  return 24;
}

// ─── single FFmpeg pass ──────────────────────────────────────────────────────
interface CropParams {
  inName: string; outName: string;
  scaleW: number; cropW: number | null; cropX: number | null;
  fps: number | null; colors: number; lossy: number; trim: boolean;
}

async function execCrop(f: FFmpeg, p: CropParams): Promise<Uint8Array> {
  recentLogs = [];
  const filter = buildFilter(p.scaleW, p.cropW, p.cropX, p.fps, p.colors, p.lossy);
  const args = ['-i', p.inName];
  if (p.trim) args.push('-t', '3');
  // -filter_complex + -map [out]: split/palettegen/paletteuse filtergraph için zorunlu
  args.push('-filter_complex', filter, '-map', '[out]', p.outName);

  try {
    await f.exec(args);
  } catch {
    throw new Error('FFmpeg exec failed: ' + recentLogs.slice(-2).join(' | '));
  }

  const data = await f.readFile(p.outName) as Uint8Array;
  if (!data || data.byteLength === 0) {
    throw new Error(`FFmpeg empty output: ${p.outName}`);
  }
  try { await f.deleteFile(p.outName); } catch { /* ok */ }
  return data;
}

// ─── per-job processor ───────────────────────────────────────────────────────
interface Job { scaleW: number; cropW: number | null; cropX: number | null; outName: string; }

async function processJob(
  f: FFmpeg, inName: string, job: Job, startTime: number
): Promise<{ outName: string; data: Uint8Array }> {
  const { scaleW, cropW, cropX, outName } = job;

  // Step 1 — Crop, max quality, no trim
  let data = await execCrop(f, { inName, outName, scaleW, cropW, cropX,
    fps: null, colors: 256, lossy: 0, trim: false });
  const duration = parseDuration(recentLogs);
  const srcFps   = parseFps(recentLogs);

  // Bypass check
  if (data.byteLength <= STEAM_SAFE) return { outName, data };

  // Step 2 — Trim (only if > 3 s)
  const withTrim = duration > 3;
  if (withTrim) {
    data = await execCrop(f, { inName, outName, scaleW, cropW, cropX,
      fps: null, colors: 256, lossy: 0, trim: true });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  // Step 3a — Lossy escalation: 10 → 70
  for (let lossy = 10; lossy <= 70; lossy += 10) {
    if (Date.now() - startTime > TIMEOUT_MS) throw new Error('İşlem zaman aşımına uğradı (45s)');
    data = await execCrop(f, { inName, outName, scaleW, cropW, cropX,
      fps: null, colors: 256, lossy, trim: withTrim });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  // Step 3b — FPS reduction: srcFps → 13
  for (let fps = Math.floor(srcFps) - 2; fps >= 13; fps -= 2) {
    if (Date.now() - startTime > TIMEOUT_MS) throw new Error('İşlem zaman aşımına uğradı (45s)');
    data = await execCrop(f, { inName, outName, scaleW, cropW, cropX,
      fps, colors: 256, lossy: 70, trim: withTrim });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  // Step 3c — Color reduction: 240 → 160
  for (let colors = 240; colors >= 160; colors -= 16) {
    if (Date.now() - startTime > TIMEOUT_MS) throw new Error('İşlem zaman aşımına uğradı (45s)');
    data = await execCrop(f, { inName, outName, scaleW, cropW, cropX,
      fps: 13, colors, lossy: 70, trim: withTrim });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  throw new Error('Kalite standartları karşılanamadı: dosya 4.95 MB altına indirilemiyor.');
}

// ─── public API ──────────────────────────────────────────────────────────────
// Returns { 'main.gif': Blob, 'side.gif': Blob } or { 'featured_main.gif': Blob }
export async function processGif(
  file: File,
  mode: 'classic' | 'featured',
  onProgress?: (p: number) => void
): Promise<Record<string, Blob>> {
  await initFFmpeg();
  const f = ffmpeg!;

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.round(progress * 100));
  };
  f.on('progress', progressHandler);

  try {
    const inName = 'input.gif';
    await f.writeFile(inName, new Uint8Array(await file.arrayBuffer()));

    const jobs: Job[] = mode === 'featured'
      ? [{ scaleW: 630, cropW: null, cropX: null, outName: 'featured_main.gif' }]
      : [
          { scaleW: 612, cropW: 506, cropX: 0,   outName: 'main.gif'  },
          { scaleW: 612, cropW: 100, cropX: 512,  outName: 'side.gif'  },
        ];

    const startTime = Date.now();
    const results: Record<string, Blob> = {};

    for (const job of jobs) {
      const { outName, data } = await processJob(f, inName, job, startTime);
      results[outName] = new Blob([new Uint8Array(data)], { type: 'image/gif' });
    }

    try { await f.deleteFile(inName); } catch { /* ok */ }
    return results;

  } finally {
    f.off('progress', progressHandler);
  }
}
