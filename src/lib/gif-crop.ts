import { parseGIF, decompressFrames, ParsedGif, ParsedFrame } from 'gifuct-js';
import { GifWriter } from 'omggif';

export interface CropOutput {
  name: string;
  buffer: ArrayBuffer;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function readWidth(buf: ArrayBuffer): number {
  const d = new Uint8Array(buf);
  return d[6] | (d[7] << 8);
}

function buildPaletteMap(palette: [number, number, number][]): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < palette.length; i++) {
    const [r, g, b] = palette[i];
    map.set((r << 16) | (g << 8) | b, i);
  }
  return map;
}

function toFlatPalette(palette: [number, number, number][]): number[] {
  const flat: number[] = [];
  for (const [r, g, b] of palette) flat.push(r, g, b);
  return flat;
}

function extractLoop(gif: ParsedGif): number {
  for (const f of gif.frames) {
    const app = (f as { application?: { id: string; blocks: number[] } }).application;
    if (app?.id?.includes('NETSCAPE') && app.blocks.length >= 3) {
      return app.blocks[1] | (app.blocks[2] << 8);
    }
  }
  return 0; // 0 = sonsuz döngü
}

// ── Frame composition + crop ──────────────────────────────────────────────────

interface CroppedFrame {
  indices: Uint8Array;
  delay: number;        // centiseconds (GIF native unit)
  transparentIndex: number;
}

function composeAndCrop(
  gif: ParsedGif,
  frames: ParsedFrame[],
  cropX: number,
  cropW: number,
): CroppedFrame[] {
  const W = gif.lsd.width;
  const H = gif.lsd.height;
  const palette = gif.gct;
  const paletteMap = buildPaletteMap(palette);
  const bg = palette[gif.lsd.backgroundColorIndex];

  let canvas: Uint8ClampedArray<ArrayBufferLike> = new Uint8ClampedArray(W * H * 4);
  let saved: Uint8ClampedArray<ArrayBufferLike> | null = null;

  if (bg) {
    const [r, g, b] = bg;
    for (let i = 0; i < W * H; i++) {
      canvas[i * 4] = r; canvas[i * 4 + 1] = g;
      canvas[i * 4 + 2] = b; canvas[i * 4 + 3] = 255;
    }
  }

  return frames.map((frame) => {
    const { top, left, width, height } = frame.dims;
    const patch = frame.patch;

    // disposal=3: mevcut canvas'ı kaydet, bu frame sonrası geri yüklenecek
    if (frame.disposalType === 3) saved = new Uint8ClampedArray(canvas);

    // Patch'i canvas'a blit et (transparan pikseller atlanır)
    for (let row = 0; row < height; row++) {
      const dstBase = ((top + row) * W + left) * 4;
      const srcBase = row * width * 4;
      for (let col = 0; col < width; col++) {
        const s = srcBase + col * 4;
        if (patch[s + 3] > 0) {
          canvas[dstBase + col * 4]     = patch[s];
          canvas[dstBase + col * 4 + 1] = patch[s + 1];
          canvas[dstBase + col * 4 + 2] = patch[s + 2];
          canvas[dstBase + col * 4 + 3] = 255;
        }
      }
    }

    // Crop strip'ini canvas'tan al, RGBA → palette index'e çevir
    const ti = frame.transparentIndex;
    const indices = new Uint8Array(cropW * H);
    for (let row = 0; row < H; row++) {
      const rowBase = row * W;
      const dstRowBase = row * cropW;
      for (let col = 0; col < cropW; col++) {
        const s = (rowBase + cropX + col) * 4;
        if (canvas[s + 3] === 0) {
          indices[dstRowBase + col] = ti >= 0 ? ti : 0;
        } else {
          const key = (canvas[s] << 16) | (canvas[s + 1] << 8) | canvas[s + 2];
          indices[dstRowBase + col] = paletteMap.get(key) ?? 0;
        }
      }
    }

    // Disposal uygula
    if (frame.disposalType === 2) {
      // Arka plan rengine sıfırla
      const [r, g, b] = bg ?? [0, 0, 0];
      const a = bg ? 255 : 0;
      for (let row = 0; row < height; row++) {
        const dstBase = ((top + row) * W + left) * 4;
        for (let col = 0; col < width; col++) {
          const d = dstBase + col * 4;
          canvas[d] = r; canvas[d + 1] = g; canvas[d + 2] = b; canvas[d + 3] = a;
        }
      }
    } else if (frame.disposalType === 3 && saved) {
      canvas = saved;
      saved = null;
    }

    return { indices, delay: frame.delay || 2, transparentIndex: ti };
  });
}

// ── GIF encoder ───────────────────────────────────────────────────────────────

function encodeGif(
  frames: CroppedFrame[],
  palette: [number, number, number][],
  width: number,
  height: number,
  loop: number,
): ArrayBuffer {
  const flatPal = toFlatPalette(palette);
  // Worst-case: 1 byte/pixel (indexed, uncompressed) × 2 güvenlik marjı + header
  const buf = new Uint8Array(width * height * frames.length * 2 + 8192);
  const writer = new GifWriter(buf, width, height, { palette: flatPal, loop });

  for (const { indices, delay, transparentIndex } of frames) {
    const opts: { delay: number; transparent?: number } = { delay };
    if (transparentIndex >= 0) opts.transparent = transparentIndex;
    writer.addFrame(0, 0, width, height, indices, opts);
  }

  const byteLen = writer.end();
  // Slice: tam byte sayısını al, shared buffer'dan kopya oluştur
  return buf.buffer.slice(0, byteLen);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function cropGif(
  buffer: ArrayBuffer,
  mode: 'featured' | 'classic',
): Promise<CropOutput[]> {
  const width = readWidth(buffer);

  // Decode bir kez yap — Classic'te iki crop için tekrar parse etme
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true);

  if (!frames.length) throw new Error('GIF frame içermiyor');
  if (!gif.gct?.length) throw new Error('GIF global renk tablosu bulunamadı');

  const loop = extractLoop(gif);
  const H = gif.lsd.height;

  if (mode === 'featured') {
    if (width < 630) throw new Error(`GIF genişliği (${width}px) Featured için yetersiz (min 630px)`);
    const x = Math.floor((width - 630) / 2);
    const composed = composeAndCrop(gif, frames, x, 630);
    return [{
      name: 'featured_main.gif',
      buffer: encodeGif(composed, gif.gct, 630, H, loop),
    }];
  }

  if (width < 606) throw new Error(`GIF genişliği (${width}px) Classic için yetersiz (min 606px)`);
  const mainX = Math.floor((width - 606) / 2);
  const sideX = mainX + 506;

  // Her iki crop için aynı decode sonucunu kullan
  const mainComposed = composeAndCrop(gif, frames, mainX, 506);
  const sideComposed = composeAndCrop(gif, frames, sideX, 100);

  return [
    { name: 'main.gif',  buffer: encodeGif(mainComposed, gif.gct, 506, H, loop) },
    { name: 'side.gif',  buffer: encodeGif(sideComposed, gif.gct, 100, H, loop) },
  ];
}
