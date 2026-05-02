'use client';

import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';

const TARGET_BYTES = Math.floor(4.95 * 1024 * 1024);
const MIN_FRAME_DELAY = 20;

interface RenderedFrame {
  canvas: HTMLCanvasElement;
  delay: number; // Her karenin kendine has gecikmesi
}

export interface GifProcessResult {
  data: Blob;
  fps: number;
  durationMs: number;
  sizeBytes: number;
}

// ── Step 1: Decode GIF (Zamanlamayı koruyarak) ─────────────────────────────
async function decodeGif(file: File): Promise<{
  frames: RenderedFrame[];
  width: number;
  height: number;
}> {
  const buffer = await file.arrayBuffer();
  const parsed = parseGIF(buffer);
  const raw = decompressFrames(parsed, true);

  const gifW = parsed.lsd.width;
  const gifH = parsed.lsd.height;

  const stateCanvas = document.createElement('canvas');
  stateCanvas.width = gifW;
  stateCanvas.height = gifH;
  const stateCtx = stateCanvas.getContext('2d', { willReadFrequently: true })!;

  const result: RenderedFrame[] = [];
  let prevImageData: ImageData | null = null;

  for (const frame of raw) {
    const restorePoint = stateCtx.getImageData(0, 0, gifW, gifH);

    // Alpha kompozisyonu için temp canvas kullanıyoruz
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    const pCtx = patchCanvas.getContext('2d')!;
    pCtx.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height), 0, 0);
    
    stateCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    const snap = document.createElement('canvas');
    snap.width = gifW;
    snap.height = gifH;
    snap.getContext('2d')!.drawImage(stateCanvas, 0, 0);
    
    // Gecikme süresini (ms) orijinalden al, browser sınırının altına düşme
    result.push({ 
      canvas: snap, 
      delay: Math.max(MIN_FRAME_DELAY, frame.delay) 
    });

    if (frame.disposalType === 2) {
      stateCtx.clearRect(0, 0, gifW, gifH);
    } else if (frame.disposalType === 3 && prevImageData) {
      stateCtx.putImageData(prevImageData, 0, 0);
    }
    prevImageData = restorePoint;
  }

  return { frames: result, width: gifW, height: gifH };
}

// ── Step 2: Encode (Kare bazlı gecikme desteğiyle) ──────────────────────────
function encodeGif(
  frames: RenderedFrame[],
  width: number,
  height: number,
  quality: number,
  useOriginalDelays: boolean = true,
  targetFps: number = 15
): Promise<{ data: Blob; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 4, // Hız için worker sayısını artırdık
      quality: quality, // 1 en iyi, 10-20 arası Steam için dengeli
      width: width,
      height: height,
      workerScript: '/gif.worker.js',
      repeat: 0,
      transparent: null // Steam'de siyah arka plan hatasını önlemek için
    });

    for (const f of frames) {
      // Eğer limit altındaysak f.delay kullan, üstündeysek targetFps'e göre uniform git
      const finalDelay = useOriginalDelays ? f.delay : Math.round(1000 / targetFps);
      gif.addFrame(f.canvas, { delay: finalDelay, copy: true });
    }

    gif.on('finished', (blob: Blob) => resolve({ data: blob, sizeBytes: blob.size }));
    gif.on('error', (err: Error) => reject(err));
    gif.render();
  });
}

// ── Step 3: Crop & Scale (AspectRatio koruyarak) ───────────────────────────
function processFrames(frames: RenderedFrame[], options: { cropX?: number, cropW?: number, targetW?: number }) {
  const srcH = frames[0].canvas.height;
  const srcW = frames[0].canvas.width;

  return frames.map(f => {
    let outW = options.cropW || options.targetW || srcW;
    let outH = options.cropW ? srcH : Math.round(srcH * (outW / srcW));

    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext('2d')!;

    if (options.cropX !== undefined && options.cropW !== undefined) {
      // Classic Mode: Kırpma
      ctx.drawImage(f.canvas, options.cropX, 0, options.cropW, srcH, 0, 0, options.cropW, srcH);
    } else {
      // Featured Mode: Boyutlandırma
      ctx.drawImage(f.canvas, 0, 0, srcW, srcH, 0, 0, outW, outH);
    }
    return { canvas: c, delay: f.delay };
  });
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function processGif(file: File, options: { cropX?: number; cropW?: number; targetWidth?: number }): Promise<GifProcessResult> {
  const { frames, width, height } = await decodeGif(file);
  
  // Önce istenen boyutlara getir (crop veya scale)
  const processed = processFrames(frames, { 
    cropX: options.cropX, 
    cropW: options.cropW, 
    targetW: options.targetWidth 
  });

  const outW = processed[0].canvas.width;
  const outH = processed[0].canvas.height;
  const durationMs = processed.reduce((s, f) => s + f.delay, 0);

  // KRİTİK NOKTA: Eğer dosya zaten 4.95MB altındaysa kalite=1 ve orijinal delay ile paketle
  if (file.size <= TARGET_BYTES) {
    const result = await encodeGif(processed, outW, outH, 1, true);
    return { data: result.data, fps: Math.round(1000 / (durationMs / processed.length)), durationMs, sizeBytes: result.sizeBytes };
  }

  // Eğer limit üstündeyse optimizasyona gir (Burada senin mevcut optimizeLoop mantığını kullanabilirsin)
  const result = await encodeGif(processed, outW, outH, 10, false, 15);
  return { data: result.data, fps: 15, durationMs, sizeBytes: result.sizeBytes };
}
