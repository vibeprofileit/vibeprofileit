export interface GifInfo {
  frameCount: number;
  totalDuration: number; // ms
}

// GIF yapısını takip ederek frame delay'lerini okur.
// Linear scan yerine structural traversal kullanır — image data içindeki
// 0x21 0xF9 0x04 dizilerini yanlışlıkla GCE olarak saymaz.
export function extractGifDelays(buffer: ArrayBuffer): number[] {
  const d = new Uint8Array(buffer);
  if (d.length < 13 || d[0] !== 0x47 || d[1] !== 0x49 || d[2] !== 0x46) return [];

  // Logical Screen Descriptor (bytes 6-12) + Global Color Table
  const gctFlag = (d[10] & 0x80) !== 0;
  const gctSize = gctFlag ? 3 * (2 ** ((d[10] & 0x07) + 1)) : 0;
  let i = 13 + gctSize;

  const delays: number[] = [];
  let pendingDelay = 0;

  while (i < d.length) {
    const b = d[i];
    if (b === 0x3B) break; // GIF Trailer

    if (b === 0x21) { // Extension Introducer
      const label = d[i + 1];
      i += 2;
      if (label === 0xF9) { // Graphic Control Extension — always 4-byte block
        const sz = d[i++];
        const raw = d[i + 1] | (d[i + 2] << 8);
        pendingDelay = raw === 0 ? 1 : raw;
        i += sz;
        i++; // block terminator 0x00
      } else { // Other extensions — skip sub-block chain
        let sz = d[i++];
        while (sz > 0 && i < d.length) { i += sz; sz = d[i++]; }
      }
      continue;
    }

    if (b === 0x2C) { // Image Descriptor
      i++; // skip separator
      const lctFlag = (d[i + 8] & 0x80) !== 0;
      const lctSize = lctFlag ? 3 * (2 ** ((d[i + 8] & 0x07) + 1)) : 0;
      i += 9 + lctSize; // 9-byte descriptor + Local Color Table
      i++; // LZW minimum code size
      let sz = d[i++];
      while (sz > 0 && i < d.length) { i += sz; sz = d[i++]; }
      delays.push(pendingDelay);
      pendingDelay = 0;
      continue;
    }

    break; // Unknown block type — stop
  }

  return delays;
}

export function parseGifInfo(buffer: ArrayBuffer): GifInfo {
  const d = new Uint8Array(buffer);
  if (d.length < 6 || d[0] !== 0x47 || d[1] !== 0x49 || d[2] !== 0x46) {
    throw new Error('Invalid GIF file');
  }
  const delays = extractGifDelays(buffer);
  return {
    frameCount: delays.length,
    totalDuration: delays.reduce((a, b) => a + b, 0) * 10,
  };
}
