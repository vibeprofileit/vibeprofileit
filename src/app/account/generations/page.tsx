"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, Clock, Sparkles, X, ZapOff, Wand2 } from "lucide-react";
import Footer from "@/components/Footer";
import Link from "next/link";

async function downloadImage(url: string) {
  const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
  const blob = await res.blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `vibeprofileit_ai.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function openInDesignStudio(url: string) {
  const params = new URLSearchParams({ imageUrl: url, isPremium: "true" });
  window.open(`/design-studio?${params}`, "_blank");
}

const ORG   = "#e11d48";
const ORG_L = "#fb7185";
const ORG_A = (a: number) => `rgba(225,29,72,${a})`;

type Generation = {
  id:         string;
  r2_url:     string;
  prompt:     string | null;
  model_used: string | null;
  mime_type:  string | null;
  file_size:  number | null;
  created_at: string;
  expires_at: string;
};

function formatExpiry(expiresAt: string): { label: string; urgent: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Expired", urgent: true };
  const h = Math.floor(diff / (1000 * 60 * 60));
  if (h < 6)  return { label: `Expires in ${h}h`, urgent: true };
  if (h < 24) return { label: `Expires in ${h}h`, urgent: false };
  const d = Math.floor(h / 24);
  return { label: `Expires in ${d}d ${h % 24}h`, urgent: false };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function GenerationModal({ item, onClose }: { item: Generation; onClose: () => void }) {
  const expiry = formatExpiry(item.expires_at);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start md:items-center justify-center pt-16 px-3 pb-3 md:p-6"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="modal-scroll relative w-full md:w-[85vw] max-h-[calc(100vh-5rem)] md:max-h-[88vh] overflow-y-auto rounded-2xl flex flex-col"
          style={{
            maxWidth: "1150px", background: "#050505",
            border:     `1px solid ${ORG_A(0.35)}`,
            boxShadow:  "none",
            scrollbarWidth: "none",
          } as React.CSSProperties}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
            style={{ background: "rgba(0,0,0,0.65)", border: `1px solid ${ORG_A(0.45)}` }}
          >
            <X size={16} color="#fff" />
          </button>

          <div className="flex flex-col md:flex-row gap-6 p-6 items-stretch flex-1">
            {/* Sol: Görsel */}
            <div className="rounded-xl relative overflow-hidden isolate"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center", width: "fit-content", maxHeight: "75vh", background: "#050505", border: `1px solid ${ORG_A(0.18)}` }}>
              <img
                src={item.r2_url}
                alt="AI generation"
                className="w-auto object-contain relative z-[1]"
                style={{ maxHeight: "75vh" }}
              />
            </div>

            {/* Sağ: Sidebar */}
            <div className="flex flex-col gap-5 flex-1 min-w-0">
              {/* Brand */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(10,10,10,0.9)", border: `1px solid ${ORG_A(0.1)}` }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ORG}, ${ORG_A(0.4)})` }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="text-white font-bold text-base">AI Generation</div>
                  <div style={{ color: ORG_L }} className="text-xs mt-0.5 font-semibold uppercase tracking-wide">
                    VibeProfileit AI
                  </div>
                </div>
              </div>

              {/* Expiry */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: expiry.urgent ? "rgba(220,38,38,0.1)" : ORG_A(0.07),
                  border:     expiry.urgent ? "1px solid rgba(220,38,38,0.3)" : `1px solid ${ORG_A(0.25)}`,
                  color:      expiry.urgent ? "#f87171" : ORG_L,
                }}
              >
                <Clock size={14} />
                {expiry.label} — download before it&apos;s gone
              </div>

              {/* Metadata */}
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(10,10,10,0.8)", border: `1px solid ${ORG_A(0.15)}` }}>
                {[
                  { label: "Format",  value: item.mime_type?.split("/")[1]?.toUpperCase() ?? "—" },
                  { label: "Size",    value: item.file_size ? (item.file_size / 1024 / 1024).toFixed(1) + " MB" : "—" },
                  { label: "Created", value: new Date(item.created_at).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-white/50 text-xs font-medium uppercase tracking-wide">{label}</span>
                    <span className="text-white text-sm font-bold">{value}</span>
                  </div>
                ))}
              </div>

              {/* Download */}
              <div className="flex flex-col gap-2 mt-auto pb-6">
                <button
                  onClick={() => downloadImage(item.r2_url)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${ORG}, #f97316)`, border: `1px solid ${ORG_L}` }}
                >
                  <Download size={15} /> Download
                </button>
                <button
                  onClick={() => openInDesignStudio(item.r2_url)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-transform duration-200 hover:scale-105"
                  style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.5)", color: "#c4b5fd" }}
                >
                  <Wand2 size={15} /> Edit in Design Studio
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── GenerationCard ───────────────────────────────────────────────────────────

function GenerationCard({ item, index, onView }: { item: Generation; index: number; onView: (item: Generation) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const expiry = formatExpiry(item.expires_at);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.4, ease: "easeOut" }}
      ref={cardRef}
      className="relative rounded-xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: "9/16", width: "100%", border: `1px solid ${ORG_A(0.25)}` }}
      onPointerEnter={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${ORG_A(0.6)}`; }}
      onPointerLeave={e => { (e.currentTarget as HTMLElement).style.border = `1px solid ${ORG_A(0.25)}`; }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      onClick={() => onView(item)}
    >
      <div className="absolute inset-0" style={{ background: "#050505" }} />

      {inView && (
        <img
          src={item.r2_url}
          alt="AI generation"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Expiry badge */}
      <div
        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full z-10 pointer-events-none"
        style={{
          background:    expiry.urgent ? "rgba(220,38,38,0.85)" : "rgba(20,12,0,0.85)",
          border:        expiry.urgent ? "1px solid rgba(248,113,113,0.6)" : `1px solid ${ORG_A(0.6)}`,
          backdropFilter: "blur(4px)",
        }}
      >
        <Clock size={8} style={{ color: expiry.urgent ? "#fca5a5" : ORG_L }} />
        <span style={{ color: expiry.urgent ? "#fca5a5" : ORG_L, fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em" }}>
          {expiry.label}
        </span>
      </div>

      {/* Model badge */}
      <div className="absolute top-2 right-2 z-10 pointer-events-none">
        <span
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
          style={{ background: "rgba(20,12,0,0.85)", border: `1px solid ${ORG_A(0.5)}`, color: ORG_L }}
        >
          <Sparkles size={7} />
          AI
        </span>
      </div>

      {/* Hover overlay */}
      <AnimatePresence>
        <motion.div
          className="absolute inset-0 z-10 opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.75) 100%)" }}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none gap-2">
            <button
              onClick={e => { e.stopPropagation(); downloadImage(item.r2_url); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-white pointer-events-auto"
              style={{ fontSize: "11px", background: ORG_A(0.85), border: `1px solid ${ORG_A(0.9)}` }}
            >
              <Download size={11} /> Download
            </button>
            <button
              onClick={e => { e.stopPropagation(); openInDesignStudio(item.r2_url); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold pointer-events-auto"
              style={{ fontSize: "11px", background: "rgba(124,58,237,0.85)", border: "1px solid rgba(167,139,250,0.9)", color: "#fff" }}
            >
              <Wand2 size={11} /> Edit
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GenerationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems]       = useState<Generation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [cols, setCols]         = useState(4);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.userId) return;
    fetch("/api/account/generations")
      .then(r => r.json())
      .then(d => { setItems(d.generations ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session?.user?.userId]);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if      (w < 700)  setCols(2);
      else if (w < 1100) setCols(3);
      else if (w < 1500) setCols(4);
      else               setCols(5);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const columns: Generation[][] = Array.from({ length: cols }, () => []);
  const colHeights = new Array<number>(cols).fill(0);
  items.forEach(item => {
    const minIdx = colHeights.reduce((mi, h, i, arr) => (h < arr[mi] ? i : mi), 0);
    columns[minIdx].push(item);
    colHeights[minIdx] += (9 / 16) + 0.04;
  });

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {selected && (
        <GenerationModal item={selected} onClose={() => setSelected(null)} />
      )}

      <style>{`
        .modal-scroll::-webkit-scrollbar { display: none; }
        @keyframes skeletonPulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <Header />

      <main className="relative z-10 pt-28 pb-20 px-4 md:px-8" style={{ maxWidth: "1800px", margin: "0 auto", width: "95%" }}>

        <Link href="/" className="inline-block mb-8 text-lg font-semibold text-white hover:text-white/70 transition-colors">
          ← Back to Home
        </Link>

        {/* Başlık */}
        <div className="mb-4">
          <h1 className="text-3xl font-black tracking-tight">
            <span style={{ background: `linear-gradient(to right, ${ORG}, ${ORG_L}, #fecdd3)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              My Generations
            </span>
          </h1>
        </div>

        {/* Expiry uyarısı */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-8 text-sm"
          style={{ background: ORG_A(0.06), border: `1px solid ${ORG_A(0.2)}` }}
        >
          <Clock size={15} style={{ color: ORG, flexShrink: 0 }} />
          <p style={{ color: "rgba(255,255,255,0.5)" }}>
            AI-generated images are stored for{" "}
            <span className="font-semibold" style={{ color: ORG_L }}>48 hours</span>
            {" "}and then permanently deleted. Download anything you want to keep before it expires.
          </p>
        </div>

        {loading ? (
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, ci) => (
              <div key={ci} className="flex flex-col gap-4" style={{ flex: 1 }}>
                {[220, 280, 200, 260].map((h, i) => (
                  <div key={i} className="rounded-xl" style={{
                    height: h + (ci * 17) % 60,
                    background: `linear-gradient(90deg, ${ORG_A(0.06)} 25%, ${ORG_A(0.12)} 50%, ${ORG_A(0.06)} 75%)`,
                    backgroundSize: "200% 100%",
                    animation: "skeletonPulse 1.8s ease-in-out infinite",
                  }} />
                ))}
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <ZapOff size={48} style={{ color: ORG_A(0.3) }} />
            <p className="text-white/20 text-lg font-medium">No generations yet</p>
            <a href="/ai-studio" className="text-sm hover:opacity-80 transition-opacity" style={{ color: ORG }}>
              Go to AI Studio to generate your first image →
            </a>
          </div>
        ) : (
          <div className="flex gap-3">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-3" style={{ flex: 1 }}>
                {col.map((item, i) => (
                  <GenerationCard
                    key={item.id}
                    item={item}
                    index={ci * 5 + i}
                    onView={setSelected}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
