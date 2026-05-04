/* eslint-disable */
'use strict';

self.document = self.document || { currentScript: null };
self.window   = self.window   || self;
self.exports  = self.exports  || {};
self.module   = self.module   || { exports: self.exports };
self.require  = self.require  || function() { return {}; };

importScripts('/ffmpeg/ffmpeg.js', '/ffmpeg/ffmpeg-util.js');

const { FFmpeg } = FFmpegWASM;

const CORE_URL = '/ffmpeg/ffmpeg-core.js';
const WASM_URL = '/ffmpeg/ffmpeg-core.wasm';

const STEAM_SAFE  = Math.floor(4.95 * 1024 * 1024); // 4.95 MB
const TIMEOUT_MS  = 45_000;

let ffmpeg     = null;
let recentLogs = [];

// ─── init ────────────────────────────────────────────────────────────────────
async function initFFmpeg() {
  ffmpeg = new FFmpeg();
  ffmpeg.on('log', ({ message }) => {
    recentLogs.push(message);
    self.postMessage({ type: 'log', message });
  });
  ffmpeg.on('progress', ({ progress }) => {
    self.postMessage({ type: 'progress', progress });
  });
  await ffmpeg.load({ coreURL: CORE_URL, wasmURL: WASM_URL });
  self.postMessage({ type: 'ready' });
}

// ─── filter builder ──────────────────────────────────────────────────────────
// scaleW : target width (always applied)
// cropW  : crop width  (null = no crop, featured mode)
// cropX  : crop x offset
// fps    : null = keep original
// colors : 160–256 palette size
// lossy  : 0–70 FFmpeg paletteuse lossy
function buildFilter(scaleW, cropW, cropX, fps, colors, lossy) {
  const parts = [];
  if (fps !== null) parts.push('fps=' + fps);
  parts.push('scale=' + scaleW + ':-1:flags=lanczos');
  if (cropW !== null) parts.push('crop=' + cropW + ':ih:' + cropX + ':0');
  const chain = parts.join(',');
  return (
    chain +
    ',split[s0][s1]' +
    ';[s0]palettegen=max_colors=' + colors + ':stats_mode=diff[p]' +
    ';[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle:lossy=' + lossy
  );
}

// ─── log parsers ─────────────────────────────────────────────────────────────
function parseDuration(logs) {
  for (const line of logs) {
    const m = line.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  }
  return 0;
}

function parseFps(logs) {
  for (const line of logs) {
    const m = line.match(/(\d+(?:\.\d+)?)\s*fps/i);
    if (m) {
      const v = parseFloat(m[1]);
      if (v > 0 && v <= 60) return v;
    }
  }
  return 24;
}

// ─── single FFmpeg pass ──────────────────────────────────────────────────────
async function execCrop({ inName, outName, scaleW, cropW, cropX, fps, colors, lossy, trim }) {
  recentLogs = [];
  const filter = buildFilter(scaleW, cropW, cropX, fps, colors, lossy);
  const args   = ['-i', inName];
  if (trim) args.push('-t', '3');
  args.push('-vf', filter, outName);

  try {
    await ffmpeg.exec(args);
  } catch {
    throw new Error('FFmpeg exec failed: ' + recentLogs.slice(-2).join(' | '));
  }

  const data = await ffmpeg.readFile(outName);
  try { await ffmpeg.deleteFile(outName); } catch { /* ok */ }
  return data; // Uint8Array
}

// ─── per-crop-job processor ──────────────────────────────────────────────────
async function processJob(inName, job, startTime) {
  const { scaleW, cropW, cropX, outName } = job;

  // ── Step 1: Crop, max quality, no trim ─────────────────────────────────────
  let data = await execCrop({ inName, outName, scaleW, cropW, cropX,
    fps: null, colors: 256, lossy: 0, trim: false });

  // Metadata extracted from first-pass logs (duration, fps)
  const duration = parseDuration(recentLogs);
  const srcFps   = parseFps(recentLogs);

  // ── Bypass check ────────────────────────────────────────────────────────────
  if (data.byteLength <= STEAM_SAFE) return { outName, data };

  // ── Step 2: Trim (only if > 3 s) ───────────────────────────────────────────
  const withTrim = duration > 3;
  if (withTrim) {
    data = await execCrop({ inName, outName, scaleW, cropW, cropX,
      fps: null, colors: 256, lossy: 0, trim: true });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  // ── Step 3a: Lossy escalation (10 → 70), fps unchanged, 256 colors ─────────
  for (let lossy = 10; lossy <= 70; lossy += 10) {
    if (Date.now() - startTime > TIMEOUT_MS) throw new Error('İşlem zaman aşımına uğradı (45s)');
    data = await execCrop({ inName, outName, scaleW, cropW, cropX,
      fps: null, colors: 256, lossy, trim: withTrim });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  // ── Step 3b: FPS reduction (srcFps → 13), lossy=70, 256 colors ─────────────
  for (let fps = Math.floor(srcFps) - 2; fps >= 13; fps -= 2) {
    if (Date.now() - startTime > TIMEOUT_MS) throw new Error('İşlem zaman aşımına uğradı (45s)');
    data = await execCrop({ inName, outName, scaleW, cropW, cropX,
      fps, colors: 256, lossy: 70, trim: withTrim });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  // ── Step 3c: Color reduction (240 → 160), lossy=70, fps=13 ─────────────────
  for (let colors = 240; colors >= 160; colors -= 16) {
    if (Date.now() - startTime > TIMEOUT_MS) throw new Error('İşlem zaman aşımına uğradı (45s)');
    data = await execCrop({ inName, outName, scaleW, cropW, cropX,
      fps: 13, colors, lossy: 70, trim: withTrim });
    if (data.byteLength <= STEAM_SAFE) return { outName, data };
  }

  throw new Error('Kalite standartları karşılanamadı: dosya 4.95 MB altına indirilemiyor.');
}

// ─── main processGif ─────────────────────────────────────────────────────────
async function processGif(buffer, mode) {
  const inName = 'input.gif';
  await ffmpeg.writeFile(inName, new Uint8Array(buffer));

  const jobs = mode === 'featured'
    ? [{ scaleW: 630, cropW: null, cropX: null, outName: 'featured_main.gif' }]
    : [
        { scaleW: 612, cropW: 506, cropX: 0,   outName: 'main.gif'  },
        { scaleW: 612, cropW: 100, cropX: 512,  outName: 'side.gif'  },
      ];

  const startTime = Date.now();
  const transferResults = {};
  const transferList    = [];

  for (const job of jobs) {
    const { outName, data } = await processJob(inName, job, startTime);
    // data is Uint8Array; slice to own ArrayBuffer before transfer
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    transferResults[outName] = buf;
    transferList.push(buf);
  }

  try { await ffmpeg.deleteFile(inName); } catch { /* ok */ }

  self.postMessage({ type: 'done', results: transferResults }, transferList);
}

// ─── message handler ─────────────────────────────────────────────────────────
self.addEventListener('message', async (e) => {
  const { cmd } = e.data;
  try {
    if (cmd === 'init') {
      await initFFmpeg();
    } else if (cmd === 'processGif') {
      await processGif(e.data.buffer, e.data.mode);
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});
