'use client';

import { parseGIF, decompressFrames } from 'gifuct-js';
import { GifWriter } from 'omggif';

export async function processGif(
  file: File,
  options: { cropX?: number; cropW?: number; targetWidth?: number }
): Promise<{ data: Blob; fps: number; durationMs: number; sizeBytes: number }> {
  const buffer = await file.arrayBuffer();
  const parsed = parseGIF(buffer);
  const frames = decompressFrames(parsed, false);

  const gifW = parsed.lsd.width;
  const gifH = parsed.lsd.height;

  const cropX = options.cropX ?? 0;
  const cropW = options.cropW ?? options.targetWidth ?? gifW;
  const newWidth = Math.min(cropW, gifW - cropX);

  // Orijinal global renk tablosunu output'a yaz.
  // disposal=2 (arka plana dön) global CT'den background rengini okur.
  // Global CT olmadan renderer siyah gösterir → ghost framing'in ana nedeni.
  const rawGct = (parsed.gct ?? []) as [number, number, number][];
  const globalPalette = rawGct.length > 0 ? toPacked(rawGct) : undefined;
  const bgColorIdx = parsed.lsd.backgroundColorIndex ?? 0;

  const outBuf = new Uint8Array(buffer.byteLength + 1024);

  const writerOpts: { loop: number; palette?: number[]; background?: number } = { loop: 0 };
  if (globalPalette) {
    writerOpts.palette = globalPalette;
    // omggif background=0 geçilince hata fırlatır (spec gereği 0 geçersiz)
    if (bgColorIdx > 0 && bgColorIdx < globalPalette.length) {
      writerOpts.background = bgColorIdx;
    }
  }

  const writer = new GifWriter(outBuf, newWidth, gifH, writerOpts);

  // Raw frame listesi: local CT tespiti için (gifuct-js resolved colorTable döndürür,
  // hangi frame'in local CT'si olduğunu söylemez)
  const rawImageFrames = (parsed.frames as any[]).filter((f) => f.image);

  let totalDelayMs = 0;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const rawFrame = rawImageFrames[i];
    const hasLocalCT: boolean = rawFrame?.image?.descriptor?.lct?.exists === true;

    const { dims, pixels } = frame;
    const colorTable = frame.colorTable as [number, number, number][];
    // gifuct-js kaynağı: delay = gce.delay * 10 → ms; yoksa 100ms default
    const delayMs = (frame.delay as number | undefined) ?? 100;
    const disposal = (frame.disposalType as number | undefined) ?? 0;

    const frameX1 = dims.left;
    const frameX2 = dims.left + dims.width;
    const visX1 = Math.max(frameX1, cropX);
    const visX2 = Math.min(frameX2, cropX + newWidth);
    const visWidth = visX2 - visX1;

    // omggif delay birimi centisaniye (1/100 s)
    const delayCs = Math.max(2, Math.round(delayMs / 10));
    totalDelayMs += delayCs * 10;

    // Frame'in orijinalde local CT'si varsa local olarak yaz,
    // yoksa global CT otomatik kullanılır (omggif opts.palette eksikse global'e düşer)
    const localPalette = hasLocalCT ? toPacked(colorTable) : undefined;

    if (visWidth <= 0) {
      // Frame tamamen crop dışında.
      // Önemli: disposal değerini de yaz ki GIF state makinesi bozulmasın.
      // disposal=2 (clear to bg): global CT sayesinde artık doğru renk.
      // disposal=3 (restore to previous): 1×1 frame üzerinde uygulanır, state korunur.
      const phPalette = localPalette ?? globalPalette ?? toPacked([[0, 0, 0], [0, 0, 0]]);
      writer.addFrame(0, 0, 1, 1, [0], {
        palette: phPalette,
        delay: delayCs,
        disposal,   // orijinal disposal'ı koru, disposal=0 olarak ezme
      });
      continue;
    }

    const newLeft = visX1 - cropX;
    const startCol = visX1 - frameX1;
    const croppedPixels = new Uint8Array(visWidth * dims.height);

    // Sadece görünür sütunları kopyala (pixel veri, palet, delay'e dokunma)
    for (let row = 0; row < dims.height; row++) {
      const srcBase = row * dims.width + startCol;
      const dstBase = row * visWidth;
      for (let col = 0; col < visWidth; col++) {
        croppedPixels[dstBase + col] = (pixels as number[])[srcBase + col];
      }
    }

    const frameOpts: {
      palette?: number[];
      delay: number;
      disposal: number;
      transparent?: number;
    } = { delay: delayCs, disposal };

    if (localPalette) frameOpts.palette = localPalette;

    // gifuct-js transparentIndex'i sadece GCE transparentColorGiven=true ise ekler
    const transparentIndex = (frame as { transparentIndex?: number }).transparentIndex;
    if (transparentIndex !== undefined) {
      frameOpts.transparent = transparentIndex;
    }

    writer.addFrame(newLeft, dims.top, visWidth, dims.height, croppedPixels, frameOpts);
  }

  const outputBytes = outBuf.subarray(0, writer.end());
  const blob = new Blob([outputBytes], { type: 'image/gif' });

  return {
    data: blob,
    fps: frames.length > 0 ? Math.round(frames.length / (totalDelayMs / 1000)) : 0,
    durationMs: totalDelayMs,
    sizeBytes: blob.size,
  };
}

/**
 * gifuct-js colorTable [[r,g,b],...] → omggif packed palette [0xRRGGBB,...]
 * Uzunluk GIF spec gereği 2'nin kuvveti olmak zorunda
 */
function toPacked(colorTable: [number, number, number][]): number[] {
  let pow2 = 2;
  while (pow2 < colorTable.length) pow2 <<= 1;
  const out = new Array<number>(pow2).fill(0);
  for (let i = 0; i < colorTable.length; i++) {
    const [r, g, b] = colorTable[i];
    out[i] = (r << 16) | (g << 8) | b;
  }
  return out;
}
