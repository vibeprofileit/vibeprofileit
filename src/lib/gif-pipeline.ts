import gifsicle from 'gifsicle-wasm-browser';
import { parseGifInfo } from './gif-parser';
import { cropGif } from './gif-crop';

const LIMIT = Math.floor(4.95 * 1024 * 1024);
const TIMEOUT_MS = 45_000;

// ── gifsicle wrapper ─────────────────────────────────────────────────────────

async function gRun(buf: ArrayBuffer, cmd: string): Promise<ArrayBuffer> {
  const out = await gifsicle.run({
    input: [{ file: buf, name: 'input.gif' }],
    command: [cmd],
  });
  if (!out?.length) throw new Error('gifsicle çıktı üretmedi');
  return out[0].arrayBuffer();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function buildFpsCmd(frameCount: number, skip: number, outName: string): string {
  const frames = Array.from(
    { length: Math.ceil(frameCount / skip) },
    (_, i) => `"#${i * skip}"`
  ).join(' ');
  return `input.gif ${frames} -o /out/${outName}`;
}

// ── Core optimization pipeline ───────────────────────────────────────────────

async function optimize(
  buf: ArrayBuffer,
  outName: string,
  startTime: number,
  mode: 'featured' | 'classic',
  onProgress?: (v: number) => void,
): Promise<{ buffer: ArrayBuffer; warning?: string }> {
  if (buf.byteLength <= LIMIT) return { buffer: buf };

  let cur = buf;
  let best: ArrayBuffer | null = null;
  const timedOut = () => Date.now() - startTime > TIMEOUT_MS;

  function tryBest(b: ArrayBuffer): boolean {
    if (b.byteLength <= LIMIT) {
      if (!best || b.byteLength > best.byteLength) best = b;
      return true;
    }
    return false;
  }

  // ── Trim (progress: 20) ─────────────────────────────────────────────────
  if (!timedOut()) {
    const { totalDuration } = parseGifInfo(cur);
    if (totalDuration > 3000) {
      const idx = findTrimIndex(cur);
      const trimmed = await gRun(cur, `input.gif "#0-#${idx}" -o /out/${outName}`);
      cur = trimmed;
      if (tryBest(cur)) { onProgress?.(20); return { buffer: best! }; }
    }
  }
  onProgress?.(20);

  // ── FPS 15 → 13 (progress: 40) ──────────────────────────────────────────
  for (const tFps of [15, 13] as const) {
    if (timedOut()) break;
    const { frameCount, totalDuration } = parseGifInfo(cur);
    const srcFps = totalDuration > 0 ? frameCount / (totalDuration / 1000) : 10;
    if (srcFps <= tFps) continue;
    const skip = Math.max(2, Math.round(srcFps / tFps));
    if (srcFps / skip < 13) continue;
    const result = await gRun(cur, buildFpsCmd(frameCount, skip, outName));
    cur = result;
    if (tryBest(cur)) break;
  }
  onProgress?.(40);

  // ── Color reduction (progress: 60) ──────────────────────────────────────
  if (!timedOut() && cur.byteLength > LIMIT) {
    const d = new Uint8Array(cur);
    const paletteSize = (d[10] & 0x80) ? 2 ** ((d[10] & 0x07) + 1) : 256;
    if (paletteSize > 160) {
      const colored = await gRun(cur, `--colors 160 input.gif -o /out/${outName}`);
      cur = colored;
      tryBest(cur);
    }
  }
  onProgress?.(60);

  // ── Lossy (progress: 100) ───────────────────────────────────────────────
  const lossySteps = mode === 'featured' ? [40, 60, 70, 80] : [40, 60, 70];
  if (!timedOut() && cur.byteLength > LIMIT) {
    for (const lossy of lossySteps) {
      if (timedOut()) break;
      tryBest(await gRun(cur, `--lossy=${lossy} input.gif -o /out/${outName}`));
    }
  }
  onProgress?.(100);

  if (best) {
    return {
      buffer: best,
      warning: timedOut() ? '45 saniye aşıldı; en iyi sonuç verildi.' : undefined,
    };
  }
  throw new Error(`${outName}: 4.95 MB altına indirilemedi.`);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function runGifPipeline(
  file: File,
  mode: 'classic' | 'featured',
  onProgress?: (p: number) => void,
  onWarning?: () => void,
): Promise<Record<string, Blob>> {
  const buffer = await file.arrayBuffer();
  const inputSize = file.size;
  const startTime = Date.now();

  onProgress?.(10);

  // ── Küçük GIF: sadece crop ───────────────────────────────────────────────
  if (inputSize <= LIMIT) {
    const crops = await cropGif(buffer, mode);
    const result: Record<string, Blob> = {};
    for (const { name, buffer: b } of crops) {
      if (b.byteLength > LIMIT) {
        throw new Error(`${name}: Crop sonrası Steam limiti aşıldı.`);
      }
      result[name] = new Blob([b], { type: 'image/gif' });
    }
    onProgress?.(100);
    return result;
  }

  // ── Büyük GIF: Featured ──────────────────────────────────────────────────
  if (mode === 'featured') {
    const [crop] = await cropGif(buffer, 'featured');
    const { buffer: out, warning } = await optimize(
      crop.buffer, crop.name, startTime, 'featured',
      onProgress,
    );
    if (warning) onWarning?.();
    return { [crop.name]: new Blob([out], { type: 'image/gif' }) };
  }

  // ── Büyük GIF: Classic — main ve side ayrı pipeline ─────────────────────
  const crops = await cropGif(buffer, 'classic');
  const mainCrop = crops.find(c => c.name === 'main.gif')!;
  const sideCrop = crops.find(c => c.name === 'side.gif')!;

  // Classic optimize — başarısız olursa featured fallback'e düşer
  let classicOk: { main: ArrayBuffer; side: ArrayBuffer; warn: boolean } | null = null;

  try {
    const [mainRes, sideRes] = await Promise.all([
      optimize(mainCrop.buffer, 'main.gif', startTime, 'classic'),
      optimize(sideCrop.buffer, 'side.gif', startTime, 'classic'),
    ]);
    classicOk = {
      main: mainRes.buffer,
      side: sideRes.buffer,
      warn: !!(mainRes.warning || sideRes.warning),
    };
  } catch { /* classic başarısız — featured fallback denenecek */ }

  if (classicOk) {
    onProgress?.(100);
    if (classicOk.warn) onWarning?.();
    return {
      'main.gif': new Blob([classicOk.main], { type: 'image/gif' }),
      'side.gif': new Blob([classicOk.side], { type: 'image/gif' }),
    };
  }

  // ── Featured fallback — pipeline tek kez çalışır, sonuç cache'lenir ────
  let featuredBuf: ArrayBuffer | null = null;

  const [featCrop] = await cropGif(buffer, 'featured');
  const { buffer: featOut, warning: featWarn } = await optimize(
    featCrop.buffer, 'featured_main.gif', startTime, 'featured',
  );
  if (featWarn) onWarning?.();
  featuredBuf = featOut;

  // Featured output (630px) üzerinden classic koordinatları: mainX=12, sideX=518
  const fH = (new Uint8Array(featuredBuf))[8] | ((new Uint8Array(featuredBuf))[9] << 8);
  const [mainFb, sideFb] = await Promise.all([
    gRun(featuredBuf, `--crop 12,0+506x${fH} input.gif -o /out/main.gif`),
    gRun(featuredBuf, `--crop 518,0+100x${fH} input.gif -o /out/side.gif`),
  ]);

  if (mainFb.byteLength > LIMIT || sideFb.byteLength > LIMIT) {
    throw new Error('Classic fallback sonrası Steam limiti aşıldı.');
  }

  onProgress?.(100);
  return {
    'main.gif': new Blob([mainFb], { type: 'image/gif' }),
    'side.gif': new Blob([sideFb], { type: 'image/gif' }),
  };
}
