'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const STEAM_SAFE = Math.floor(4.95 * 1024 * 1024);
const TIMEOUT_MS = 45_000;
const IN_NAME    = 'input.gif';   // sanal FS'de sabit giriş ismi
const OUT_NAME   = 'output.gif';  // sanal FS'de sabit çıkış ismi

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
  colors: number
): string {
  const parts: string[] = [];
  if (fps !== null) parts.push(`fps=${fps}`);
  parts.push(`scale=${scaleW}:-1:flags=lanczos`);
  if (cropW !== null) parts.push(`crop=${cropW}:ih:${cropX}:0`);
  const chain = parts.join(',');
  return (
    `${chain},split[s0][s1]` +
    `;[s0]palettegen=max_colors=${colors}:stats_mode=diff[p]` +
    `;[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle[out]`
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
  scaleW: number; cropW: number | null; cropX: number | null;
  fps: number | null; colors: number; trim: boolean;
}

async function execCrop(f: FFmpeg, p: CropParams): Promise<Uint8Array> {
  recentLogs = [];
  const filter = buildFilter(p.scaleW, p.cropW, p.cropX, p.fps, p.colors);
  const args = ['-i', IN_NAME];
  if (p.trim) args.push('-t', '3');
  args.push('-filter_complex', filter, '-map', '[out]', OUT_NAME);

  try {
    await f.exec(args);
  } catch {
    throw new Error('FFmpeg exec failed: ' + recentLogs.slice(-5).join(' | '));
  }

  // Güvenli okuma: try/catch + finally ile dosyayı her durumda temizle
  const data = await (async () => {
    try {
      return await f.readFile(OUT_NAME) as Uint8Array;
    } catch {
      throw new Error('FFmpeg output not found. Logs: ' + recentLogs.slice(-5).join(' | '));
    } finally {
      try { await f.deleteFile(OUT_NAME); } catch { /* ok */ }
    }
  })();

  if (!data || data.byteLength === 0) {
    throw new Error('FFmpeg empty output. Logs: ' + recentLogs.slice(-5).join(' | '));
  }
  return data;
}

// ─── per-job processor ───────────────────────────────────────────────────────
interface Job { scaleW: number; cropW: number | null; cropX: number | null; outName: string; }

async function processJob(
  f: FFmpeg, job: Job, startTime: number
): Promise<{ outName: string; data: Uint8Array }> {
  const { scaleW, cropW, cropX, outName } = job;

  // Step 1 — Crop, max quality, no trim
  let data = await execCrop(f, { scaleW, cropW, cropX,
    fps: null, colors: 256, trim: false });
  const duration = parseDuration(recentLogs);
  const srcFps   = parseFps(recentLogs);

  // Bypass: boyut ≤ 4.95 MB → döngü açılmaz
  if (data.byteLength <= STEAM_SAFE) return { outName, data };

  // Step 2 — Trim (only if > 3 s)
  const withTrim = duration > 3;
  if (withTrim) {
    data = await execCrop(f, { scaleW, cropW, cropX,
      fps: null, colors: 256, trim: true });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  // Step 3b — FPS: srcFps → 13
  for (let fps = Math.floor(srcFps) - 2; fps >= 13; fps -= 2) {
    if (Date.now() - startTime > TIMEOUT_MS) throw new Error('İşlem zaman aşımına uğradı (45s)');
    data = await execCrop(f, { scaleW, cropW, cropX,
      fps, colors: 256, trim: withTrim });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  // Step 3c — Colors: 240 → 160
  for (let colors = 240; colors >= 160; colors -= 16) {
    if (Date.now() - startTime > TIMEOUT_MS) throw new Error('İşlem zaman aşımına uğradı (45s)');
    data = await execCrop(f, { scaleW, cropW, cropX,
      fps: 13, colors, trim: withTrim });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  throw new Error('Kalite standartları karşılanamadı: dosya 4.95 MB altına indirilemiyor.');
}

// ─── public API ──────────────────────────────────────────────────────────────
// Returns { 'main.gif': Blob, 'side.gif': Blob } or { 'featured_main.gif': Blob }
export function processGif(
  file: File,
  mode: 'classic' | 'featured',
  onProgress?: (p: number) => void,
  onWarning?: () => void
): Promise<Record<string, Blob>> {
  return new Promise(async (resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/gif-worker.ts', import.meta.url)
    );

    function finish(fn: () => void): void {
      worker.terminate();
      fn();
    }

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      switch (msg.type) {
        case 'progress':
          onProgress?.(msg.value);
          break;

        case 'result':
        case 'warning': {
          if (msg.type === 'warning') {
            console.warn('[GIF Worker]', msg.msg);
            onWarning?.();
          }
          const blobs: Record<string, Blob> = {};
          for (const [name, buf] of Object.entries(msg.files as Record<string, ArrayBuffer>)) {
            blobs[name] = new Blob([buf], { type: 'image/gif' });
          }
          finish(() => resolve(blobs));
          break;
        }

        case 'error':
          finish(() => reject(new Error(msg.msg)));
          break;
      }
    };

    worker.onerror = (e: ErrorEvent) => {
      finish(() => reject(new Error(`GIF Worker hatası: ${e.message}`)));
    };

    const buffer = await file.arrayBuffer();
    worker.postMessage({ type: 'process', mode, buffer, inputSize: file.size }, [buffer]);
  });
}
