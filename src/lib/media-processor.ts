'use client';

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker('/workers/media-processor.worker.js');
  }
  return worker;
}

export function initFFmpeg(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const w = getWorker();

    const onMessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        w.removeEventListener('message', onMessage);
        w.removeEventListener('error', onError);
        resolve();
      }
    };
    const onError = (err: ErrorEvent) => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      initPromise = null;
      reject(new Error(`Worker init failed: ${err.message}`));
    };

    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    w.postMessage({ cmd: 'init' });
  });

  return initPromise;
}
