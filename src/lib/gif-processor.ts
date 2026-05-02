'use client';

import { parseGIF, decompressFrames } from 'gifuct-js';
import { GifWriter } from 'omggif';

export async function processGif(
  file: File,
  options: { cropX?: number; cropW?: number; targetWidth?: number }
): Promise<{ data: Blob; fps: number; durationMs: number; sizeBytes: number }> {
  const buffer = await file.arrayBuffer();
  const parsed = parseGIF(buffer);
  // buildImagePatches=false: sadece pixel indekslerini al, RGBA oluşturma
  const frames = decompressFrames(parsed, false);

  const gifW = parsed.lsd.width;
  const gifH = parsed.lsd.height;

  const cropX = options.cropX ?? 0;
  const cropW = options.cropW ?? options.targetWidth ?? gifW;
  const newWidth = Math.min(cropW, gifW - cropX);

  // Crop işlemi boyutu küçülttüğünden input boyutu yeterli üst sınır
  const outBuf = new Uint8Array(buffer.byteLength + 1024);
  const writer = new GifWriter(outBuf, newWidth, gifH, { loop: 0 });

  let totalDelayMs = 0;

  for (const frame of frames) {
    const { dims, pixels } = frame;
    const colorTable = frame.colorTable as [number, number, number][];
    // gifuct-js kaynağı: delay = gce.delay * 10 → zaten milisaniye
    const delayMs = (frame.delay as number | undefined) ?? 100;
    const disposal = (frame.disposalType as number | undefined) ?? 0;

    const frameX1 = dims.left;
    const frameX2 = dims.left + dims.width;
    const visX1 = Math.max(frameX1, cropX);
    const visX2 = Math.min(frameX2, cropX + newWidth);
    const visWidth = visX2 - visX1;

    // omggif delay birimi: centisaniye (1/100 s)
    const delayCs = Math.max(2, Math.round(delayMs / 10));
    totalDelayMs += delayCs * 10;

    const palette = toPacked(colorTable);

    if (visWidth <= 0) {
      // Frame tamamen krop dışında → zamanlamayı korumak için 1×1 placeholder
      writer.addFrame(0, 0, 1, 1, [0], { palette, delay: delayCs, disposal: 0 });
      continue;
    }

    const newLeft = visX1 - cropX;
    const startCol = visX1 - frameX1;
    const croppedPixels = new Uint8Array(visWidth * dims.height);

    for (let row = 0; row < dims.height; row++) {
      const srcBase = row * dims.width + startCol;
      const dstBase = row * visWidth;
      for (let col = 0; col < visWidth; col++) {
        croppedPixels[dstBase + col] = (pixels as number[])[srcBase + col];
      }
    }

    const frameOpts: {
      palette: number[];
      delay: number;
      disposal: number;
      transparent?: number;
    } = { palette, delay: delayCs, disposal };

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
 * gifuct-js colorTable → omggif packed palette
 * Her renk: [r, g, b] → 0xRRGGBB
 * Uzunluk 2'nin kuvveti olmalı (GIF spec)
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
