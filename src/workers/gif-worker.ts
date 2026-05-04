import gifsicle from 'gifsicle-wasm-browser';
import { parseGifInfo } from '../lib/gif-parser';
import { cropGif } from '../lib/gif-crop';

const LIMIT = Math.floor(4.95 * 1024 * 1024);
const TIMEOUT_MS = 45_000;

// ── Types ────────────────────────────────────────────────────────────────────

type WorkerIn = {
  type: 'process';
  mode: 'featured' | 'classic';
  buffer: ArrayBuffer;
  inputSize: number;
};

type WorkerOut =
  | { type: 'result';  files: Record<string, ArrayBuffer> }
  | { type: 'warning'; msg: string; files: Record<string, ArrayBuffer> }
  | { type: 'error';   msg: string }
  | { type: 'progress'; value: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = self as any;

function send(msg: WorkerOut, transfer: Transferable[] = []): void {
  ctx.postMessage(msg, transfer);
}

// ── gifsicle wrapper ─────────────────────────────────────────────────────────

async function gRun(buf: ArrayBuffer, cmd: string): Promise<ArrayBuffer> {
  const out = await gifsicle.run({
    input: [{ file: buf, name: 'input.gif' }],
    command: [cmd],
  });
  if (!out?.length) throw new Error('gifsicle çıktı üretmedi');
  return out[0].arrayBuffer();
}

// ── Trim helpers ─────────────────────────────────────────────────────────────

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

// ── FPS helper ───────────────────────────────────────────────────────────────

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
  onProgress?: (v: number) => void,
): Promise<{ buffer: ArrayBuffer; warning?: string }> {
  if (buf.byteLength <= LIMIT) return { buffer: buf };

  let cur = buf;
  let best: ArrayBuffer | null = null;
  const timedOut = () => Date.now() - startTime > TIMEOUT_MS;

  // 4.95MB altındakileri karşılaştır; en büyük (en yakın) kazanır
  function tryBest(b: ArrayBuffer): boolean {
    if (b.byteLength <= LIMIT) {
      if (!best || b.byteLength > best.byteLength) best = b;
      return true;
    }
    return false;
  }

  // ── Trim (progress: 20) ──────────────────────────────────────────────────
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
    if (srcFps / skip < 13) continue; // 13 FPS altına inme
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

  // ── Lossy 40 → 60 → 70: tümünü dene, LIMIT'e en yakını seç (progress: 100) ─
  if (!timedOut() && cur.byteLength > LIMIT) {
    for (const lossy of [40, 60, 70]) {
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

// ── Main message handler ─────────────────────────────────────────────────────

ctx.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const { type, mode, buffer, inputSize } = e.data;
  if (type !== 'process') return;

  const startTime = Date.now();

  try {
    send({ type: 'progress', value: 10 });

    // ── Küçük GIF: sadece crop ─────────────────────────────────────────────
    if (inputSize <= LIMIT) {
      const crops = await cropGif(buffer, mode);
      const files: Record<string, ArrayBuffer> = {};
      for (const { name, buffer: b } of crops) {
        if (b.byteLength > LIMIT) {
          send({ type: 'error', msg: `${name}: Crop sonrası Steam limiti aşıldı.` });
          return;
        }
        files[name] = b;
      }
      send({ type: 'progress', value: 100 });
      send({ type: 'result', files }, Object.values(files));
      return;
    }

    // ── Büyük GIF: Featured ────────────────────────────────────────────────
    if (mode === 'featured') {
      const [crop] = await cropGif(buffer, 'featured');
      const { buffer: result, warning } = await optimize(
        crop.buffer, crop.name, startTime,
        (v) => send({ type: 'progress', value: v }),
      );
      const files = { [crop.name]: result };
      if (warning) {
        send({ type: 'warning', msg: warning, files }, [result]);
      } else {
        send({ type: 'result', files }, [result]);
      }
      return;
    }

    // ── Büyük GIF: Classic — main ve side ayrı pipeline, parallel ─────────
    const crops = await cropGif(buffer, 'classic');
    const mainCrop = crops.find(c => c.name === 'main.gif')!;
    const sideCrop = crops.find(c => c.name === 'side.gif')!;

    const [mainRes, sideRes] = await Promise.all([
      optimize(mainCrop.buffer, 'main.gif', startTime),
      optimize(sideCrop.buffer, 'side.gif', startTime),
    ]);

    send({ type: 'progress', value: 100 });

    const warnings = [mainRes.warning, sideRes.warning].filter(Boolean);
    const files = { 'main.gif': mainRes.buffer, 'side.gif': sideRes.buffer };
    const transferables: Transferable[] = [mainRes.buffer, sideRes.buffer];

    if (warnings.length > 0) {
      send({ type: 'warning', msg: warnings.join(' '), files }, transferables);
    } else {
      send({ type: 'result', files }, transferables);
    }

  } catch (err) {
    send({ type: 'error', msg: err instanceof Error ? err.message : String(err) });
  }
};
