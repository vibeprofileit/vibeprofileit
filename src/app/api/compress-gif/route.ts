import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export const maxDuration = 60;

const exec = promisify(execFile);

const TARGET_BYTES = Math.floor(4.95 * 1024 * 1024); // 4.95 MB -- Steam premium siniri

function getGifsicle(): string {
  const ext = process.platform === "win32" ? ".exe" : "";
  return join(process.cwd(), "node_modules", "gifsicle", "vendor", `gifsicle${ext}`);
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

  const cleanup = async () => {
    const { readdir } = await import("fs/promises");
    const files = await readdir(tmp);
    await Promise.allSettled(
      files
        .filter((f) => f.startsWith(id))
        .map((f) => unlink(join(tmp, f)))
    );
  };

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

    // ── Crop (Classic mod) -- mandatory regardless of file size ───────────────
    let base = input;
    if (!isFeatured) {
      const { stdout } = await exec(bin, ["--info", input]);
      const match = /logical screen \d+x(\d+)/i.exec(stdout);
      const actualH = match ? parseInt(match[1], 10) : srcH;
      await gs(bin, ["--crop", `${cropX},0+${cropW}x${actualH}`, "--optimize=3", input, "-o", cropped]);
      base = cropped;
    }

    // ── Post-crop size check — skip compression if under target or elite bypass ─
    const baseSize = await fsize(base);
    if (baseSize <= TARGET_BYTES || noCompress) return respond(base);

    // Determine starting lossy based on file size
    const startLossy =
      baseSize <= 5.5 * 1024 * 1024 ? 25 :
      baseSize <= 7.0 * 1024 * 1024 ? 45 :
      baseSize <= 10.0 * 1024 * 1024 ? 60 : 80;

    // Phase 1 — Lossy escalation (always from base, no frame touching)
    const lossySteps = [startLossy, Math.min(startLossy + 20, 80), 80].filter(
      (v, i, arr) => arr.indexOf(v) === i
    );
    for (const lossy of lossySteps) {
      const out = join(tmp, `${id}_l${lossy}.gif`);
      await gs(bin, ["--lossy=" + lossy, "--colors", "256", "--optimize=3", base, "-o", out]);
      if (await fsize(out) <= TARGET_BYTES) return respond(out);
    }

    // Phase 2 — Color reduction (lossy=80 fixed, always from base, minimum 128)
    for (const colors of [200, 150, 128]) {
      const out = join(tmp, `${id}_c${colors}.gif`);
      await gs(bin, ["--lossy=80", "--colors", String(colors), "--optimize=3", base, "-o", out]);
      if (await fsize(out) <= TARGET_BYTES) return respond(out);
    }

    // Nothing worked — return too large, never delete frames
    return tooLarge(join(tmp, `${id}_c128.gif`));

  } catch (err) {
    await cleanup();
    const message = err instanceof Error ? err.message : String(err);
    console.error("[compress-gif] FULL ERROR:", message);
    return NextResponse.json({ error: "Compression failed", detail: message }, { status: 500 });
  }
}
