"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Link from "next/link";

const ELITE_STYLES = [
  {
    label: "Anime",
    icon: "🎌",
    category: "anime",
    powerPrompt:
      "high-end illustration, vibrant colors, sharp lineart, cinematic shading, expressive eyes, masterpiece quality, stunning visual, detailed background, professional art style",
  },
  {
    label: "Cyberpunk",
    icon: "⚡",
    category: "cyberpunk",
    powerPrompt:
      "neon lighting, rainy futuristic streets, high-tech mechanical details, glowing accents, cinematic atmosphere, sharp focus, chrome textures, deep shadows, urban dystopia",
  },
  {
    label: "Dark Fantasy",
    icon: "🌑",
    category: "darkfantasy",
    powerPrompt:
      "gothic architecture, eerie atmosphere, dramatic shadows, mystical energy, intricate armor, medieval aesthetic, misty landscape, ancient ruins, dark color palette",
  },
  {
    label: "Space/Sci-Fi",
    icon: "🚀",
    category: "scifi",
    powerPrompt:
      "interstellar nebula, cosmic dust, futuristic spacecraft, planetary rings, volumetric lighting, epic scale, high-tech interior, cold aesthetic, astronomical details",
  },
] as const;

type EliteStyle = typeof ELITE_STYLES[number];

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
      };
    });

    const ANGULAR_SPEED = 0.022;
    let vortexT = 0;

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
      vortexT = isVortex
        ? Math.min(1, vortexT + 0.012)
        : Math.max(0, vortexT - 0.018);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const targetR = Math.min(canvas.width, canvas.height) * 0.24;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        const normalX = p.x + p.bspX;
        const normalY = p.y + p.bspY;

        if (vortexT > 0) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const r = Math.sqrt(dx * dx + dy * dy) || 1;
          const θ = Math.atan2(dy, dx) + ANGULAR_SPEED;
          const newR = r + (targetR - r) * 0.045;
          const vx = cx + newR * Math.cos(θ);
          const vy = cy + newR * Math.sin(θ);
          p.x = normalX * (1 - vortexT) + vx * vortexT;
          p.y = normalY * (1 - vortexT) + vy * vortexT;
        } else {
          p.x = normalX;
          p.y = normalY;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + vortexT * 0.6), 0, Math.PI * 2);
        ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, 0.9)`;
        ctx.shadowBlur = 10 + vortexT * 16;
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${Math.min(1, p.opacity + vortexT * 0.35)})`;
        ctx.fill();
      }

      if (vortexT < 0.3) {
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
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EliteStyle | null>(null);
  const [validationError, setValidationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [generateStatus, setGenerateStatus] = useState("");
  const [generateError,  setGenerateError]  = useState("");

  const vortexRef = useRef(false);

  const handleVisualize = useCallback(async () => {
    if (isGenerating) return;

    const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 2) {
      setValidationError("Elite vision requires at least 2 words. Describe your masterpiece.");
      setTimeout(() => setValidationError(""), 3000);
      return;
    }

    setValidationError("");
    setGenerateError("");
    setIsGenerating(true);
    setGeneratedImage(null);
    setPreviewMode(false);
    vortexRef.current = true;
    setGenerateStatus("Analyzing your vision...");

    const finalPrompt = selectedCategory
      ? `${selectedCategory.powerPrompt}, ${prompt.trim()}`
      : prompt.trim();

    const statusTimers = [
      setTimeout(() => setGenerateStatus("Computing elite textures..."), 3000),
      setTimeout(() => setGenerateStatus("Finalizing cinematic lighting..."), 6000),
      setTimeout(() => setGenerateStatus("REVEAL"), 9000),
    ];

    try {
      const [blob] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            category: selectedCategory?.category ?? null,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: "Generation failed." }));
            if (res.status === 401) { window.location.href = "/api/steam/login"; throw new Error(""); }
            if (res.status === 402) { throw new Error("Not enough tokens. You need 15 tokens to generate. Get tokens on the Pricing page."); }
            throw new Error((data as { error?: string }).error ?? "Generation failed.");
          }
          return res.blob();
        }),
        new Promise<void>((r) => setTimeout(r, 10_000)),
      ]);

      statusTimers.forEach(clearTimeout);
      const objectUrl = URL.createObjectURL(blob as Blob);
      vortexRef.current = false;
      setGeneratedImage(objectUrl);
      setGenerateStatus("REVEAL");
      setIsGenerating(false);
      setIsModalOpen(true);
      setPrompt("");
      setSelectedCategory(null);
    } catch (err) {
      statusTimers.forEach(clearTimeout);
      vortexRef.current = false;
      setIsGenerating(false);
      setGenerateStatus("");
      const msg = err instanceof Error ? err.message : "Generation failed. Please try again.";
      if (msg) setGenerateError(msg);
    }
  }, [prompt, selectedCategory, isGenerating]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setPreviewMode(true);
  }, []);

  const handleDownloadAndEdit = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = "vibeprofileit_ai";
    link.click();
    sessionStorage.setItem("studio_generated_image", generatedImage);
    window.open("/design-studio?source=ai-studio", "_blank");
  }, [generatedImage]);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#050505" }}>
      <Header />
      <CrimsonVoidBackground vortexRef={vortexRef} />

      {/* Generation status overlay — visible only during generation */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            key="status-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 5,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={generateStatus}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    fontSize: generateStatus === "REVEAL" ? 52 : 20,
                    fontWeight: 700,
                    color: generateStatus === "REVEAL" ? "#f87171" : "rgba(220,130,80,0.90)",
                    letterSpacing: generateStatus === "REVEAL" ? "0.5em" : "0.08em",
                    textShadow: "none",
                    textAlign: "center",
                    paddingLeft: generateStatus === "REVEAL" ? "0.5em" : 0,
                  }}
                >
                  {generateStatus}
                </motion.p>
              </AnimatePresence>
              {generateStatus !== "REVEAL" && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", textAlign: "center" }}>
                  Do not close or navigate away — your token is being used
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            position: "relative",
          }}
        >
          {/* Login overlay — shown when not authenticated */}
          {!session?.user && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10,
              borderRadius: 20,
              background: "rgba(5,0,0,0.88)",
              backdropFilter: "blur(10px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
            }}>
              <p style={{ color: "rgba(220,130,80,0.7)", fontSize: 13, letterSpacing: "0.08em", textAlign: "center" }}>
                Login to access the AI Studio
              </p>
              <button
                onClick={() => { window.location.href = "/api/steam/login"; }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 28px", borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  letterSpacing: "0.5px", cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.22s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
                </svg>
                Login with Steam
              </button>
            </div>
          )}
          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vision..."
            rows={3}
            disabled={isGenerating}
            onFocus={(e) => { e.target.style.borderColor = "rgba(220,38,38,0.55)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(220,38,38,0.20)"; }}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${validationError ? "rgba(220,38,38,0.70)" : "rgba(220,38,38,0.20)"}`,
              borderRadius: 12, padding: "15px 16px",
              color: "#fff", fontSize: 15, resize: "none",
              outline: "none", fontFamily: "inherit",
              lineHeight: 1.65, marginBottom: validationError ? 8 : 24,
              transition: "border-color 0.25s",
              opacity: isGenerating ? 0.5 : 1,
              cursor: isGenerating ? "not-allowed" : "text",
            }}
          />

          {/* Validation error */}
          <AnimatePresence>
            {validationError && (
              <motion.p
                key="val-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  fontSize: 12, color: "#f87171",
                  marginBottom: 16, paddingLeft: 4,
                  letterSpacing: "0.02em",
                }}
              >
                {validationError}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Related Vibes — The Elite 4 */}
          <div style={{ marginBottom: 35 }}>
            <div style={{
              fontSize: 10, color: "rgba(220,100,60,0.60)",
              letterSpacing: "2.5px", textTransform: "uppercase",
              fontFamily: "monospace", marginBottom: 11,
            }}>
              Related Vibes
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ELITE_STYLES.map((s) => {
                const active = selectedCategory?.category === s.category;
                return (
                  <button
                    key={s.category}
                    disabled={isGenerating}
                    onClick={() => setSelectedCategory((p) => p?.category === s.category ? null : s)}
                    style={{
                      padding: "7px 18px", borderRadius: 20, cursor: isGenerating ? "not-allowed" : "pointer",
                      border: active
                        ? "1px solid rgba(220,38,38,0.75)"
                        : "1px solid rgba(220,38,38,0.20)",
                      background: active
                        ? "rgba(160,25,25,0.38)"
                        : "rgba(255,255,255,0.02)",
                      color: active ? "#fca5a5" : "rgba(220,130,80,0.65)",
                      fontSize: 13, fontFamily: "inherit",
                      boxShadow: active
                        ? "0 0 18px rgba(220,38,38,0.35), 0 0 36px rgba(220,38,38,0.12)"
                        : "none",
                      transform: active ? "scale(1.05)" : "scale(1)",
                      opacity: isGenerating ? 0.4 : active ? 1 : 0.6,
                      transition: "all 0.2s ease",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      if (!active && !isGenerating) e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      if (!active && !isGenerating) e.currentTarget.style.opacity = "0.6";
                    }}
                  >
                    <span>{s.icon}</span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visualize button */}
          <button
            onClick={handleVisualize}
            disabled={isGenerating}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 12,
              border: "1px solid rgba(220,38,38,0.40)",
              background: isGenerating ? "rgba(80,10,10,0.20)" : "rgba(160,20,20,0.40)",
              color: isGenerating ? "rgba(220,130,80,0.40)" : "#fecaca",
              fontSize: 15, fontWeight: 700, letterSpacing: "1.5px",
              textTransform: "uppercase",
              cursor: isGenerating ? "not-allowed" : "pointer",
              boxShadow: isGenerating ? "none" : "0 0 0 rgba(220,38,38,0)",
              transition: "all 0.28s", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
            onMouseEnter={(e) => {
              if (!isGenerating) e.currentTarget.style.boxShadow = "0 0 20px rgba(220,38,38,0.40)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {isGenerating ? (
              <>
                <SpinIcon />
                Generating...
              </>
            ) : (
              "Visualize for 15 Tokens"
            )}
          </button>

          {generateError && (
            <p style={{
              marginTop: 14, fontSize: 13, color: "#f87171",
              textAlign: "center", letterSpacing: "0.02em",
            }}>
              {generateError}
            </p>
          )}
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
                  style={{ width: "100%", display: "block", aspectRatio: "9/16", objectFit: "cover" }}
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
                  aspectRatio: "9/16",
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
