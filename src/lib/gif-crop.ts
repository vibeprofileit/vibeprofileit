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
  const files = await gifsicle.run({
    input: [{ file: buf, name: 'input.gif' }],
    command: [cmd],
  });
  if (!files?.length) throw new Error('Gifsicle crop produced no output.');
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
    const x = Math.floor((width - 630) / 2);
    const result = await runCrop(
      buffer,
      `--crop ${x},0+630x${height} input.gif -o /out/featured_main.gif`,
    );
    return [{ name: 'featured_main.gif', buffer: result }];
  }

  // Classic: main ve side orijinal input'tan ayrı ayrı crop edilir
  const mainX = Math.floor((width - 606) / 2);
  const sideX = mainX + 506;

  const [mainBuf, sideBuf] = await Promise.all([
    runCrop(buffer, `--crop ${mainX},0+506x${height} input.gif -o /out/main.gif`),
    runCrop(buffer, `--crop ${sideX},0+100x${height} input.gif -o /out/side.gif`),
  ]);

  return [
    { name: 'main.gif', buffer: mainBuf },
    { name: 'side.gif', buffer: sideBuf },
  ];
}
