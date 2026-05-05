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
  if (!out?.length) throw new Error('Processing failed. Please try again.');
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

// ── Double-pass hard optimize ─────────────────────────────────────────────────

async function hardOptimize(
  buf: ArrayBuffer,
  outName: string,
  onWarning?: () => void,
): Promise<ArrayBuffer> {
  const { frameCount, totalDuration } = parseGifInfo(buf);
  const fps = totalDuration > 0 ? frameCount / (totalDuration / 1000) : 0;

  const d = new Uint8Array(buf);
  const paletteSize = (d[10] & 0x80) ? 2 ** ((d[10] & 0x07) + 1) : 0;

  const needsTrim = totalDuration > 3000;
  const trimIndex = needsTrim ? findTrimIndex(buf) : frameCount - 1;

  function buildCmd(targetFps: number, maxColors: number, lossy: number): string {
    let cmd = `--optimize=3 --lossy=${lossy}`;
    if (paletteSize > maxColors) cmd += ` --colors ${maxColors}`;

    const needsFps = fps > targetFps;

    if (needsTrim || needsFps) {
      const skip   = needsFps ? Math.max(1, Math.round(fps / targetFps)) : 1;
      const frames = Array.from(
        { length: Math.ceil((trimIndex + 1) / skip) },
        (_, i) => `"#${Math.min(i * skip, trimIndex)}"`,
      ).join(' ');
      cmd += ` input.gif ${frames} -o /out/${outName}`;
    } else {
      cmd += ` input.gif -o /out/${outName}`;
    }
    return cmd;
  }

  // Pass 1: fps=15, colors=180, lossy=70
  const pass1 = await gRun(buf, buildCmd(15, 180, 70));
  if (pass1.byteLength <= LIMIT) return pass1;

  // Pass 2: fps=12, colors=150, lossy=80 — original buf (no cumulative loss)
  onWarning?.();
  const pass2 = await gRun(buf, buildCmd(12, 150, 80));
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

  try {
    const buffer = await file.arrayBuffer();
    onProgress?.(10);

    const crops = await cropGif(buffer, mode);
    onProgress?.(40);

    const entries = await Promise.all(
      crops.map(async ({ name, buffer: cropBuf }) => {
        if (cropBuf.byteLength <= LIMIT) {
          return [name, new Blob([cropBuf], { type: 'image/gif' })] as const;
        }
        const optimized = await hardOptimize(cropBuf, name, onWarning);
        return [name, new Blob([optimized], { type: 'image/gif' })] as const;
      }),
    );

    onProgress?.(100);
    return Object.fromEntries(entries);
  } catch (err) {
    throw err;
  }
}
