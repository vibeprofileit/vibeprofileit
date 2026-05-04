/* global self */
'use strict';

importScripts('https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js');
importScripts('https://unpkg.com/@ffmpeg/util@0.12.2/dist/umd/index.js');

const { FFmpeg } = FFmpegWASM;
const { fetchFile } = FFmpegUtil;

let ffmpeg = null;

async function init() {
  ffmpeg = new FFmpeg();
  ffmpeg.on('log', ({ message }) => {
    self.postMessage({ type: 'log', message });
  });
  ffmpeg.on('progress', ({ progress }) => {
    self.postMessage({ type: 'progress', progress });
  });
  await ffmpeg.load({
    coreURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/umd/ffmpeg-core.js',
    wasmURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/umd/ffmpeg-core.wasm',
    workerURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/umd/ffmpeg-core.worker.js',
  });
  self.postMessage({ type: 'ready' });
}

self.addEventListener('message', async (e) => {
  const { cmd } = e.data;
  if (cmd === 'init') {
    await init();
  }
});
