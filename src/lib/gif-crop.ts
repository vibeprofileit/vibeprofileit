import gifsicle from 'gifsicle-wasm-browser';

export interface CropOutput {
  name: string;
  buffer: ArrayBuffer;
}

function readDimensions(buf: ArrayBuffer): { width: number; height: number } {
  const d = new Uint8Array(buf);
  return { width: d[6] | (d[7] << 8), height: d[8] | (d[9] << 8) };
}

async function runCrop(buf: ArrayBuffer, cmd: string): Promise<ArrayBuffer> {
  let files;
  try {
    files = await gifsicle.run({
      input: [{ file: buf, name: 'input.gif' }],
      command: [cmd],
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Crop failed [${cmd}]: ${detail}`);
  }
  if (!files?.length) {
    throw new Error(`Crop produced no output [${cmd}]`);
  }
  return files[0].arrayBuffer();
}

export async function cropGif(
  buffer: ArrayBuffer,
  mode: 'featured' | 'classic',
): Promise<CropOutput[]> {
  const { width, height } = readDimensions(buffer);

  if (width < 600) throw new Error(`GIF width must be at least 600px (current: ${width}px)`);
  if (height < 800) throw new Error(`GIF height must be at least 800px (current: ${height}px)`);

  if (mode === 'featured') {
    const x     = Math.max(0, Math.floor((width - 630) / 2));
    const cropW = Math.min(630, width - x);
    const result = await runCrop(
      buffer,
      `--unoptimize --optimize=3 --crop ${x},0+${cropW}x${height} input.gif -o /out/featured_main.gif`,
    );
    return [{ name: 'featured_main.gif', buffer: result }];
  }

  // Classic: main ve side orijinal input'tan ayrı ayrı crop edilir
  const mainX = Math.max(0, Math.floor((width - 606) / 2));
  const sideX = mainX + 506;
  const mainW = Math.min(506, width - mainX);
  const sideW = Math.min(100, width - sideX);

  if (sideW <= 0) {
    throw new Error(`GIF is too narrow for classic crop (${width}px wide).`);
  }

  const [mainBuf, sideBuf] = await Promise.all([
    runCrop(buffer, `--unoptimize --optimize=3 --crop ${mainX},0+${mainW}x${height} input.gif -o /out/main.gif`),
    runCrop(buffer, `--unoptimize --optimize=3 --crop ${sideX},0+${sideW}x${height} input.gif -o /out/side.gif`),
  ]);

  return [
    { name: 'main.gif', buffer: mainBuf },
    { name: 'side.gif', buffer: sideBuf },
  ];
}
