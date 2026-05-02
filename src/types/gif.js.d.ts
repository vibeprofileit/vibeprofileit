declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    dither?: boolean | string;
    transparent?: number | null;
    debug?: boolean;
  }

  interface FrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  class GIF {
    constructor(options: GIFOptions);
    addFrame(
      image: HTMLCanvasElement | CanvasRenderingContext2D | ImageData | HTMLImageElement,
      options?: FrameOptions
    ): void;
    render(): void;
    abort(): void;
    on(event: 'start', cb: () => void): void;
    on(event: 'abort', cb: () => void): void;
    on(event: 'progress', cb: (p: number) => void): void;
    on(event: 'finished', cb: (blob: Blob, data: Uint8Array) => void): void;
    on(event: 'error', cb: (err: Error) => void): void;
    running: boolean;
  }

  export = GIF;
}
