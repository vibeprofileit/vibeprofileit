declare module 'omggif' {
  class GifWriter {
    constructor(
      buf: Uint8Array,
      width: number,
      height: number,
      options?: { palette?: number[]; background?: number; loop?: number },
    );
    addFrame(
      x: number,
      y: number,
      w: number,
      h: number,
      indexedPixels: Uint8Array,
      options?: {
        palette?: number[];
        delay?: number;
        transparent?: number;
        disposal?: number;
      },
    ): void;
    end(): number;
  }
}
