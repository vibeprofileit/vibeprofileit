"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Link from "next/link";

const STYLES = ["Cyberpunk", "Anime", "Dark Fantasy", "Sci-Fi", "Pixel Art"];

// ─── Particle canvas — Crimson/Ember palette ───────────────────────────────────
function CrimsonVoidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // İlk boyutu ayarla
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = {
      x: number; y: number;
      size: number;
      speedX: number; speedY: number;
      opacity: number; hue: number;
    };

    // hue 0-30 = crimson → orange ember
    const particles: Particle[] = Array.from({ length: 130 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.4,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.55 + 0.1,
      hue: Math.random() * 30,
    }));

    // Resize: parçacıkları orantılı olarak yeni boyuta taşı
    const resize = () => {
      const prevW = canvas.width;
      const prevH = canvas.height;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      for (const p of particles) {
        p.x = (p.x / prevW) * canvas.width;
        p.y = (p.y / prevH) * canvas.height;
      }
    };
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, 0.9)`;
        ctx.shadowBlur = 10;
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.opacity})`;
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(220, 60, 30, ${0.07 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Floating word cloud layer — Crimson/Amber glow ───────────────────────────
const FLOAT_WORDS = [
  "Anime", "Cyberpunk", "Elite Design", "Masterpiece",
  "Pro Generation", "Custom Design", "Dark Fantasy", "vibeProfileit",
];
const GLOW = "rgba(220,38,38,0.75)";
const WORD_CONFIGS = [
  { top: "12%", left: "8%",  size: 13, dur: 28, delay: 0,  angle: 6,  glow: GLOW },
  { top: "28%", left: "75%", size: 11, dur: 34, delay: 5,  angle: -5, glow: GLOW },
  { top: "52%", left: "5%",  size: 14, dur: 40, delay: 10, angle: 3,  glow: GLOW },
  { top: "70%", left: "80%", size: 12, dur: 32, delay: 3,  angle: -8, glow: GLOW },
  { top: "85%", left: "38%", size: 11, dur: 38, delay: 8,  angle: 5,  glow: GLOW },
  { top: "40%", left: "58%", size: 12, dur: 36, delay: 14, angle: -3, glow: GLOW },
  { top: "65%", left: "20%", size: 13, dur: 42, delay: 6,  angle: 7,  glow: GLOW },
  { top: "75%", left: "35%", size: 12, dur: 44, delay: 11, angle: -4, glow: GLOW },
];

function FloatingWords() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {FLOAT_WORDS.map((word, i) => {
        const cfg = WORD_CONFIGS[i];
        return (
          <span
            key={word}
            style={{
              position: "absolute",
              top: cfg.top, left: cfg.left,
              fontSize: cfg.size,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              color: "rgba(255,160,100,0.40)",
              textShadow: `0 0 10px ${cfg.glow}, 0 0 22px ${cfg.glow}`,
              transform: `rotate(${cfg.angle}deg)`,
              animation: `floatDrift ${cfg.dur}s ${cfg.delay}s ease-in-out infinite alternate`,
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {word}
          </span>
        );
      })}
      <style>{`
        @keyframes floatDrift {
          0%   { transform: translateY(0px)   translateX(0px);   }
          33%  { transform: translateY(-32px) translateX(14px);  }
          66%  { transform: translateY(-14px) translateX(-18px); }
          100% { transform: translateY(-42px) translateX(8px);   }
        }
      `}</style>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleVisualize = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratedImage(null);

    await new Promise((r) => setTimeout(r, 2200));

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
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(${200 + Math.random() * 55}, ${20 + Math.random() * 60}, ${10 + Math.random() * 20}, ${Math.random() * 0.25})`;
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255, 180, 130, 0.85)";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Elite Engine", 630, 770);
    ctx.fillStyle = "rgba(220, 80, 50, 0.55)";
    ctx.font = "28px monospace";
    ctx.fillText("1260 × 1600", 630, 840);
    if (selectedStyle) {
      ctx.fillStyle = "rgba(249, 115, 22, 0.4)";
      ctx.font = "22px monospace";
      ctx.fillText(selectedStyle.toUpperCase(), 630, 900);
    }

    setGeneratedImage(offscreen.toDataURL("image/png"));
    setIsGenerating(false);
  }, [prompt, selectedStyle, isGenerating]);

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
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: "#050505" }}
    >
      <Header />
      <CrimsonVoidBackground />
      <FloatingWords />

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

          <p style={{
            marginTop: 10, color: "rgba(220,130,80,0.60)",
            fontSize: 13, letterSpacing: "0.8px",
          }}>
            Visualize what others cannot imagine.
          </p>
        </motion.div>

        {/* HUD Panel */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.18, ease: "easeOut" }}
          style={{
            width: "100%", maxWidth: 800,
            background: "rgba(18,4,4,0.65)",
            backdropFilter: "blur(28px)",
            border: "1px solid rgba(220,38,38,0.28)",
            borderRadius: 20,
            padding: "48px 52px 44px",
            animation: "panelGlow 5s ease-in-out infinite",
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
              boxShadow: !prompt.trim() || isGenerating
                ? "none"
                : "0 0 24px rgba(220,38,38,0.25), 0 0 48px rgba(180,30,30,0.12)",
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

        {/* Output area */}
        <AnimatePresence>
          {(isGenerating || generatedImage) && (
            <motion.div
              key="output"
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              style={{ marginTop: 28, width: "100%", maxWidth: 660 }}
            >
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 10, padding: "0 2px",
              }}>
                <span style={{
                  fontSize: 10, color: "rgba(220,100,60,0.55)",
                  letterSpacing: "2.5px", fontFamily: "monospace", textTransform: "uppercase",
                }}>
                  OUTPUT RENDER
                </span>
                <span style={{
                  fontSize: 10, color: "rgba(220,38,38,0.65)",
                  letterSpacing: "1px", fontFamily: "monospace",
                }}>
                  1260 × 1600
                </span>
              </div>

              <div style={{
                background: "rgba(18,2,2,0.72)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(220,38,38,0.12)",
                borderRadius: 16, overflow: "hidden",
              }}>
                {isGenerating && !generatedImage ? (
                  <LoadingSkeleton />
                ) : generatedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={generatedImage}
                    alt="Elite Engine render"
                    style={{ width: "100%", maxHeight: 560, objectFit: "contain", display: "block" }}
                  />
                ) : null}
              </div>

              <AnimatePresence>
                {generatedImage && !isGenerating && (
                  <motion.div
                    key="bridge-btn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.25 }}
                    style={{ marginTop: 14 }}
                  >
                    <button
                      onClick={handleDownloadAndEdit}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(160,35,20,0.30)";
                        e.currentTarget.style.boxShadow = "0 0 22px rgba(220,38,38,0.20)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(160,35,20,0.13)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      style={{
                        width: "100%", padding: "14px 20px", borderRadius: 12,
                        border: "1px solid rgba(220,80,40,0.32)",
                        background: "rgba(160,35,20,0.13)",
                        backdropFilter: "blur(8px)",
                        color: "#fda4af", fontSize: 14, fontWeight: 500,
                        letterSpacing: "0.4px", cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex", alignItems: "center",
                        justifyContent: "center", gap: 10,
                        transition: "background 0.22s, box-shadow 0.22s",
                      }}
                    >
                      <DownloadIcon />
                      Download &amp; Edit in Design Studio
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes panelGlow {
          0%   { box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0px rgba(220,38,38,0); }
          50%  { box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 0 18px rgba(220,38,38,0.55), 0 0 40px rgba(220,38,38,0.20); }
          100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0px rgba(220,38,38,0); }
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

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function LoadingSkeleton() {
  return (
    <div style={{
      aspectRatio: "1260 / 1600",
      maxHeight: 480,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
      background: "linear-gradient(135deg, rgba(35,5,5,0.9) 0%, rgba(18,2,2,0.95) 100%)",
    }}>
      <div style={{
        width: 44, height: 44,
        border: "1.5px solid rgba(220,38,38,0.12)",
        borderTopColor: "rgba(220,38,38,0.85)",
        borderRadius: "50%",
        animation: "void-spin 0.9s linear infinite",
      }} />
      <span style={{
        color: "rgba(220,100,60,0.60)", fontSize: 11,
        letterSpacing: "2.5px", fontFamily: "monospace", textTransform: "uppercase",
      }}>
        RENDERING VOID…
      </span>
    </div>
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
