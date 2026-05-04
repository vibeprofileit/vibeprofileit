export interface GifInfo {
  frameCount: number;
  totalDuration: number; // ms
}

export function parseGifInfo(buffer: ArrayBuffer): GifInfo {
  const d = new Uint8Array(buffer);

  if (d.length < 6 || d[0] !== 0x47 || d[1] !== 0x49 || d[2] !== 0x46) {
    throw new Error('Geçersiz GIF dosyası');
  }

  let frameCount = 0;
  let totalDelay = 0; // centiseconds

  for (let i = 0; i < d.length - 7; i++) {
    // GCE imzası: 0x21 0xF9 0x04
    if (d[i] === 0x21 && d[i + 1] === 0xF9 && d[i + 2] === 0x04) {
      frameCount++;
      const raw = d[i + 4] | (d[i + 5] << 8);
      totalDelay += raw === 0 ? 1 : raw; // minimum 1 cs fallback
      i += 7; // GCE toplam 8 byte, döngü i++ yapar → 7
    }
  }

  return {
    frameCount,
    totalDuration: totalDelay * 10, // centiseconds → ms
  };
}
