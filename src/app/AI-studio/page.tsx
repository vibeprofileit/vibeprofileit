"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Link from "next/link";

const STYLES = ["Cyberpunk", "Anime", "Dark Fantasy", "Sci-Fi", "Pixel Art"];

// ─── Particle canvas — Vortex-capable ────────────────────────────────────────
function CrimsonVoidBackground({ vortexRef }: { vortexRef: { current: boolean } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = {
      x: number; y: number;
      size: number;
      bspX: number; bspY: number;
      opacity: number; hue: number;
      textX: number; textY: number;
      delay: number; // stagger delay ms before flying to text
    };

    const particles: Particle[] = Array.from({ length: 250 }, () => {
      const bspX = (Math.random() - 0.5) * 0.35;
      const bspY = (Math.random() - 0.5) * 0.35;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.4,
        bspX, bspY,
        opacity: Math.random() * 0.55 + 0.1,
        hue: Math.random() * 30,
        textX: 0, textY: 0,
        delay: 0,
      };
    });

    const ANGULAR_SPEED = 0.022;
    const READY_MS = 2800; // READY formasyonu süresi

    let wasVortex = false;
    let vortexStartTime = 0;
    // 0=ambient  1=ready  2=ring
    let phase = 0;

    // "READY" yazısının piksel koordinatlarını örnekle, her parçacığa ata
    const assignTextTargets = () => {
      const off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const oc = off.getContext("2d")!;
      const fs = Math.min(canvas.width * 0.11, 160);
      oc.clearRect(0, 0, off.width, off.height);
      oc.fillStyle = "#ffffff";
      oc.font = `bold ${fs}px monospace`;
      oc.textAlign = "center";
      oc.textBaseline = "middle";
      oc.fillText("READY", off.width / 2, off.height / 2);

      const { data, width, height } = oc.getImageData(0, 0, off.width, off.height);
      const pts: { x: number; y: number }[] = [];
      const step = 4;
      for (let y = 0; y < height; y += step)
        for (let x = 0; x < width; x += step)
          if (data[(y * width + x) * 4 + 3] > 100)
            pts.push({ x, y });

      if (pts.length === 0) return; // font yüklenmedi, geç

      // Fisher-Yates shuffle
      for (let i = pts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }

      particles.forEach((p, i) => {
        const t = pts[i % pts.length];
        p.textX = t.x;
        p.textY = t.y;
        p.delay = Math.random() * 700; // 0–700ms stagger
      });
    };

    const resize = () => {
      const pW = canvas.width, pH = canvas.height;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      for (const p of particles) {
        p.x = (p.x / pW) * canvas.width;
        p.y = (p.y / pH) * canvas.height;
      }
    };
    window.addEventListener("resize", resize);

    const draw = () => {
      const isVortex = vortexRef.current;

      if (isVortex && !wasVortex) {
        vortexStartTime = Date.now();
        phase = 1;
        assignTextTargets();
      }
      if (!isVortex && wasVortex) phase = 0;
      wasVortex = isVortex;

      if (isVortex && phase === 1 && Date.now() - vortexStartTime > READY_MS)
        phase = 2;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const targetR = Math.min(canvas.width, canvas.height) * 0.24;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        if (phase === 0) {
          // Ambient drift
          p.x += p.bspX;
          p.y += p.bspY;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
        } else if (phase === 1) {
          // Stagger: her sim kendi delay'i dolana kadar yerinde bekler
          const elapsed = Date.now() - vortexStartTime;
          if (elapsed > p.delay) {
            p.x += (p.textX - p.x) * 0.06;
            p.y += (p.textY - p.y) * 0.06;
          }
        } else {
          // Senkronize halka — hepsi aynı açısal hızla döner
          const dx = p.x - cx;
          const dy = p.y - cy;
          const r = Math.sqrt(dx * dx + dy * dy) || 1;
          const θ = Math.atan2(dy, dx) + ANGULAR_SPEED;
          const newR = r + (targetR - r) * 0.05;
          p.x = cx + newR * Math.cos(θ);
          p.y = cy + newR * Math.sin(θ);
        }

        const sizeMulti = phase === 1 ? 3.8 : phase === 2 ? 1.5 : 1;
        const blur     = phase === 1 ? 22  : phase === 2 ? 14  : 10;
        const alpha    = phase === 1 ? 1   : Math.min(1, p.opacity + (phase === 2 ? 0.3 : 0));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * sizeMulti, 0, Math.PI * 2);
        ctx.shadowColor = `hsla(${p.hue}, 90%, 65%, 0.95)`;
        ctx.shadowBlur = blur;
        ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${alpha})`;
        ctx.fill();
      }

      // Bağlantı çizgileri sadece ambient modda
      if (phase === 0) {
        ctx.shadowBlur = 0;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 110) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(220,60,30,${0.07 * (1 - d / 110)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}


// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const vortexRef = useRef(false);

  const handleVisualize = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    setPreviewMode(false);
    vortexRef.current = true;

    // Min 10s vortex show — image generation + timer race, both must finish
    const [dataUrl] = await Promise.all([
      new Promise<string>((resolve) => {
        const offscreen = document.createElement("canvas");
        offscreen.width = 1260;
        offscreen.height = 1600;
        const ctx = offscreen.getContext("2d")!;

        const bg = ctx.createLinearGradient(0, 0, 1260, 1600);
        bg.addColorStop(0, "#200005");
        bg.addColorStop(0.45, "#380010");
        bg.addColorStop(1, "#120002");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1260, 1600);

        for (let i = 0; i < 18; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * 1260,
            Math.random() * 1600,
            Math.random() * 90 + 15,
            0, Math.PI * 2
          );
          ctx.fillStyle = `rgba(${200 + Math.random() * 55},${20 + Math.random() * 60},${10 + Math.random() * 20},${Math.random() * 0.25})`;
          ctx.fill();
        }

        ctx.fillStyle = "rgba(255,180,130,0.85)";
        ctx.font = "bold 56px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Elite Engine", 630, 770);
        ctx.fillStyle = "rgba(220,80,50,0.55)";
        ctx.font = "28px monospace";
        ctx.fillText("1260 × 1600", 630, 840);
        if (selectedStyle) {
          ctx.fillStyle = "rgba(249,115,22,0.4)";
          ctx.font = "22px monospace";
          ctx.fillText(selectedStyle.toUpperCase(), 630, 900);
        }

        resolve(offscreen.toDataURL("image/png"));
      }),
      new Promise<void>((r) => setTimeout(r, 10000)),
    ]);

    vortexRef.current = false;
    setGeneratedImage(dataUrl);
    setIsGenerating(false);
    setIsModalOpen(true);
  }, [prompt, selectedStyle, isGenerating]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setPreviewMode(true);
  }, []);

  const handleDownloadAndEdit = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = "elite-engine-1260x1600.png";
    link.click();
    sessionStorage.setItem("studio_generated_image", generatedImage);
    router.push("/design-studio?source=studio");
  }, [generatedImage, router]);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#050505" }}>
      <Header />
      <CrimsonVoidBackground vortexRef={vortexRef} />

      {/* Content */}
      <div
        className="relative"
        style={{
          zIndex: 2,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 110,
          paddingBottom: 80,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div style={{ width: "100%", maxWidth: 1400 }}>
          <Link href="/"
            className="inline-block mb-8 text-lg font-semibold text-white hover:text-white/70 transition-colors">
            ← Back to Home
          </Link>
        </div>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          style={{ textAlign: "center", marginBottom: 52 }}
        >
          <h1 style={{
            fontSize: "clamp(38px, 5.5vw, 68px)",
            fontWeight: 900,
            letterSpacing: "-1.5px",
            lineHeight: 1.05,
            margin: 0,
            background: "linear-gradient(110deg, #f87171 0%, #ef4444 25%, #dc2626 50%, #ea580c 75%, #f97316 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            The Elite AI
          </h1>
          <p style={{ marginTop: 10, color: "rgba(220,130,80,0.60)", fontSize: 13, letterSpacing: "0.8px" }}>
            Visualize what others cannot imagine.
          </p>
        </motion.div>

        {/* HUD Panel — dims to standby during generation */}
        <motion.div
          animate={{ opacity: isGenerating ? 0 : 1 }}
          transition={{ duration: 0.5 }}
          style={{
            width: "100%", maxWidth: 800,
            background: "rgba(18,4,4,0.92)",
            border: "1px solid rgba(220,38,38,0.28)",
            borderRadius: 20,
            padding: "48px 52px 44px",
            animation: isGenerating ? "none" : "panelGlow 5s ease-in-out infinite",
            pointerEvents: isGenerating ? "none" : "auto",
          }}
        >
          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vision..."
            rows={3}
            onFocus={(e) => { e.target.style.borderColor = "rgba(220,38,38,0.55)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(220,38,38,0.20)"; }}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(220,38,38,0.20)",
              borderRadius: 12, padding: "15px 16px",
              color: "#fff", fontSize: 15, resize: "none",
              outline: "none", fontFamily: "inherit",
              lineHeight: 1.65, marginBottom: 24,
              transition: "border-color 0.25s",
            }}
          />

          {/* Style pills */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 10, color: "rgba(220,100,60,0.60)",
              letterSpacing: "2.5px", textTransform: "uppercase",
              fontFamily: "monospace", marginBottom: 11,
            }}>
              STYLE MATRIX
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STYLES.map((s) => {
                const active = selectedStyle === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSelectedStyle((p) => (p === s ? null : s))}
                    style={{
                      padding: "7px 17px", borderRadius: 20, cursor: "pointer",
                      border: active
                        ? "1px solid rgba(220,38,38,0.70)"
                        : "1px solid rgba(220,38,38,0.20)",
                      background: active
                        ? "rgba(160,25,25,0.32)"
                        : "rgba(255,255,255,0.02)",
                      color: active ? "#fca5a5" : "rgba(220,130,80,0.65)",
                      fontSize: 13, fontFamily: "inherit",
                      boxShadow: active ? "0 0 14px rgba(220,38,38,0.22)" : "none",
                      transition: "all 0.22s",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visualize button */}
          <button
            onClick={handleVisualize}
            disabled={!prompt.trim() || isGenerating}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 12,
              border: "1px solid rgba(220,38,38,0.40)",
              background: !prompt.trim() || isGenerating
                ? "rgba(80,10,10,0.20)"
                : "rgba(160,20,20,0.40)",
              color: !prompt.trim() || isGenerating
                ? "rgba(220,130,80,0.40)"
                : "#fecaca",
              fontSize: 15, fontWeight: 600, letterSpacing: "0.6px",
              cursor: !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
              boxShadow: "none",
              transition: "all 0.28s", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            {isGenerating ? (
              <>
                <SpinIcon />
                Channeling the void…
              </>
            ) : (
              "Visualize"
            )}
          </button>
        </motion.div>

        {/* Preview Card — shrinks in after modal close */}
        <AnimatePresence>
          {previewMode && generatedImage && (
            <motion.div
              key="preview-card"
              initial={{ opacity: 0, scale: 0.82, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginTop: 28, width: "100%", maxWidth: 260 }}
            >
              {/* Clickable thumbnail — reopens modal */}
              <div
                onClick={() => setIsModalOpen(true)}
                style={{
                  background: "#0a0101",
                  border: "1px solid rgba(220,38,38,0.30)",
                  borderRadius: 14,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedImage}
                  alt="Elite Engine render"
                  style={{ width: "100%", display: "block", aspectRatio: "1260/1600", objectFit: "cover" }}
                />
              </div>

              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                onClick={handleDownloadAndEdit}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(180,28,18,0.55)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(160,20,20,0.38)";
                }}
                style={{
                  width: "100%", marginTop: 10, padding: "14px 18px", borderRadius: 12,
                  border: "1px solid rgba(220,60,40,0.55)",
                  background: "rgba(160,20,20,0.38)",
                  color: "#fecaca", fontSize: 13, fontWeight: 600,
                  letterSpacing: "0.5px", cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                  transition: "background 0.22s",
                }}
              >
                <DownloadIcon />
                Download &amp; Edit in Design Studio
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-screen Modal */}
      <AnimatePresence>
        {isModalOpen && generatedImage && (
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
            onClick={handleCloseModal}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(4,0,0,0.88)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "24px 16px",
            }}
          >
            <motion.div
              key="modal-content"
              initial={{ scale: 0.86, opacity: 0, y: 48 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.90, opacity: 0, y: 24 }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                background: "#0a0101",
                border: "1px solid rgba(220,38,38,0.30)",
                borderRadius: 20,
                overflow: "hidden",
                maxHeight: "90vh",
                width: "auto",
              }}
            >
              {/* Close button */}
              <button
                onClick={handleCloseModal}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.30)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.14)"; }}
                style={{
                  position: "absolute", top: 14, right: 14, zIndex: 10,
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(220,38,38,0.14)",
                  border: "1px solid rgba(220,38,38,0.36)",
                  color: "#fca5a5", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, lineHeight: 1,
                  transition: "background 0.2s",
                }}
              >
                ×
              </button>

              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImage}
                alt="Elite Engine render"
                style={{
                  display: "block",
                  maxHeight: "85vh",
                  width: "auto",
                  aspectRatio: "1260/1600",
                }}
              />

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes panelGlow {
          0%   { box-shadow: 0 0 0px rgba(220,38,38,0); }
          50%  { box-shadow: 0 0 18px rgba(220,38,38,0.55); }
          100% { box-shadow: 0 0 0px rgba(220,38,38,0); }
        }
        @keyframes void-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        textarea::placeholder { color: rgba(220,100,60,0.35); }
        textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpinIcon() {
  return (
    <svg
      width={16} height={16} viewBox="0 0 24 24" fill="none"
      style={{ animation: "void-spin 0.9s linear infinite", flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 15V3m0 12-4-4m4 4 4-4" />
      <path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" />
    </svg>
  );
}
