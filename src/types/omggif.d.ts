declare module 'omggif' {
  interface GifWriterOptions {
    /** Infinite loop = 0, once = 1, N times = N */
    loop?: number;
    /** Global palette: array of 0xRRGGBB packed integers, length must be power of 2 */
    palette?: number[];
    background?: number;
  }

  interface AddFrameOptions {
    /** Local palette: array of 0xRRGGBB packed integers, length must be power of 2 */
    palette?: number[];
    /** Delay in centiseconds (1/100 s) */
    delay?: number;
    /** 0=no-op, 1=leave, 2=restore-bg, 3=restore-prev */
    disposal?: number;
    /** Transparent palette index */
    transparent?: number;
  }

  class GifWriter {
    constructor(buf: Uint8Array | number[], width: number, height: number, opts?: GifWriterOptions);
    addFrame(
      x: number, y: number, w: number, h: number,
      indexed_pixels: Uint8Array | number[],
      opts?: AddFrameOptions
    ): number;
    end(): number;
  }

  interface GifReaderFrameInfo {
    x: number; y: number; width: number; height: number;
    has_local_color_table: boolean;
    palette_offset: number;
    palette_size: number;
    delay: number;
    disposal: number;
    interlaced: boolean;
    transparent_index: number;
  }

  class GifReader {
    constructor(buf: Uint8Array);
    width: number;
    height: number;
    numFrames(): number;
    frameInfo(frameNum: number): GifReaderFrameInfo;
    decodeAndBlitFrameRGBA(frameNum: number, pixels: Uint8Array): void;
  }
}
