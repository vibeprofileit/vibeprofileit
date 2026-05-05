import gifsicle from 'gifsicle-wasm-browser';
import { parseGifInfo } from './gif-parser';
import { cropGif } from './gif-crop';

const LIMIT         = Math.floor(4.95 * 1024 * 1024);
const MAX_FILE_SIZE = 12 * 1024 * 1024;

// ── gifsicle wrapper ──────────────────────────────────────────────────────────

async function gRun(buf: ArrayBuffer, cmd: string): Promise<ArrayBuffer> {
  const out = await gifsicle.run({
    input: [{ file: buf, name: 'input.gif' }],
    command: [cmd],
  });
  if (!out?.length) throw new Error(`Processing failed. Command: [${cmd}]`);
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

// GCE delay byte'larını doğrudan buffer'a yaz (gifsicle --delay çalışmıyor)
function patchDelays(buf: ArrayBuffer, delayCs: number): ArrayBuffer {
  const arr = new Uint8Array(buf.slice(0));
  const lo = delayCs & 0xFF;
  const hi = (delayCs >> 8) & 0xFF;
  for (let i = 0; i < arr.length - 7; i++) {
    if (arr[i] === 0x21 && arr[i + 1] === 0xF9 && arr[i + 2] === 0x04) {
      arr[i + 4] = lo;
      arr[i + 5] = hi;
      i += 7;
    }
  }
  return arr.buffer;
}

// ── Double-pass hard optimize ─────────────────────────────────────────────────

async function hardOptimize(
  buf: ArrayBuffer,
  outName: string,
  onWarning?: () => void,
  onProgress?: (p: number) => void,
): Promise<ArrayBuffer> {
  const { frameCount, totalDuration } = parseGifInfo(buf);
  const fps = totalDuration > 0 ? frameCount / (totalDuration / 1000) : 0;

  const d = new Uint8Array(buf);
  const paletteSize = (d[10] & 0x80) ? 2 ** ((d[10] & 0x07) + 1) : 0;

  const needsTrim = totalDuration > 3000;
  const trimIndex = needsTrim ? findTrimIndex(buf) : frameCount - 1;

  function buildCmd(targetFps: number, maxColors: number, lossy: number): { cmd: string; skip: number } {
    let cmd = `--optimize=3 --lossy=${lossy}`;
    if (paletteSize === 0 || paletteSize > maxColors) cmd += ` --colors ${maxColors}`;

    const needsFps = fps > targetFps;
    const skip     = needsFps ? Math.max(1, Math.round(fps / targetFps)) : 1;

    if (needsTrim || needsFps) {
      const frames = Array.from(
        { length: Math.ceil((trimIndex + 1) / skip) },
        (_, i) => `#${Math.min(i * skip, trimIndex)}`,
      ).join(' ');
      cmd += ` input.gif ${frames} -o /out/${outName}`;
    } else {
      cmd += ` input.gif -o /out/${outName}`;
    }
    return { cmd, skip };
  }

  // Pass 1: fps=15, colors=180, lossy=70
  onProgress?.(50);
  const { cmd: cmd1, skip: skip1 } = buildCmd(15, 180, 70);
  let pass1 = await gRun(buf, cmd1);
  if (skip1 > 1) {
    const newDelayCs = Math.max(1, Math.round(totalDuration / frameCount * skip1 / 10));
    pass1 = patchDelays(pass1, newDelayCs);
  }
  if (pass1.byteLength <= LIMIT) return pass1;

  // Pass 2: fps=12, colors=150, lossy=80 — original buf (no cumulative loss)
  onWarning?.();
  onProgress?.(80);
  const { cmd: cmd2, skip: skip2 } = buildCmd(12, 150, 80);
  let pass2 = await gRun(buf, cmd2);
  if (skip2 > 1) {
    const newDelayCs = Math.max(1, Math.round(totalDuration / frameCount * skip2 / 10));
    pass2 = patchDelays(pass2, newDelayCs);
  }
  onProgress?.(95);
  if (pass2.byteLength <= LIMIT) return pass2;

  throw new Error('GIF is too big. Please try a shorter GIF.');
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function runGifPipeline(
  file: File,
  mode: 'classic' | 'featured',
  onProgress?: (p: number) => void,
  onWarning?: () => void,
): Promise<Record<string, Blob>> {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error('File is too big. Max size is 12MB.'));
  }

  const buffer = await file.arrayBuffer();
  onProgress?.(10);

  const crops = await cropGif(buffer, mode);
  onProgress?.(40);

  const entries = await Promise.all(
    crops.map(async ({ name, buffer: cropBuf }) => {
      if (cropBuf.byteLength <= LIMIT) {
        return [name, new Blob([cropBuf], { type: 'image/gif' })] as const;
      }
      const optimized = await hardOptimize(cropBuf, name, onWarning, onProgress);
      return [name, new Blob([optimized], { type: 'image/gif' })] as const;
    }),
  );

  onProgress?.(100);
  return Object.fromEntries(entries);
}
