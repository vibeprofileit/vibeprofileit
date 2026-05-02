'use client';

import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';

/**
 * STEAM LİMİTLERİ VE SABİTLER
 */
const TARGET_BYTES = Math.floor(4.95 * 1024 * 1024);
const MIN_FRAME_DELAY = 20;

interface RenderedFrame {
  canvas: HTMLCanvasElement;
  delay: number;
}

export interface GifProcessResult {
  data: Blob;
  fps: number;
  durationMs: number;
  sizeBytes: number;
}

/**
 * ADIM 1: GIF DECODE
 * Kareleri ve orijinal zamanlamaları ayrıştırır.
 */
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

    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    patchCanvas.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
      0, 0
    );
    
    stateCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    const snap = document.createElement('canvas');
    snap.width = gifW;
    snap.height = gifH;
    snap.getContext('2d')!.drawImage(stateCanvas, 0, 0);
    
    // Gecikmeyi ms cinsine çeviriyoruz (x10)
    result.push({ 
      canvas: snap, 
      delay: Math.max(MIN_FRAME_DELAY, frame.delay * 10) 
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

/**
 * ADIM 2: ENCODE
 * Kareleri tekrar GIF formatına sokar.
 */
function encodeGif(
  frames: RenderedFrame[],
  width: number,
  height: number,
  quality: number
): Promise<{ data: Blob; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: quality, // 10 = Hız ve Boyut dengesi
      width: width,
      height: height,
      workerScript: '/gif.worker.js',
      repeat: 0,
      transparent: null
    });

    for (const f of frames) {
      gif.addFrame(f.canvas, { delay: f.delay, copy: true });
    }

    gif.on('finished', (blob: Blob) => resolve({ data: blob, sizeBytes: blob.size }));
    gif.on('error', (err: Error) => reject(err));
    gif.render();
  });
}

/**
 * PUBLIC API: ANA İŞLEMCİ
 */
export async function processGif(
  file: File, 
  options: { cropX?: number; cropW?: number; targetWidth?: number }
): Promise<GifProcessResult> {
  // 1. Orijinal veriyi al
  const { frames } = await decodeGif(file);
  const srcH = frames[0].canvas.height;
  const srcW = frames[0].canvas.width;

  // 2. Kırpma veya Yeniden Boyutlandırma (Sadece istenen işlem)
  const processed = frames.map(f => {
    let outW = options.cropW || options.targetWidth || srcW;
    let outH = options.cropW ? srcH : Math.round(srcH * (outW / srcW));

    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext('2d')!;

    if (options.cropX !== undefined && options.cropW !== undefined) {
      // Classic Mode Kırpma
      ctx.drawImage(f.canvas, options.cropX, 0, options.cropW, srcH, 0, 0, options.cropW, srcH);
    } else if (options.targetWidth !== undefined) {
      // Featured Mode Ölçekleme
      ctx.drawImage(f.canvas, 0, 0, srcW, srcH, 0, 0, outW, outH);
    } else {
      ctx.drawImage(f.canvas, 0, 0);
    }
    return { canvas: c, delay: f.delay };
  });

  const finalW = processed[0].canvas.width;
  const finalH = processed[0].canvas.height;
  const durationMs = processed.reduce((s, f) => s + f.delay, 0);

  // 3. FAST-PATH: Dosya zaten küçükse direkt paketle ve bitir!
  // Quality 10, Steam'in renk paleti için yeterince iyidir ve dosyayı şişirmez.
  console.log("🚀 Fast-Path processing started...");
  const result = await encodeGif(processed, finalW, finalH, 10);

  // 4. LİMİT KONTROLÜ: Eğer hala büyükse (nadir), kaliteyi biraz daha düşür.
  if (result.sizeBytes > TARGET_BYTES) {
    console.warn("⚠️ Still too large, applying secondary compression...");
    const compressed = await encodeGif(processed, finalW, finalH, 20);
    return {
      data: compressed.data,
      fps: Math.round((processed.length / (durationMs / 1000))),
      durationMs,
      sizeBytes: compressed.sizeBytes
    };
  }

  return { 
    data: result.data, 
    fps: Math.round((processed.length / (durationMs / 1000))), 
    durationMs, 
    sizeBytes: result.sizeBytes 
  };
}
