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

  // 2. ADIM: Kümülatif kompozit canvas (disposal simülasyonu için)
  const stateCanvas = document.createElement('canvas');
  stateCanvas.width = gifW;
  stateCanvas.height = gifH;
  const stateCtx = stateCanvas.getContext('2d', { willReadFrequently: true })!;

  // disposalType=3 için çizimden önceki durumu tutan yedek canvas
  const savedCanvas = document.createElement('canvas');
  savedCanvas.width = gifW;
  savedCanvas.height = gifH;
  const savedCtx = savedCanvas.getContext('2d', { willReadFrequently: true })!;

  const processedFrames: Array<{ canvas: HTMLCanvasElement; delay: number }> = [];
  let prevFrame: (typeof raw)[0] | null = null;

  for (const frame of raw) {
    // Önceki karenin disposal metodunu uygula
    if (prevFrame) {
      const d = prevFrame.disposalType;
      if (d === 2) {
        // Arka plana geri döndür: sadece ilgili bölgeyi temizle
        stateCtx.clearRect(
          prevFrame.dims.left,
          prevFrame.dims.top,
          prevFrame.dims.width,
          prevFrame.dims.height
        );
      } else if (d === 3) {
        // Önceki duruma geri döndür: kaydedilmiş canvas'ı geri yükle
        stateCtx.clearRect(0, 0, gifW, gifH);
        stateCtx.drawImage(savedCanvas, 0, 0);
      }
    }

    // Bu kare disposal=3 ise, patch çizilmeden ÖNCE mevcut durumu kaydet
    if (frame.disposalType === 3) {
      savedCtx.clearRect(0, 0, gifW, gifH);
      savedCtx.drawImage(stateCanvas, 0, 0);
    }

    // Patch'i state canvas üzerine kompozitle
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    patchCanvas.getContext('2d', { willReadFrequently: true })!.putImageData(
      new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
      0,
      0
    );
    stateCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    // Çıktı canvas'ını oluştur (Steam standartları korunarak)
    const outW = options.cropW || options.targetWidth || gifW;
    const outH = options.cropW ? gifH : Math.round(gifH * (outW / gifW));

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = outW;
    finalCanvas.height = outH;
    const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true })!;

    if (options.cropX !== undefined && options.cropW !== undefined) {
      // Classic Mode: 506px genişlik, 100px offset kırpması
      finalCtx.drawImage(stateCanvas, options.cropX, 0, options.cropW, gifH, 0, 0, options.cropW, gifH);
    } else if (options.targetWidth !== undefined) {
      // Featured Mode: 630px genişliğe oransal sığdırma
      finalCtx.drawImage(stateCanvas, 0, 0, gifW, gifH, 0, 0, outW, outH);
    } else {
      finalCtx.drawImage(stateCanvas, 0, 0);
    }

    processedFrames.push({
      canvas: finalCanvas,
      // gifuct-js centisecond (1/100s) verir; gif.js milisaniye ister → *10
      delay: Math.max(MIN_FRAME_DELAY, frame.delay * 10),
    });

    prevFrame = frame;
  }

  // 3. ADIM: gif.js ile yeniden paketle
  const renderGif = (quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 2,
        width: processedFrames[0].canvas.width,
        height: processedFrames[0].canvas.height,
        workerScript: '/gif.worker.js',
        quality,
        dither: false, // En kritik boyut küçültücü ayar
        repeat: 0,
        transparent: null,
      });

      processedFrames.forEach((f) => gif.addFrame(f.canvas, { delay: f.delay, copy: true }));
      gif.on('finished', (blob: Blob) => resolve(blob));
      gif.on('error', (err: Error) => reject(err));
      gif.render();
    });

  // quality=10 ile dene; aşarsa quality=20 fallback
  let blob = await renderGif(10);
  if (blob.size > TARGET_BYTES) {
    console.log(
      `⚠️ Boyut aşıldı (${(blob.size / 1024 / 1024).toFixed(2)} MB), quality=20 ile fallback...`
    );
    blob = await renderGif(20);
  }

  const durationMs = processedFrames.reduce((s, f) => s + f.delay, 0);
  console.log('✅ İşlem bitti. Yeni boyut:', (blob.size / 1024 / 1024).toFixed(2), 'MB');

  return {
    data: blob,
    fps: Math.round(processedFrames.length / (durationMs / 1000)),
    durationMs,
    sizeBytes: blob.size,
  };
}
