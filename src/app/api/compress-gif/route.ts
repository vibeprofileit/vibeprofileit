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

const TARGET_BYTES  = Math.floor(4.95 * 1024 * 1024); // 4.95 MB -- Steam premium siniri
const PASS1_CEILING = Math.floor(6.5  * 1024 * 1024); // 6.5 MB  -- Pass 1 ust siniri

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

  const bin = getGifsicle();
  const id  = randomUUID();
  const tmp = tmpdir();
  const input   = join(tmp, `${id}_in.gif`);
  const cropped = join(tmp, `${id}_cr.gif`);
  const pass1   = join(tmp, `${id}_p1.gif`);
  const pass2   = join(tmp, `${id}_p2.gif`);
  const pass3   = join(tmp, `${id}_p3.gif`);

  const cleanup = () =>
    Promise.allSettled([input, cropped, pass1, pass2, pass3].map((p) => unlink(p)));

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

    // ── Crop (Classic mod) -- mandatory regardless of file size ──────────────
    let base = input;
    if (!isFeatured) {
      const { stdout } = await exec(bin, ["--info", input]);
      const match = /logical screen \d+x(\d+)/i.exec(stdout);
      const actualH = match ? parseInt(match[1], 10) : srcH;
      await gs(bin, ["--crop", `${cropX},0+${cropW}x${actualH}`, "--optimize=3", input, "-o", cropped]);
      base = cropped;
    }

    // ── Post-crop size check -- skip compression if already under target or elite bypass ──────
    // GIF watermark (overlay) using FFmpeg
    const baseSize = await fsize(base);
    if (baseSize <= TARGET_BYTES || noCompress) return respond(base);

    // ── Pass 1 (High Efficiency): base under 6.5 MB -> lossy=35 ──────────────
    if (baseSize <= PASS1_CEILING) {
      await gs(bin, ["--lossy=35", "--colors", "256", "--optimize=3", base, "-o", pass1]);
      if (await fsize(pass1) <= TARGET_BYTES) return respond(pass1);
    }

    // ── Pass 2 (The Blade): still above target or started at 6.5 MB+ -> lossy=60
    // Always start from base: no stacked lossy artifacts
    await gs(bin, ["--lossy=60", "--colors", "256", "--optimize=3", base, "-o", pass2]);
    if (await fsize(pass2) <= TARGET_BYTES) return respond(pass2);

    // ── Pass 3 (Surgical Trim): sacrifice frames, never pixels ───────────────
    // Try 5->8->12->16 frame deletions, never return 422
    for (const n of [5, 8, 12, 16]) {
      await gs(bin, [
        "--unoptimize",
        "--lossy=30", "--colors", "256", "--optimize=3",
        base,
        "--delete", `#-${n}-`,
        "-o", pass3,
      ]);
      if (await fsize(pass3) <= TARGET_BYTES) return respond(pass3);
    }
    return tooLarge(pass3);

  } catch (err) {
    await cleanup();
    console.error("[compress-gif]", err);
    return NextResponse.json({ error: "Compression failed" }, { status: 500 });
  }
}
