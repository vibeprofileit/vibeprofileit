'use client';

import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const TARGET_BYTES    = Math.floor(4.95 * 1024 * 1024); // 4.95 MB Steam limit
const TIMEOUT_MS      = 45_000;                          // 45s hard timeout
const MIN_FPS         = 12;                              // never go below this
const MAX_DURATION_MS = 3_000;                           // 3 second hard cap
const MIN_FRAME_DELAY = 20;                              // browsers ignore <20ms delays

// ── Internal types ────────────────────────────────────────────────────────────
interface RenderedFrame {
  canvas: HTMLCanvasElement;
  delay: number; // ms
}

export interface GifProcessResult {
  data: Uint8Array;
  fps: number;
  durationMs: number;
  sizeBytes: number;
}

// ── Dimension validation (non-avatar) ────────────────────────────────────────
export function validateDimensions(width: number, height: number): string | null {
  if (width < 600)   return 'Image must be at least 600px wide (min 600px)';
  if (height < 500)  return 'Image must be at least 500px tall (min 500px)';
  if (width > 4000)  return 'Image must be no wider than 4000px';
  return null;
}

// ── Step 2: Decode GIF → fully composited frames ─────────────────────────────
async function decodeGif(file: File): Promise<{
  frames: RenderedFrame[];
  width: number;
  height: number;
}> {
  const buffer = await file.arrayBuffer();
  const parsed = parseGIF(buffer);
  const raw    = decompressFrames(parsed, true);

  const gifW = parsed.lsd.width;
  const gifH = parsed.lsd.height;

  // Persistent state canvas — frames are composited on top of each other
  const stateCanvas = document.createElement('canvas');
  stateCanvas.width  = gifW;
  stateCanvas.height = gifH;
  const stateCtx = stateCanvas.getContext('2d')!;

  const result: RenderedFrame[] = [];
  let prevImageData: ImageData | null = null;

  for (const frame of raw) {
    // Save current state before drawing (needed for disposal type 3)
    const restorePoint = stateCtx.getImageData(0, 0, gifW, gifH);

    // Convert patch (RGBA for this frame's region) to a temp canvas so drawImage
    // handles alpha compositing correctly (putImageData overwrites, drawImage blends)
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width  = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    patchCanvas.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
      0, 0
    );
    stateCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    // Snapshot the fully composited frame
    const snap = document.createElement('canvas');
    snap.width  = gifW;
    snap.height = gifH;
    snap.getContext('2d')!.drawImage(stateCanvas, 0, 0);
    result.push({ canvas: snap, delay: Math.max(MIN_FRAME_DELAY, frame.delay * 10) });

    // Apply this frame's disposal method so the next frame starts correctly
    if (frame.disposalType === 2) {
      // Restore to background (clear)
      stateCtx.clearRect(0, 0, gifW, gifH);
    } else if (frame.disposalType === 3 && prevImageData) {
      // Restore to what canvas looked like before this frame
      stateCtx.putImageData(prevImageData, 0, 0);
    }
    // Types 0 and 1: leave stateCanvas as-is

    prevImageData = restorePoint;
  }

  return { frames: result, width: gifW, height: gifH };
}

// ── Step 3a: Crop each frame ──────────────────────────────────────────────────
function cropFrames(frames: RenderedFrame[], x: number, cropW: number): RenderedFrame[] {
  const cropH = frames[0]?.canvas.height ?? 0;
  return frames.map(f => {
    const c = document.createElement('canvas');
    c.width  = cropW;
    c.height = cropH;
    c.getContext('2d')!.drawImage(f.canvas, x, 0, cropW, cropH, 0, 0, cropW, cropH);
    return { canvas: c, delay: f.delay };
  });
}

// ── Step 3b: Scale frames to target width (proportional height) ───────────────
function scaleFrames(frames: RenderedFrame[], targetW: number): RenderedFrame[] {
  if (!frames.length) return frames;
  const srcW = frames[0].canvas.width;
  if (srcW <= targetW) return frames; // already fits
  const srcH    = frames[0].canvas.height;
  const targetH = Math.round(srcH * (targetW / srcW));
  return frames.map(f => {
    const c = document.createElement('canvas');
    c.width  = targetW;
    c.height = targetH;
    c.getContext('2d')!.drawImage(f.canvas, 0, 0, targetW, targetH);
    return { canvas: c, delay: f.delay };
  });
}

// ── Step 4: Trim to 3 seconds if over (never extend) ─────────────────────────
function fixDuration(frames: RenderedFrame[]): RenderedFrame[] {
  const total = frames.reduce((s, f) => s + f.delay, 0);
  if (total <= MAX_DURATION_MS) return frames; // under 3s → do nothing

  const result: RenderedFrame[] = [];
  let accumulated = 0;
  for (const f of frames) {
    if (accumulated >= MAX_DURATION_MS) break;
    const available = MAX_DURATION_MS - accumulated;
    result.push(available < f.delay ? { canvas: f.canvas, delay: available } : f);
    accumulated += f.delay;
  }
  return result.length > 0 ? result : [frames[0]];
}

// ── FPS reduction via time-bucket sampling ────────────────────────────────────
function reduceFps(frames: RenderedFrame[], targetFps: number): RenderedFrame[] {
  const total      = frames.reduce((s, f) => s + f.delay, 0);
  const currentFps = (frames.length / total) * 1000;
  if (currentFps <= targetFps) return frames;

  const targetCount = Math.max(1, Math.round(frames.length * (targetFps / currentFps)));
  const bucketMs    = total / targetCount;
  const result: RenderedFrame[] = [];

  for (let i = 0; i < targetCount; i++) {
    const targetTime = i * bucketMs;
    let acc = 0;
    let srcIdx = 0;
    for (let j = 0; j < frames.length; j++) {
      srcIdx = j;
      acc += frames[j].delay;
      if (acc > targetTime) break;
    }
    result.push({ canvas: frames[srcIdx].canvas, delay: Math.round(bucketMs) });
  }

  return result;
}

// ── Encode: frames → GIF Uint8Array via gif.js Web Workers ───────────────────
function encodeGif(
  frames: RenderedFrame[],
  width: number,
  height: number,
  quality: number  // gif.js: 1=best/largest, 30=worst/smallest
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality,
      width,
      height,
      workerScript: '/gif.worker.js',
      repeat: 0,
    });

    for (const f of frames) {
      gif.addFrame(f.canvas, { delay: f.delay, copy: true });
    }

    gif.on('finished', (blob: Blob) => {
      blob.arrayBuffer()
        .then(buf => resolve(new Uint8Array(buf)))
        .catch(reject);
    });
    gif.on('error', (err: Error) => reject(err));

    gif.render();
  });
}

// ── Step 5: Optimize loop (45s max) ──────────────────────────────────────────
// Quality ladder maps roughly to gifsicle --lossy levels:
//   quality=10 ≈ lossy=25  (minimal quality loss)
//   quality=15 ≈ lossy=45
//   quality=20 ≈ lossy=65
//   quality=25 ≈ lossy=80  (maximum acceptable loss)
// FPS is reduced only after all quality steps are exhausted.
async function optimizeLoop(
  frames: RenderedFrame[],
  width: number,
  height: number,
  deadline: number
): Promise<{ data: Uint8Array; fps: number }> {
  const QUALITY_STEPS = [10, 15, 20, 25];
  const FPS_STEPS     = [15, 13, MIN_FPS];

  const origFps = Math.round((frames.length / frames.reduce((s, f) => s + f.delay, 0)) * 1000);

  for (const quality of QUALITY_STEPS) {
    for (const targetFps of FPS_STEPS) {
      if (Date.now() >= deadline) {
        throw new Error('Processing taking too long - file might be too large or complex');
      }

      const reduced    = reduceFps(frames, Math.min(targetFps, origFps));
      const totalDelay = reduced.reduce((s, f) => s + f.delay, 0);
      const actualFps  = Math.round((reduced.length / totalDelay) * 1000);

      const data = await encodeGif(reduced, width, height, quality);

      if (data.byteLength <= TARGET_BYTES) {
        return { data, fps: actualFps };
      }
    }
  }

  throw new Error(
    'Processing failed - GIF would be too low quality (min FPS: 12, Colors: 128). ' +
    'Try a shorter or lower-resolution GIF.'
  );
}

// ── Step 6: Quality assurance check ──────────────────────────────────────────
// FPS is NOT checked here — the optimize loop already enforces MIN_FPS=12 as
// its floor. Checking FPS on the initial path would reject valid low-framerate
// GIFs (e.g. 5-frame slideshow at 200ms/frame = 5 FPS, perfectly fine).
function assertQuality(durationMs: number, sizeBytes: number): void {
  if (durationMs > MAX_DURATION_MS + 50) { // 50ms tolerance for rounding
    throw new Error(`Duration check failed: ${(durationMs / 1000).toFixed(1)}s exceeds 3s limit`);
  }
  if (sizeBytes > TARGET_BYTES) {
    const mb = (sizeBytes / 1024 / 1024).toFixed(1);
    throw new Error(`File exceeds Steam's 4.95 MB limit after compression (${mb} MB)`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface ProcessGifOptions {
  cropX?:       number; // classic mode crop
  cropW?:       number;
  targetWidth?: number; // featured mode scale
}

export async function processGif(
  file: File,
  options: ProcessGifOptions = {}
): Promise<GifProcessResult> {
  const deadline = Date.now() + TIMEOUT_MS;

  // Step 2: Decode
  const { frames, width, height } = await decodeGif(file);

  if (frames.length === 0) {
    throw new Error('GIF has no readable frames');
  }

  // Step 3: Crop or scale
  let processed: RenderedFrame[];
  let outW: number;
  let outH: number;

  if (options.cropX !== undefined && options.cropW !== undefined) {
    processed = cropFrames(frames, options.cropX, options.cropW);
    outW = options.cropW;
    outH = frames[0].canvas.height;
  } else if (options.targetWidth !== undefined) {
    processed = scaleFrames(frames, options.targetWidth);
    outW = processed[0].canvas.width;
    outH = processed[0].canvas.height;
  } else {
    processed = frames;
    outW = width;
    outH = height;
  }

  // Step 4: Fix duration (trim to 3s if over)
  processed = fixDuration(processed);

  const durationMs = processed.reduce((s, f) => s + f.delay, 0);
  const origFps    = Math.round((processed.length / durationMs) * 1000);

  // Step 5: Branch on ORIGINAL file size — not the re-encoded output.
  // gif.js full-frame re-encode can produce a larger result than the original
  // even at quality=1, so we must not use encoded size to decide whether to
  // optimize. The user's intent: small originals → crop only, no lossy/FPS changes.
  if (file.size <= TARGET_BYTES) {
    // Under limit: encode at maximum quality (quality=1), no FPS or lossy changes.
    const data = await encodeGif(processed, outW, outH, 1);
    return { data, fps: origFps, durationMs, sizeBytes: data.byteLength };
  }

  // Over limit: run optimize loop (quality→FPS reduction ladder)
  const { data, fps } = await optimizeLoop(processed, outW, outH, deadline);

  // Step 6: Quality assurance (size + duration — FPS floor enforced by the loop)
  assertQuality(durationMs, data.byteLength);

  return { data, fps, durationMs, sizeBytes: data.byteLength };
}
