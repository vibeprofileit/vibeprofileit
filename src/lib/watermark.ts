export async function stampWatermark(canvas: HTMLCanvasElement): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const wm = new Image();
  await new Promise<void>((resolve, reject) => {
    wm.onload  = () => resolve();
    wm.onerror = () => reject(new Error("Watermark load failed"));
    wm.src = "/watermark-logo.png";
  });

  const PAD    = 20;
  const BGPAD  = 8;
  const RADIUS = 6;

  const wmW = 72;
  const wmH = Math.round(wm.naturalHeight * (wmW / wm.naturalWidth));
  const x   = canvas.width  - PAD - wmW;
  const y   = canvas.height - PAD - wmH;

  const bgX = x - BGPAD;
  const bgY = y - BGPAD;
  const bgW = wmW + BGPAD * 2;
  const bgH = wmH + BGPAD * 2;

  ctx.save();

  ctx.globalAlpha = 0.4;
  ctx.fillStyle   = "#000000";
  ctx.beginPath();
  ctx.moveTo(bgX + RADIUS, bgY);
  ctx.lineTo(bgX + bgW - RADIUS, bgY);
  ctx.quadraticCurveTo(bgX + bgW, bgY,       bgX + bgW, bgY + RADIUS);
  ctx.lineTo(bgX + bgW, bgY + bgH - RADIUS);
  ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - RADIUS, bgY + bgH);
  ctx.lineTo(bgX + RADIUS, bgY + bgH);
  ctx.quadraticCurveTo(bgX,       bgY + bgH, bgX,       bgY + bgH - RADIUS);
  ctx.lineTo(bgX, bgY + RADIUS);
  ctx.quadraticCurveTo(bgX,       bgY,       bgX + RADIUS, bgY);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.7;
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur  = 8;
  ctx.drawImage(wm, x, y, wmW, wmH);

  ctx.restore();
}
