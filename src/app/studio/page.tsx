"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const STYLES = ["Cyberpunk", "Anime", "Dark Fantasy", "Sci-Fi", "Pixel Art"];

// ─── Particle canvas background ────────────────────────────────────────────────
function PurpleVoidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type Particle = {
      x: number; y: number;
      size: number;
      speedX: number; speedY: number;
      opacity: number; hue: number;
    };

    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2.5 + 0.4,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.55 + 0.1,
      hue: 260 + Math.random() * 50,
    }));

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
        ctx.shadowColor = `hsla(${p.hue}, 80%, 65%, 0.9)`;
        ctx.shadowBlur = 10;
        ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.opacity})`;
        ctx.fill();
      }

      // Soft connections
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
            ctx.strokeStyle = `rgba(150, 80, 255, ${0.07 * (1 - dist / 110)})`;
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

    // Placeholder generation — replace with real API call
    await new Promise((r) => setTimeout(r, 2200));

    const offscreen = document.createElement("canvas");
    offscreen.width = 1260;
    offscreen.height = 1600;
    const ctx = offscreen.getContext("2d")!;

    const bg = ctx.createLinearGradient(0, 0, 1260, 1600);
    bg.addColorStop(0, "#0d0020");
    bg.addColorStop(0.45, "#180038");
    bg.addColorStop(1, "#080012");
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
      ctx.fillStyle = `rgba(${120 + Math.random() * 80}, ${20 + Math.random() * 40}, 255, ${Math.random() * 0.25})`;
      ctx.fill();
    }

    ctx.fillStyle = "rgba(210, 160, 255, 0.85)";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Elite Engine", 630, 770);
    ctx.fillStyle = "rgba(170, 100, 255, 0.55)";
    ctx.font = "28px monospace";
    ctx.fillText("1260 × 1600", 630, 840);
    if (selectedStyle) {
      ctx.fillStyle = "rgba(200, 140, 255, 0.4)";
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
      style={{ background: "#020617" }}
    >
      <PurpleVoidBackground />

      {/* Ambient radial glows */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div style={{
          position: "absolute", top: "-15%", left: "50%",
          transform: "translateX(-50%)",
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(110,30,200,0.13) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "5%", right: "15%",
          width: 450, height: 450, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(160,50,255,0.07) 0%, transparent 70%)",
        }} />
      </div>

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          style={{ textAlign: "center", marginBottom: 52 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "4px 18px",
            border: "1px solid rgba(160,60,255,0.25)",
            borderRadius: 20,
            marginBottom: 18,
            background: "rgba(100,30,180,0.09)",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#a855f7",
              boxShadow: "0 0 8px #a855f7",
              display: "inline-block",
            }} />
            <span style={{
              fontSize: 10, letterSpacing: "3px", color: "rgba(180,120,255,0.75)",
              textTransform: "uppercase", fontFamily: "monospace",
            }}>
              ELITE ENGINE · ONLINE
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(38px, 5.5vw, 68px)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-1.5px",
            lineHeight: 1.05,
            margin: 0,
          }}>
            The{" "}
            <span style={{
              background: "linear-gradient(130deg, #c084fc, #7c3aed, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Purple Void
            </span>
          </h1>

          <p style={{
            marginTop: 10, color: "rgba(170,130,220,0.55)",
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
            width: "100%", maxWidth: 660,
            background: "rgba(12,4,26,0.65)",
            backdropFilter: "blur(28px)",
            border: "1px solid rgba(160,60,255,0.14)",
            borderRadius: 20,
            padding: "36px 36px 32px",
            boxShadow: "0 0 70px rgba(100,30,200,0.09), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vision..."
            rows={3}
            onFocus={(e) => { e.target.style.borderColor = "rgba(160,60,255,0.5)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(160,60,255,0.18)"; }}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(160,60,255,0.18)",
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
              fontSize: 10, color: "rgba(150,110,210,0.55)",
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
                        ? "1px solid rgba(160,60,255,0.65)"
                        : "1px solid rgba(160,60,255,0.18)",
                      background: active
                        ? "rgba(110,35,200,0.28)"
                        : "rgba(255,255,255,0.02)",
                      color: active ? "#d8b4fe" : "rgba(170,130,210,0.6)",
                      fontSize: 13, fontFamily: "inherit",
                      boxShadow: active ? "0 0 14px rgba(160,60,255,0.18)" : "none",
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
              border: "1px solid rgba(160,60,255,0.38)",
              background: !prompt.trim() || isGenerating
                ? "rgba(70,20,110,0.18)"
                : "rgba(90,25,160,0.38)",
              color: !prompt.trim() || isGenerating
                ? "rgba(170,130,220,0.38)"
                : "#e9d5ff",
              fontSize: 15, fontWeight: 600, letterSpacing: "0.6px",
              cursor: !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
              boxShadow: !prompt.trim() || isGenerating
                ? "none"
                : "0 0 24px rgba(160,60,255,0.22), 0 0 48px rgba(110,30,200,0.1)",
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
              {/* Label row */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 10, padding: "0 2px",
              }}>
                <span style={{
                  fontSize: 10, color: "rgba(150,110,210,0.5)",
                  letterSpacing: "2.5px", fontFamily: "monospace", textTransform: "uppercase",
                }}>
                  OUTPUT RENDER
                </span>
                <span style={{
                  fontSize: 10, color: "rgba(160,60,255,0.6)",
                  letterSpacing: "1px", fontFamily: "monospace",
                }}>
                  1260 × 1600
                </span>
              </div>

              {/* Image container */}
              <div style={{
                background: "rgba(8,2,18,0.72)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(160,60,255,0.1)",
                borderRadius: 16, overflow: "hidden",
              }}>
                {isGenerating && !generatedImage ? (
                  <LoadingSkeleton />
                ) : generatedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={generatedImage}
                    alt="Elite Engine render"
                    style={{
                      width: "100%",
                      maxHeight: 560,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                ) : null}
              </div>

              {/* Download & Edit */}
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
                        e.currentTarget.style.background = "rgba(130,45,210,0.28)";
                        e.currentTarget.style.boxShadow = "0 0 22px rgba(160,60,255,0.18)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(130,45,210,0.13)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      style={{
                        width: "100%", padding: "14px 20px", borderRadius: 12,
                        border: "1px solid rgba(190,90,255,0.3)",
                        background: "rgba(130,45,210,0.13)",
                        backdropFilter: "blur(8px)",
                        color: "#c084fc", fontSize: 14, fontWeight: 500,
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
        @keyframes void-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        textarea::placeholder { color: rgba(150,110,200,0.32); }
        textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
      background: "linear-gradient(135deg, rgba(25,8,55,0.9) 0%, rgba(8,2,18,0.95) 100%)",
    }}>
      <div style={{
        width: 44, height: 44,
        border: "1.5px solid rgba(160,60,255,0.1)",
        borderTopColor: "rgba(160,60,255,0.8)",
        borderRadius: "50%",
        animation: "void-spin 0.9s linear infinite",
      }} />
      <span style={{
        color: "rgba(170,110,255,0.55)", fontSize: 11,
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
