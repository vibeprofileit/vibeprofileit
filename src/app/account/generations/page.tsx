"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, Clock, Sparkles, X, ZapOff } from "lucide-react";

type Generation = {
  id: string;
  r2_url: string;
  prompt: string | null;
  model_used: string | null;
  mime_type: string | null;
  file_size: number | null;
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
  const rem = h % 24;
  return { label: `Expires in ${d}d ${rem}h`, urgent: false };
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── Modal ───────────────────────────────────────────────────────────────────

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col md:flex-row gap-6 p-6"
          style={{
            maxWidth: 900,
            background: "#0a0a0f",
            border: "1px solid rgba(124,58,237,0.35)",
            boxShadow: "0 0 40px rgba(124,58,237,0.15)",
            scrollbarWidth: "none",
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <X size={14} />
          </button>

          {/* Görsel */}
          <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ alignSelf: "center" }}>
            <img
              src={item.r2_url}
              alt="AI generation"
              className="w-auto object-contain rounded-xl"
              style={{ maxHeight: "75vh", maxWidth: "420px" }}
            />
          </div>

          {/* Detaylar */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#7c3aed" }}>
                AI Generation
              </p>
              <p className="text-white font-bold text-lg">
                {item.model_used === "flux" ? "Flux 1.1 Pro" : "Kolors"}
              </p>
            </div>

            {/* Expiry warning */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: expiry.urgent ? "rgba(220,38,38,0.1)" : "rgba(124,58,237,0.08)",
                border: expiry.urgent ? "1px solid rgba(220,38,38,0.3)" : "1px solid rgba(124,58,237,0.2)",
                color: expiry.urgent ? "#f87171" : "#a78bfa",
              }}
            >
              <Clock size={14} />
              {expiry.label} — download before it&apos;s gone
            </div>

            {/* Metadata */}
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                { label: "Size", value: formatBytes(item.file_size) },
                { label: "Format", value: item.mime_type?.split("/")[1]?.toUpperCase() ?? "—" },
                { label: "Created", value: new Date(item.created_at).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-white/40 uppercase tracking-wide font-medium">{label}</span>
                  <span className="text-sm text-white font-semibold">{value}</span>
                </div>
              ))}
            </div>

            {/* Prompt */}
            {item.prompt && (
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-white/30 uppercase tracking-wide font-medium mb-2">Prompt</p>
                <p className="text-sm text-white/60 leading-relaxed line-clamp-4">{item.prompt}</p>
              </div>
            )}

            {/* Download */}
            <a
              href={item.r2_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-transform duration-200 hover:scale-105"
              style={{ background: "linear-gradient(to right, #7c3aed, #a855f7)" }}
            >
              <Download size={15} /> Download Image
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

function GenerationCard({ item, index, onView }: { item: Generation; index: number; onView: () => void }) {
  const expiry = formatExpiry(item.expires_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.4 }}
      className="relative rounded-xl overflow-hidden cursor-pointer group"
      style={{ aspectRatio: "9/16", border: "1px solid rgba(124,58,237,0.2)" }}
      onClick={onView}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <img
        src={item.r2_url}
        alt="AI generation"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Expiry badge */}
      <div
        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold z-10"
        style={{
          background: expiry.urgent ? "rgba(220,38,38,0.85)" : "rgba(10,10,15,0.85)",
          border: expiry.urgent ? "1px solid rgba(248,113,113,0.6)" : "1px solid rgba(124,58,237,0.4)",
          color: expiry.urgent ? "#fca5a5" : "#a78bfa",
          backdropFilter: "blur(4px)",
        }}
      >
        <Clock size={8} />
        {expiry.label}
      </div>

      {/* Model badge */}
      <div
        className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black z-10 uppercase"
        style={{ background: "rgba(10,10,15,0.85)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", backdropFilter: "blur(4px)" }}
      >
        {item.model_used === "flux" ? "FLUX" : "KOLORS"}
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 z-10 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)" }}
      >
        <a
          href={item.r2_url}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
          style={{ background: "rgba(124,58,237,0.85)", border: "1px solid rgba(168,85,247,0.5)" }}
        >
          <Download size={11} /> Download
        </a>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
  items.forEach((item, i) => columns[i % cols].push(item));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {selected && <GenerationModal item={selected} onClose={() => setSelected(null)} />}

      <Header />

      <main className="pt-28 pb-20 px-4 md:px-8" style={{ maxWidth: "1800px", margin: "0 auto", width: "95%" }}>

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-black tracking-tight">
            <span style={{ background: "linear-gradient(to right,#7c3aed,#a855f7,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              My Generations
            </span>
          </h1>
        </div>

        {/* Notice banner */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl mb-8 text-sm"
          style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <Clock size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />
          <p style={{ color: "rgba(255,255,255,0.5)" }}>
            AI-generated images are stored for{" "}
            <span className="font-semibold text-white/80">48 hours</span> and then permanently deleted.
            Download anything you want to keep before it expires.
          </p>
        </div>

        {loading ? (
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, ci) => (
              <div key={ci} className="flex flex-col gap-4" style={{ flex: 1 }}>
                {[300, 380, 280, 340].map((h, i) => (
                  <div key={i} className="rounded-xl" style={{
                    height: h + (ci * 20) % 60,
                    background: "rgba(124,58,237,0.06)",
                    border: "1px solid rgba(124,58,237,0.1)",
                    animation: "pulse 2s ease-in-out infinite",
                  }} />
                ))}
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <ZapOff size={48} style={{ color: "rgba(124,58,237,0.3)" }} />
            <p className="text-white/20 text-lg font-medium">No generations yet</p>
            <a href="/ai-studio" className="text-sm hover:opacity-80 transition-opacity" style={{ color: "#a78bfa" }}>
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
                    onView={() => setSelected(item)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
