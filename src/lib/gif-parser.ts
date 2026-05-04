export interface GifInfo {
  width: number;
  height: number;
  frameCount: number;
  /** Frame delay toplamı (ms). Trim kararı ve sourceFps hesabı için. */
  totalDuration: number;
  /** Global renk tablosu boyutu. Renk azaltma kararı için. */
  paletteSize: number;
}

/**
 * GIF binary'sini parse eder; yalnızca GCE ve Image Descriptor bloklarını tarar.
 * Harici bağımlılık yok, WASM gerektirmez.
 */
export function parseGifInfo(buffer: ArrayBuffer): GifInfo {
  const d = new Uint8Array(buffer);

  if (d.length < 13 || d[0] !== 0x47 || d[1] !== 0x49 || d[2] !== 0x46) {
    throw new Error('Geçersiz GIF dosyası');
  }

  const width  = d[6] | (d[7] << 8);
  const height = d[8] | (d[9] << 8);
  const packed = d[10];

  const hasGCT   = (packed & 0x80) !== 0;
  const paletteSize = hasGCT ? 2 ** ((packed & 0x07) + 1) : 256;

  // GCT varsa atla
  let pos = 13 + (hasGCT ? paletteSize * 3 : 0);

  let frameCount = 0;
  let totalDelay = 0; // centiseconds (1/100 s)

  while (pos < d.length) {
    const byte = d[pos];

    if (byte === 0x3B) break; // GIF Trailer

    if (byte === 0x21) {
      const label = d[pos + 1];

      if (label === 0xF9 && d[pos + 2] === 0x04) {
        // Graphic Control Extension: 8 byte sabit yapı
        // [0x21][0xF9][0x04][packed][delayLow][delayHigh][transIdx][0x00]
        totalDelay += d[pos + 4] | (d[pos + 5] << 8);
        pos += 8;
      } else {
        // Diğer extension'lar: sub-block listesini atla
        pos += 2;
        pos = skipSubBlocks(d, pos);
      }
    } else if (byte === 0x2C) {
      // Image Descriptor
      frameCount++;
      const imgPacked = d[pos + 9];
      const hasLCT  = (imgPacked & 0x80) !== 0;
      const lctSize = hasLCT ? 2 ** ((imgPacked & 0x07) + 1) : 0;
      pos += 10 + lctSize * 3; // descriptor (10 byte) + LCT
      pos += 1;                // LZW minimum code size
      pos = skipSubBlocks(d, pos); // image data sub-blocks
    } else {
      pos++;
    }
  }

  return {
    width,
    height,
    frameCount,
    totalDuration: totalDelay * 10, // centiseconds → ms
    paletteSize,
  };
}

function skipSubBlocks(d: Uint8Array, pos: number): number {
  while (pos < d.length) {
    const size = d[pos];
    pos++;
    if (size === 0) break;
    pos += size;
  }
  return pos;
}
