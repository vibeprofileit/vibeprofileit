import gifsicle from 'gifsicle-wasm-browser';
import { parseGifInfo } from './gif-parser';
import { cropGif } from './gif-crop';

const LIMIT        = Math.floor(4.95 * 1024 * 1024);
const MAX_FILE_SIZE = 12 * 1024 * 1024;

// ── gifsicle wrapper ──────────────────────────────────────────────────────────

async function gRun(buf: ArrayBuffer, cmd: string): Promise<ArrayBuffer> {
  const out = await gifsicle.run({
    input: [{ file: buf, name: 'input.gif' }],
    command: [cmd],
  });
  if (!out?.length) throw new Error('gifsicle çıktı üretmedi');
  return out[0].arrayBuffer();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findTrimIndex(buffer: ArrayBuffer): number {
  const d = new Uint8Array(buffer);
  let ms = 0, idx = 0;
  for (let i = 0; i < d.length - 7; i++) {
    if (d[i] === 0x21 && d[i + 1] === 0xF9 && d[i + 2] === 0x04) {
      const raw = d[i + 4] | (d[i + 5] << 8);
      ms += (raw === 0 ? 1 : raw) * 10;
      if (ms >= 3000) return idx;
      idx++;
      i += 7;
    }
  }
  return Math.max(0, idx - 1);
}

// ── Single-pass hard optimize ─────────────────────────────────────────────────

async function hardOptimize(buf: ArrayBuffer, outName: string): Promise<ArrayBuffer> {
  const { frameCount, totalDuration } = parseGifInfo(buf);
  const fps = totalDuration > 0 ? frameCount / (totalDuration / 1000) : 0;

  // Palette size: GIF header byte 10, bits 0-2 = size exponent (if GCT flag set)
  const d = new Uint8Array(buf);
  const paletteSize = (d[10] & 0x80) ? 2 ** ((d[10] & 0x07) + 1) : 0;

  // Build command dynamically — only add flags when needed
  let cmd = '--optimize=3 --lossy=70';
  if (paletteSize > 180) cmd += ' --colors 180';

  const needsTrim = totalDuration > 3000;
  const needsFps  = fps > 15;

  if (needsTrim || needsFps) {
    const maxIdx = needsTrim ? findTrimIndex(buf) : frameCount - 1;
    const skip   = needsFps ? Math.max(1, Math.round(fps / 15)) : 1;

    const frames = Array.from(
      { length: Math.ceil((maxIdx + 1) / skip) },
      (_, i) => `"#${Math.min(i * skip, maxIdx)}"`,
    ).join(' ');

    cmd += ` input.gif ${frames} -o /out/${outName}`;
  } else {
    cmd += ` input.gif -o /out/${outName}`;
  }

  const result = await gRun(buf, cmd);

  if (result.byteLength > LIMIT) {
    throw new Error('Cannot compress this GIF under 5MB. Try a shorter GIF.');
  }

  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function runGifPipeline(
  file: File,
  mode: 'classic' | 'featured',
  onProgress?: (p: number) => void,
  onWarning?: () => void,
): Promise<Record<string, Blob>> {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error('File is too big. Maximum 12MB allowed.'));
  }

  try {
    const buffer = await file.arrayBuffer();
    onProgress?.(10);

    const crops = await cropGif(buffer, mode);
    onProgress?.(40);

    const entries = await Promise.all(
      crops.map(async ({ name, buffer: cropBuf }) => {
        // Fast Exit: limit altındaysa optimizasyona sokma
        if (cropBuf.byteLength <= LIMIT) {
          return [name, new Blob([cropBuf], { type: 'image/gif' })] as const;
        }
        const optimized = await hardOptimize(cropBuf, name);
        return [name, new Blob([optimized], { type: 'image/gif' })] as const;
      }),
    );

    onProgress?.(100);
    return Object.fromEntries(entries);
  } catch (err) {
    throw err;
  }
}
