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

// Returns { 'main.gif': Blob, 'side.gif': Blob } or { 'featured_main.gif': Blob }
export function processGif(
  file: File,
  mode: 'classic' | 'featured',
  onProgress?: (p: number) => void
): Promise<Record<string, Blob>> {
  return new Promise(async (resolve, reject) => {
    const w = getWorker();
    const buffer = await file.arrayBuffer();

    const onMessage = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'done') {
        w.removeEventListener('message', onMessage);
        w.removeEventListener('error', onError);
        const blobs: Record<string, Blob> = {};
        for (const [name, buf] of Object.entries(e.data.results as Record<string, ArrayBuffer>)) {
          blobs[name] = new Blob([buf], { type: 'image/gif' });
        }
        resolve(blobs);
      } else if (type === 'error') {
        w.removeEventListener('message', onMessage);
        w.removeEventListener('error', onError);
        reject(new Error(e.data.message));
      } else if (type === 'progress' && onProgress) {
        onProgress(Math.round((e.data.progress as number) * 100));
      }
    };

    const onError = (err: ErrorEvent) => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      reject(new Error(`Worker error: ${err.message}`));
    };

    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    // Transfer the ArrayBuffer to avoid copying — buffer is neutered after this call
    w.postMessage({ cmd: 'processGif', buffer, mode }, [buffer]);
  });
}
