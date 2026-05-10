import gifsicle from 'gifsicle-wasm-browser';
import { parseGifInfo, extractGifDelays } from './gif-parser';
import { cropGif } from './gif-crop';

const LIMIT         = Math.floor(4.95 * 1024 * 1024);
const MAX_FILE_SIZE = 15 * 1024 * 1024;

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
  const delays = extractGifDelays(buffer);
  let ms = 0;
  for (let i = 0; i < delays.length; i++) {
    ms += delays[i] * 10;
    if (ms >= 3000) return i;
  }
  return Math.max(0, delays.length - 1);
}

// GCE delay byte'larını doğrudan buffer'a yaz (gifsicle --delay çalışmıyor)
function patchDelays(buf: ArrayBuffer, delayCs: number): ArrayBuffer {
  const arr = new Uint8Array(buf.slice(0));
  const lo = delayCs & 0xFF;
  const hi = (delayCs >> 8) & 0xFF;

  const gctFlag = (arr[10] & 0x80) !== 0;
  const gctSize = gctFlag ? 3 * (2 ** ((arr[10] & 0x07) + 1)) : 0;
  let i = 13 + gctSize;

  while (i < arr.length) {
    const b = arr[i];
    if (b === 0x3B) break;
    if (b === 0x21) {
      const label = arr[i + 1];
      i += 2;
      if (label === 0xF9) {
        const sz = arr[i++];
        arr[i + 1] = lo;
        arr[i + 2] = hi;
        i += sz;
        i++;
      } else {
        let sz = arr[i++];
        while (sz > 0 && i < arr.length) { i += sz; sz = arr[i++]; }
      }
      continue;
    }
    if (b === 0x2C) {
      i++;
      const lctFlag = (arr[i + 8] & 0x80) !== 0;
      const lctSize = lctFlag ? 3 * (2 ** ((arr[i + 8] & 0x07) + 1)) : 0;
      i += 9 + lctSize;
      i++;
      let sz = arr[i++];
      while (sz > 0 && i < arr.length) { i += sz; sz = arr[i++]; }
      continue;
    }
    break;
  }

  return arr.buffer;
}

// ── Double-pass hard optimize ─────────────────────────────────────────────────

async function hardOptimize(
  buf: ArrayBuffer,
  outName: string,
  mode: 'classic' | 'featured',
  onWarning?: () => void,
  onProgress?: (p: number) => void,
): Promise<ArrayBuffer> {
  const { frameCount, totalDuration } = parseGifInfo(buf);
  const fps = totalDuration > 0 ? frameCount / (totalDuration / 1000) : 0;

  const d = new Uint8Array(buf);
  const paletteSize = (d[10] & 0x80) ? 2 ** ((d[10] & 0x07) + 1) : 0;

  const needsTrim = totalDuration > 3000;
  const trimIndex = needsTrim ? findTrimIndex(buf) : frameCount - 1;

  console.log('[hardOptimize-Entry]', {
    outName,
    frameCount,
    totalDuration,
    fps: +fps.toFixed(2),
    needsTrim,
    trimIndex,
    inputBytes: buf.byteLength,
    calculatedDelay: Math.round(1000 / (fps || 1)),
  });

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

    const newDelayCs = skip > 1 ? Math.max(1, Math.round(totalDuration / frameCount * skip / 10)) : null;
    console.log('[hardOptimize-buildCmd]', { targetFps, lossy, skip, newDelayCs, cmd });

    return { cmd, skip };
  }

  const lossySteps = mode === 'featured' ? [50, 70, 90] : [50, 70, 80];
  const fpsSteps   = [15, 13, 12];
  const colorSteps = [180, 160, 150];

  for (let i = 0; i < lossySteps.length; i++) {
    if (i === 1) onWarning?.();
    onProgress?.(50 + i * 20);
    const { cmd, skip } = buildCmd(fpsSteps[i], colorSteps[i], lossySteps[i]);
    let result = await gRun(buf, cmd);
    console.log(`[hardOptimize-pass${i + 1}]`, { mode, lossy: lossySteps[i], skip, outputBytes: result.byteLength, underLimit: result.byteLength <= LIMIT });
    if (skip > 1) {
      const newDelayCs = Math.max(1, Math.round(totalDuration / frameCount * skip / 10));
      result = patchDelays(result, newDelayCs);
    }
    if (result.byteLength <= LIMIT) return result;
  }

  throw new Error("This GIF is too high-quality for Steam's 5 MB limit — try a shorter clip or a lower-resolution source.");
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
        console.log('[runGifPipeline-fastPath]', { name, bytes: cropBuf.byteLength });
        return [name, new Blob([cropBuf], { type: 'image/gif' })] as const;
      }
      const optimized = await hardOptimize(cropBuf, name, mode, onWarning, onProgress);
      return [name, new Blob([optimized], { type: 'image/gif' })] as const;
    }),
  );

  onProgress?.(100);
  return Object.fromEntries(entries);
}
