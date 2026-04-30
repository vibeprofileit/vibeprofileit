import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import ffmpegStatic from "ffmpeg-static";

export const maxDuration = 60;

const exec = promisify(execFile);

const TARGET_BYTES = Math.floor(4.95 * 1024 * 1024); // 4.95 MB -- Steam premium siniri

function getGifsicle(): string {
  const ext = process.platform === "win32" ? ".exe" : "";
  return join(process.cwd(), "node_modules", "gifsicle", "vendor", `gifsicle${ext}`);
}

function getFfmpeg(): string {
  if (!ffmpegStatic) throw new Error("ffmpeg-static binary not found");
  return ffmpegStatic;
}

function getGifLogicalSize(buf: Buffer): { w: number; h: number } {
  if (buf.length < 10) throw new Error("Invalid GIF header");
  return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
}

async function fsize(p: string): Promise<number> {
  return (await stat(p)).size;
}

async function gs(bin: string, args: string[]): Promise<void> {
  await exec(bin, args);
}

export async function POST(req: NextRequest) {
  const form       = await req.formData();
  const file       = form.get("file") as File | null;
  const cropXRaw   = form.get("cropX");
  const cropWRaw   = form.get("cropW");
  let noCompress   = form.get("noCompress") === "true";
  const cropX      = cropXRaw != null ? parseInt(cropXRaw as string, 10) : null;
  const cropW      = cropWRaw != null ? parseInt(cropWRaw as string, 10) : null;
  const isFeatured = cropX === null && cropW === null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ELITE_BYPASS_BYTES = 5_138_022;
  if (!noCompress && file.size < ELITE_BYPASS_BYTES) noCompress = true;

  const bin   = getGifsicle();
  const ffbin = getFfmpeg();
  const id    = randomUUID();
  const tmp   = tmpdir();
  const input   = join(tmp, `${id}_in.gif`);
  const norm    = join(tmp, `${id}_norm.gif`);
  const cropped = join(tmp, `${id}_cr.gif`);
  const scratch1 = join(tmp, `${id}_s1.gif`);
  const scratch2 = join(tmp, `${id}_s2.gif`);
  const scratch3 = join(tmp, `${id}_s3.gif`);

  const cleanup = () =>
    Promise.allSettled(
      [input, norm, cropped, scratch1, scratch2, scratch3].map((p) => unlink(p))
    );

  const respond = async (path: string) => {
    const data = await readFile(path);
    await cleanup();
    return new NextResponse(data, { headers: { "Content-Type": "image/gif" } });
  };

  const tooLarge = async (path: string) => {
    const sizeMB = ((await fsize(path)) / 1024 / 1024).toFixed(1);
    await cleanup();
    return NextResponse.json({ error: "too_large", sizeMB }, { status: 422 });
  };

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(input, buf);

    const { w: srcW, h: srcH } = getGifLogicalSize(buf);
    if (srcW < 600) return respond(input);

    // ── STEP 1: FFmpeg normalization — 630px max width, 15 fps, 3s cap ───────
    await exec(ffbin, [
      "-i", input,
      "-t", "3",
      "-vf", "fps=15,scale=if(gt(iw,630),630,iw):-1",
      "-y", norm,
    ]);

    // ── Crop (Classic mod) -- mandatory regardless of file size ───────────────
    let base = norm;
    if (!isFeatured) {
      const { stdout } = await exec(bin, ["--info", norm]);
      const match = /logical screen \d+x(\d+)/i.exec(stdout);
      const actualH = match ? parseInt(match[1], 10) : srcH;
      await gs(bin, ["--crop", `${cropX},0+${cropW}x${actualH}`, "--optimize=3", norm, "-o", cropped]);
      base = cropped;
    }

    // ── Post-crop size check — skip compression if under target or elite bypass ─
    const baseSize = await fsize(base);
    if (baseSize <= TARGET_BYTES || noCompress) return respond(base);

    // ── STEP 2: Hybrid Compression ────────────────────────────────────────────
    const MB = 1024 * 1024;
    const startLossy =
      baseSize < 5.5 * MB ? 25 :
      baseSize < 7   * MB ? 45 :
      baseSize < 10  * MB ? 60 : 80;

    // Phase 1: Lossy Escalation — colors fixed at 256, always from base (no stacking)
    let lastLossy = Math.min(startLossy + 40, 200);
    for (const lossy of [startLossy, startLossy + 20, startLossy + 40]) {
      const clamped = Math.min(lossy, 200);
      await gs(bin, ["--lossy=" + clamped, "--colors", "256", "--optimize=3", base, "-o", scratch1]);
      if (await fsize(scratch1) <= TARGET_BYTES) return respond(scratch1);
      lastLossy = clamped;
    }

    // Phase 2: Color Reduction — lossy fixed at lastLossy, colors stepped down
    for (const colors of [200, 150, 128]) {
      await gs(bin, ["--lossy=" + lastLossy, "--colors", String(colors), "--optimize=3", base, "-o", scratch2]);
      if (await fsize(scratch2) <= TARGET_BYTES) return respond(scratch2);
    }

    // Phase 3: FPS Decimation — delete every 2nd then every 3rd frame from base
    const { stdout: infoOut } = await exec(bin, ["--info", base]);
    const frameMatch = /(\d+) images/i.exec(infoOut);
    const frameCount = frameMatch ? parseInt(frameMatch[1], 10) : 0;

    if (frameCount > 2) {
      for (const keepEvery of [2, 3]) {
        const toDelete = Array.from({ length: frameCount }, (_, i) => i)
          .filter((i) => i % keepEvery !== 0)
          .map((i) => `#${i}`);
        if (toDelete.length === 0) continue;
        await gs(bin, [
          "--unoptimize",
          "--lossy=" + lastLossy, "--colors", "128", "--optimize=3",
          base, "--delete", ...toDelete,
          "-o", scratch3,
        ]);
        if (await fsize(scratch3) <= TARGET_BYTES) return respond(scratch3);
      }
      return tooLarge(scratch3);
    }

    return tooLarge(scratch2);

  } catch (err) {
    await cleanup();
    const message = err instanceof Error ? err.message : String(err);
    console.error("[compress-gif] FULL ERROR:", message);
    return NextResponse.json({ error: "Compression failed", detail: message }, { status: 500 });
  }
}
