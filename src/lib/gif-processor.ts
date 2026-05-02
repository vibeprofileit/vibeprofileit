'use client';

import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';

const TARGET_BYTES = Math.floor(4.95 * 1024 * 1024);
const MIN_FRAME_DELAY = 20;

export async function processGif(
  file: File, 
  options: { cropX?: number; cropW?: number; targetWidth?: number }
): Promise<any> {
  // 1. ADIM: GIF'i parçala
  const buffer = await file.arrayBuffer();
  const parsed = parseGIF(buffer);
  const raw = decompressFrames(parsed, true);
  
  const gifW = parsed.lsd.width;
  const gifH = parsed.lsd.height;

  // 2. ADIM: Kareleri hazırla
  const stateCanvas = document.createElement('canvas');
  stateCanvas.width = gifW;
  stateCanvas.height = gifH;
  const stateCtx = stateCanvas.getContext('2d', { willReadFrequently: true })!;

  const processedFrames = raw.map((frame) => {
    // Kareyi oluştur
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    patchCanvas.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
      0, 0
    );
    
    // Önceki kareden kalanlarla birleştir (Disposal Method simülasyonu)
    stateCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    // Şimdi asıl kesme işlemini yap (Target boyutlara göre)
    const outW = options.cropW || options.targetWidth || gifW;
    const outH = options.cropW ? gifH : Math.round(gifH * (outW / gifW));

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = outW;
    finalCanvas.height = outH;
    const finalCtx = finalCanvas.getContext('2d')!;

    if (options.cropX !== undefined && options.cropW !== undefined) {
      // Classic Mode: Kırpma
      finalCtx.drawImage(stateCanvas, options.cropX, 0, options.cropW, gifH, 0, 0, options.cropW, gifH);
    } else if (options.targetWidth !== undefined) {
      // Featured Mode: Boyutlandırma
      finalCtx.drawImage(stateCanvas, 0, 0, gifW, gifH, 0, 0, outW, outH);
    } else {
      finalCtx.drawImage(stateCanvas, 0, 0);
    }

    return {
      canvas: finalCanvas,
      // KRİTİK: gifuct-js 1/100sn verir, gif.js milisaniye ister.
      delay: Math.max(MIN_FRAME_DELAY, frame.delay * 10)
    };
  });

  // 3. ADIM: Yeniden paketle (NUCLEAR OPTION)
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      width: processedFrames[0].canvas.width,
      height: processedFrames[0].canvas.height,
      workerScript: '/gif.worker.js',
      /* 
         QUALITY: 20 -> Bu ayar pikselleri öldürmez ama dosya boyutunu %60-70 düşürür.
         DITHER: false -> Dosyanın şişmesini engelleyen en önemli ayar budur.
      */
      quality: 20, 
      dither: false, 
      repeat: 0,
      transparent: null
    });

    processedFrames.forEach(f => {
      gif.addFrame(f.canvas, { delay: f.delay, copy: true });
    });

    gif.on('finished', (blob: Blob) => {
      const durationMs = processedFrames.reduce((s, f) => s + f.delay, 0);
      console.log("✅ İşlem bitti. Yeni boyut:", (blob.size / 1024 / 1024).toFixed(2), "MB");
      
      resolve({
        data: blob,
        fps: Math.round((processedFrames.length / (durationMs / 1000))),
        durationMs,
        sizeBytes: blob.size
      });
    });

    gif.on('error', (err: Error) => reject(err));
    gif.render();
  });
}