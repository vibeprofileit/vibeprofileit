"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Header from "@/components/Header";
import ProtectedImage from "@/components/ui/ProtectedImage";
import { useRouter } from "next/navigation";
import { Search, ExternalLink, ChevronDown, Pencil, Eye, X, Download, Heart, Lock } from "lucide-react";

const CHUNK_SIZE = 24;

const CATEGORIES = [
  "All","Anime", "Artist", "Cars", "Cartoon", "City", "Fantasy", "Gaming",
  "Marvel", "Movie", "Nature", "Samurai", "Art", "Real", "Neon", "Animated", "Static", "Premium",
];

type GalleryItem = {
  id: string;
  src: string;
  coverUrl: string | null;
  theme: string;
  color: string;
  style: string;
  width: number;
  height: number;
  format: string;
  sizeMB: string;
  realViews: number;
  realLikes: number;
  isAnimated: boolean;
  isAdult: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  createdAt: string;
};

function hashCode(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}


// ─── ImageModal ────────────────────────────────────────────────────────────────

function ImageModal({
  item,
  onClose,
  allItems,
  onSelect,
}: {
  item: GalleryItem;
  onClose: () => void;
  allItems: GalleryItem[];
  onSelect: (item: GalleryItem) => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.history.pushState(null, "", `/gallery?id=${item.id}`);
    document.dispatchEvent(new CustomEvent("vp-modal-open"));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.history.pushState(null, "", "/gallery");
      document.dispatchEvent(new CustomEvent("vp-modal-close"));
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, item.id]);

  const seenIds = new Set<string>();
  const related = [...allItems]
    .filter((m) => m.id !== item.id && (m.theme === item.theme || m.style === item.style))
    .sort(() => 0.5 - Math.random())
    .filter((m) => { if (seenIds.has(m.id)) return false; seenIds.add(m.id); return true; })
    .slice(0, 4);

  const hash = hashCode(item.id);
  const totalViews = (hash * 1247) % 9000 + 500 + (item.realViews || 0);
  const totalLikes = (hash * 83)   % 900  + 50  + (item.realLikes || 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="modal-scroll relative w-[85vw] max-h-[88vh] overflow-y-auto rounded-2xl flex flex-col"
          style={{
            maxWidth: "1150px",
            minHeight: "750px",
            background: "#050505",
            border: "1px solid rgba(188,19,254,0.35)",
            boxShadow: "0 0 0 1px rgba(188,19,254,0.45), 0 0 30px rgba(188,19,254,0.18)",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          } as React.CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
            style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(188,19,254,0.45)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background  = "rgba(188,19,254,0.22)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow   = "0 0 14px rgba(188,19,254,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background  = "rgba(0,0,0,0.65)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow   = "none";
            }}
          >
            <X size={16} color="#fff" />
          </button>

          <div className="flex flex-col md:flex-row gap-6 p-6 items-stretch flex-1">
            {/* Sol: Görsel */}
            <div
              className="rounded-xl relative overflow-hidden isolate"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                alignSelf: "center",
                width: "fit-content",
                maxHeight: "75vh",
                background: "#050505",
                border: "1px solid rgba(188,19,254,0.18)",
              }}
            >
              {item.src ? (
                <ProtectedImage
                  src={item.src}
                  alt={item.theme}
                  className="w-auto object-contain relative z-[1]"
                  style={{ maxHeight: "75vh", imageRendering: "-webkit-optimize-contrast" }}
                />
              ) : (
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "linear-gradient(rgba(188,19,254,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(188,19,254,0.4) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
              )}
              <div className="absolute pointer-events-none z-10" style={{ inset: "8px", border: "1px solid rgba(188,19,254,0.18)", borderRadius: "10px" }} />
              <div className="absolute top-4 left-4 w-7 h-7 pointer-events-none z-10"
                style={{ borderTop: "2px solid rgba(188,19,254,0.7)", borderLeft: "2px solid rgba(188,19,254,0.7)", borderRadius: "3px 0 0 0" }} />
              <div className="absolute bottom-4 right-4 w-7 h-7 pointer-events-none z-10"
                style={{ borderBottom: "2px solid rgba(188,19,254,0.7)", borderRight: "2px solid rgba(188,19,254,0.7)", borderRadius: "0 0 3px 0" }} />
            </div>

            {/* Sağ: Sidebar */}
            <div className="flex flex-col gap-5 flex-1 min-w-0">
              {/* Sanatçı kartı */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(10,10,10,0.9)", border: "1px solid rgba(188,19,254,0.1)" }}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(188,19,254,1), rgba(188,19,254,0.4))", boxShadow: "0 0 20px rgba(188,19,254,0.8), 0 0 40px rgba(188,19,254,0.3)" }}
                >
                  V
                </div>
                <div className="min-w-0">
                  <div className="text-white font-bold text-base leading-tight truncate">VibeProfileit</div>
                  <div className="text-white/50 text-xs mt-0.5">Elite Selection</div>
                </div>
              </div>

              {/* Smart Stats */}
              <div className="flex gap-3">
                {[
                  { icon: <Eye size={18} style={{ color: "#fff" }} />,   val: totalViews, label: "Views", glow: "rgba(188,19,254,0.7)" },
                  { icon: <Heart size={18} style={{ color: "#fff" }} />, val: totalLikes, label: "Likes", glow: "rgba(255,77,141,0.6)"  },
                ].map(({ icon, val, label, glow }) => (
                  <div key={label} className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl gap-1" style={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(188,19,254,0.2)" }}>
                    {icon}
                    <div className="font-bold text-xl leading-tight" style={{ color: "#fff", textShadow: `0 0 10px ${glow}` }}>{val}</div>
                    <div className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">{label}</div>
                  </div>
                ))}
              </div>

              {/* Metadata */}
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(188,19,254,0.15)" }}>
                {[
                  { label: "Resolution", value: `${item.width}×${item.height}` },
                  { label: "Format",     value: item.format                    },
                  { label: "Size",       value: `${item.sizeMB} MB`            },
                ].map((meta) => (
                  <div key={meta.label} className="flex items-center justify-between">
                    <span className="text-white/50 text-xs font-medium uppercase tracking-wide">{meta.label}</span>
                    <span className="text-white text-sm font-bold">{meta.value}</span>
                  </div>
                ))}
              </div>

              <div className="h-[180px]" />

              {/* Butonlar */}
              <div className="flex flex-col gap-2 mt-[220px] pb-6">
                <Link
                  href={`/design-studio?id=${item.id}&template=featured&imageUrl=${encodeURIComponent(item.src)}${item.isPremium ? "&isPremium=true" : ""}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, rgba(188,19,254,0.85), rgba(120,0,200,0.6))", border: "1px solid rgba(188,19,254,1)", transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
                >
                  <Download size={15} /> Customize & Download
                </Link>
                <button
                  className="flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-medium transition-all duration-200"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#00ff88"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,255,136,0.4)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(0,255,136,0.15)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
                >
                  <Heart size={13} /> Like
                </button>
              </div>
            </div>
          </div>

          {/* Stacking context ayıracı — main content ile related arasında z-sınırı */}
          <div className="relative z-[70]" style={{ height: 0, pointerEvents: "none" }} />

          {/* Related Vibes */}
          {related.length > 0 && (
            <div className="relative z-[70] px-6 py-5 mt-auto" style={{ borderTop: "1px solid rgba(188,19,254,0.15)", background: "rgba(5,5,5,0.8)" }}>
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4 pl-1">Related Vibes</h3>
              <div className="grid grid-cols-4 gap-3 isolate pointer-events-auto" style={{ paddingBottom: "8px", overflow: "visible" }}>
                {Array.from(new Map(related.map((r) => [r.id, r])).values()).map((rel) => (
                  <RelatedVibeCard key={rel.id} rel={rel} onSelect={onSelect} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── SortDropdown ──────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "random",     label: "Random"     },
  { value: "newest",     label: "Newest"     },
  { value: "most_liked", label: "Most Liked" },
  { value: "highlights", label: "Highlights" },
];

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((o) => o.value === value)!;

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-white whitespace-nowrap"
        style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #BC13FE", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      >
        <span className="text-[#BC13FE] font-semibold text-xs uppercase tracking-wider">Sort:</span>
        {current.label}
        <ChevronDown size={13} className="transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "#BC13FE" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 rounded-xl overflow-hidden z-50"
            style={{ background: "rgba(8,0,20,0.95)", border: "1px solid rgba(188,19,254,0.5)", boxShadow: "0 0 30px rgba(188,19,254,0.25), 0 8px 32px rgba(0,0,0,0.6)", backdropFilter: "blur(16px)" }}
          >
            {SORT_OPTIONS.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-white transition-all duration-150"
                  style={{ background: active ? "rgba(188,19,254,0.2)" : "transparent", borderLeft: active ? "2px solid #BC13FE" : "2px solid transparent" }}
                  onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(188,19,254,0.1)"; (e.currentTarget as HTMLButtonElement).style.borderLeft = "2px solid rgba(188,19,254,0.4)"; } }}
                  onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderLeft = "2px solid transparent"; } }}
                >
                  {opt.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PremiumPlaceholder ────────────────────────────────────────────────────────

function PremiumPlaceholder() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#0a0014 0%,#1a0035 50%,#050505 100%)", animation: "premiumPulse 2s ease-in-out infinite" }}
    >
      <span style={{ color: "rgba(188,19,254,0.5)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading...</span>
    </div>
  );
}

// ─── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard({ height }: { height: number }) {
  return (
    <div className="rounded-xl overflow-hidden w-full" style={{ height }}>
      <div
        className="w-full h-full rounded-xl"
        style={{
          background: "linear-gradient(90deg, rgba(46,16,101,0.3) 25%, rgba(188,19,254,0.15) 50%, rgba(46,16,101,0.3) 75%)",
          backgroundSize: "200% 100%",
          animation: "skeletonPulse 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ─── RelatedVibeCard ───────────────────────────────────────────────────────────

function RelatedVibeCard({ rel, onSelect }: { rel: GalleryItem; onSelect: (item: GalleryItem) => void }) {
  const [hov, setHov] = useState(false);
  const [stHov, setStHov] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);

  useEffect(() => {
    if (rel.isAnimated && rel.src) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = rel.src;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = rel.width || img.width;
          canvas.height = rel.height || img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setThumbnailLoaded(true);
          }
        }
      };
    }
  }, [rel.isAnimated, rel.src, rel.width, rel.height]);

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer pointer-events-auto"
      style={{ aspectRatio: "9/14", background: "#050505", border: "1px solid rgba(188,19,254,0.25)", willChange: "transform" }}
      onClick={(e) => { e.stopPropagation(); if (!rel.isAdult) onSelect(rel); }}
      onMouseEnter={() => { if (!rel.isAdult) setHov(true); }}
      onMouseLeave={() => { if (!rel.isAdult) { setHov(false); setStHov(false); } }}
    >
      {/* Adult: kırmızı pulse çerçeve */}
      {rel.isAdult && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-[25]" style={{ animation: "adultGlow 2.8s ease-in-out infinite" }} />
      )}

      {/* Görsel katmanı */}
      {rel.isAdult ? (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%)" }} />
      ) : !rel.src ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#0a0014 0%,#1a0035 50%,#050505 100%)", animation: "premiumPulse 2s ease-in-out infinite" }}
        >
          <span style={{ color: "rgba(188,19,254,0.45)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading</span>
        </div>
      ) : rel.isAnimated ? (
        <>
          {!thumbnailLoaded && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#0a0014 0%,#1a0035 50%,#050505 100%)", animation: "premiumPulse 2s ease-in-out infinite" }}
            >
              <span style={{ color: "rgba(188,19,254,0.45)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover", opacity: thumbnailLoaded ? 1 : 0, transition: "opacity 0.35s", imageRendering: "-webkit-optimize-contrast" }}
          />
          {hov && (
            <img
              src={rel.src}
              alt={rel.theme}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.8)" }}
            />
          )}
        </>
      ) : (
        <img
          src={rel.src}
          alt={rel.theme}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: hov ? "brightness(0.8)" : "none", transition: "filter 0.2s ease" }}
        />
      )}

      {/* LIVE rozeti */}
      {rel.isAnimated && !rel.isAdult && (
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full z-10 pointer-events-none"
          style={{ background: "rgba(8,0,20,0.85)", border: "1px solid rgba(188,19,254,0.7)", boxShadow: "0 0 8px rgba(188,19,254,0.45)" }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#BC13FE", boxShadow: "0 0 5px #BC13FE", display: "inline-block" }} />
          <span style={{ color: "#BC13FE", fontSize: "8px", fontWeight: 800, letterSpacing: "0.12em" }}>LIVE</span>
        </div>
      )}

      {/* Hover butonları */}
      {hov && !rel.isAdult && (
        <>
          <Link
            href={`/design-studio?id=${rel.id}&template=featured&imageUrl=${encodeURIComponent(rel.src)}${rel.isPremium ? "&isPremium=true" : ""}`}
            target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-1.5 right-1.5 flex items-center gap-1 px-3 py-1.5 rounded-lg z-20"
            style={{
              background: "transparent", border: "1.5px solid #ff1cd3",
              boxShadow: stHov ? "0 0 10px rgba(188,19,254,0.55)" : "0 0 5px rgba(188,19,254,0.25)",
              transform: stHov ? "scale(1.06)" : "scale(1)", transition: "all 0.2s ease",
            }}
            onMouseEnter={() => setStHov(true)}
            onMouseLeave={() => setStHov(false)}
          >
            <Pencil size={10} color="#fff" />
            <span style={{ color: "#fff", fontSize: "10px", fontWeight: 700 }}>View in Studio</span>
          </Link>
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(rel); }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white font-semibold pointer-events-auto"
              style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(188,19,254,0.7)", fontSize: "11px", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 14px rgba(188,19,254,0.65)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
            >
              <Eye size={11} /> View
            </button>
          </div>
        </>
      )}

      {/* Adult overlay */}
      {rel.isAdult && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
          style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", background: "rgba(0,0,0,0.65)" }}
        >
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest text-center px-2">18+ Content</span>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(rel); }}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all duration-200"
            style={{ background: "rgba(220,38,38,0.8)", border: "1px solid rgba(220,38,38,0.9)", cursor: "pointer", pointerEvents: "auto" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 14px rgba(220,38,38,0.6)"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.8)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            Yes
          </button>
        </div>
      )}

      {/* Theme + Color etiketleri — absolute overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex gap-1 px-1.5 py-1.5 flex-wrap z-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
        <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ fontSize: "8px", background: "rgba(46,16,101,0.75)", border: "1px solid rgba(188,19,254,0.3)", color: "rgba(221,180,255,0.9)" }}>
          {rel.theme}
        </span>
        {rel.color && (
          <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ fontSize: "8px", background: "rgba(46,16,101,0.75)", border: "1px solid rgba(188,19,254,0.3)", color: "rgba(221,180,255,0.9)" }}>
            {rel.color}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── GalleryCard ───────────────────────────────────────────────────────────────

function GalleryCard({
  item,
  index,
  onView,
}: {
  item: GalleryItem;
  index: number;
  onView: (item: GalleryItem) => void;
}) {
  const router = useRouter();
  const [hovered,       setHovered]       = useState(false);
  const [studioHovered, setStudioHovered] = useState(false);
  const [viewHovered,   setViewHovered]   = useState(false);
  const cardRef    = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [inView,         setInView]         = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [canvasFailed,   setCanvasFailed]   = useState(false);
  const [imageError,     setImageError]     = useState(false);

  const aspectRatio = item.width > 0 && item.height > 0 ? `${item.width}/${item.height}` : "9/16";

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

  useEffect(() => {
    if (!inView || !item.isAnimated || !item.src || thumbnailLoaded || canvasFailed) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth === 0) { setCanvasFailed(true); return; }
      const canvas = canvasRef.current;
      if (!canvas) { setCanvasFailed(true); return; }
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setCanvasFailed(true); return; }
      try {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0);
        setThumbnailLoaded(true);
      } catch {
        setCanvasFailed(true);
      }
    };
    img.onerror = () => { if (!cancelled) setCanvasFailed(true); };
    img.src = item.src;
    return () => { cancelled = true; };
  }, [inView, item.isAnimated, item.src, thumbnailLoaded, canvasFailed]);

  // Premium statik görseller canvas'a çizilir — okuma modu <img> tag'ı göremez
  useEffect(() => {
    if (!inView || !item.isPremium || item.isAnimated || !item.src || thumbnailLoaded || canvasFailed) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth === 0) { setCanvasFailed(true); return; }
      const canvas = canvasRef.current;
      if (!canvas) { setCanvasFailed(true); return; }
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setCanvasFailed(true); return; }
      try {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0);
        setThumbnailLoaded(true);
      } catch {
        setCanvasFailed(true);
      }
    };
    img.onerror = () => { if (!cancelled) setCanvasFailed(true); };
    img.src = item.src;
    return () => { cancelled = true; };
  }, [inView, item.isPremium, item.isAnimated, item.src, thumbnailLoaded, canvasFailed]);

  // coverUrl olan kartlarda src hover beklenmeden kontrol edilir;
  // dosya silinmişse kart hover'a gerek kalmadan anında gizlenir
  useEffect(() => {
    if (!inView || !item.coverUrl || !item.src) return;
    let cancelled = false;
    const probe = new Image();
    probe.onerror = () => { if (!cancelled) setImageError(true); };
    probe.src = item.src;
    return () => { cancelled = true; };
  }, [inView, item.coverUrl, item.src]);

  if (imageError) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.6), duration: 0.4, ease: "easeOut" }}
      ref={cardRef}
      className="relative rounded-xl overflow-hidden cursor-pointer"
      style={{ aspectRatio, width: "100%", minHeight: "100px", border: "1px solid rgba(188,19,254,0.2)", willChange: "transform", contain: "layout style paint" }}
      onMouseEnter={() => { if (!item.isAdult) setHovered(true); }}
      onMouseLeave={() => { if (!item.isAdult) { setHovered(false); setStudioHovered(false); setViewHovered(false); } }}
      whileHover={!item.isAdult ? { scale: 1.02, transition: { duration: 0.2 } } : {}}
      onClick={() => {
        if (item.isAdult) return;
        if (item.isPremium) { router.push("/pricing"); return; }
        onView(item);
      }}
    >
      {/* Base bg */}
      <div className="absolute inset-0" style={{ background: "#050505" }} />

      {/* Adult: kırmızı pulse çerçeve */}
      {item.isAdult && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-[25]" style={{ animation: "adultGlow 2.8s ease-in-out infinite" }} />
      )}

      {/* Görsel katmanı */}
      {item.isAdult ? (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%)" }} />
      ) : item.isAnimated ? (
        <>
          {/* coverUrl varsa server-side WebP kapak, yoksa canvas fallback */}
          {item.coverUrl ? (
            !hovered && (
              <img
                src={item.coverUrl}
                alt={item.theme}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
                onError={() => setImageError(true)}
              />
            )
          ) : (
            <>
              {!inView && <PremiumPlaceholder />}

              {inView && (
                <>
                  {!thumbnailLoaded && !canvasFailed && <PremiumPlaceholder />}
                  {canvasFailed ? (
                    !hovered && (
                      <img
                        src={item.src}
                        alt={item.theme}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
                        onError={() => setImageError(true)}
                      />
                    )
                  ) : (
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full"
                      style={{ objectFit: "cover", opacity: thumbnailLoaded ? 1 : 0, transition: "opacity 0.35s", transform: "translateZ(0)", backfaceVisibility: "hidden" }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {hovered && inView && (
            <img
              src={item.src}
              alt={item.theme}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.8)", transform: "translateZ(0)", backfaceVisibility: "hidden" }}
              onError={() => setImageError(true)}
            />
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(8,0,20,0.85)", border: "1px solid rgba(188,19,254,0.7)", boxShadow: "0 0 8px rgba(188,19,254,0.45)" }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#BC13FE", boxShadow: "0 0 5px #BC13FE", display: "inline-block" }} />
              <span style={{ color: "#BC13FE", fontSize: "8px", fontWeight: 800, letterSpacing: "0.12em" }}>LIVE</span>
            </div>
            {item.isPremium && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(20,15,0,0.9)", border: "1px solid rgba(255,215,0,0.8)", boxShadow: "0 0 8px rgba(255,215,0,0.5)" }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FFD700", boxShadow: "0 0 5px #FFD700", display: "inline-block" }} />
                <span style={{ color: "#FFD700", fontSize: "8px", fontWeight: 800, letterSpacing: "0.12em" }}>PREMIUM</span>
              </div>
            )}
          </div>
        </>
      ) : item.isPremium ? (
        <>
          {(!inView || (!thumbnailLoaded && !canvasFailed)) && <PremiumPlaceholder />}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover", opacity: thumbnailLoaded ? 1 : 0, transition: "opacity 0.35s", transform: "translateZ(0)" }}
          />
        </>
      ) : item.src ? (
        <ProtectedImage
          src={item.src}
          alt={item.theme}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <PremiumPlaceholder />
      )}

      {/* PREMIUM badge — statik kartlar için (animated zaten yukarıda gösteriyor) */}
      {item.isPremium && !item.isAnimated && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full z-10 pointer-events-none"
          style={{ background: "rgba(20,15,0,0.9)", border: "1px solid rgba(255,215,0,0.8)", boxShadow: "0 0 8px rgba(255,215,0,0.5)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FFD700", boxShadow: "0 0 5px #FFD700", display: "inline-block" }} />
          <span style={{ color: "#FFD700", fontSize: "8px", fontWeight: 800, letterSpacing: "0.12em" }}>PREMIUM</span>
        </div>
      )}

      {/* Hover overlay */}
      <AnimatePresence>
        {hovered && !item.isAdult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute z-10"
            style={{
              top: 0, left: 0, right: 0, bottom: 0,
              width: "100%", height: "100%",
              borderRadius: "inherit",
              overflow: "hidden",
              background: item.isPremium
                ? "rgba(0,0,0,0.92)"
                : "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.7) 100%)",
            }}
          >
            {item.isPremium ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <Lock size={22} color="rgba(255,215,0,0.9)" strokeWidth={2.5} />
                <span style={{ color: "rgba(255,215,0,0.95)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textAlign: "center" }}>
                  Buy for 10 Tokens
                </span>
              </div>
            ) : (
              <>
                <Link
                  href={`/design-studio?id=${item.id}&template=featured&imageUrl=${encodeURIComponent(item.src)}${item.isPremium ? "&isPremium=true" : ""}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1 px-3 py-1.5 rounded-xl"
                  style={{
                    background: "transparent", border: "2px solid #ff1cd3", zIndex: 20, position: "absolute",
                    boxShadow: studioHovered ? "0 0 15px rgba(188,19,254,0.5)" : "0 0 8px rgba(188,19,254,0.3)",
                    transform: studioHovered ? "scale(1.05)" : "scale(1)", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={() => setStudioHovered(true)}
                  onMouseLeave={() => setStudioHovered(false)}
                >
                  <Pencil size={12} color="#fff" />
                  <span className="text-white font-semibold" style={{ fontSize: "11px" }}>View in Studio</span>
                  <ExternalLink size={10} color="#fff" />
                </Link>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={(e) => { e.stopPropagation(); onView(item); }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-white pointer-events-auto"
                    style={{
                      fontSize: "12px",
                      background: "rgba(0,0,0,0.55)", border: "1px solid rgba(188,19,254,0.7)",
                      transform: viewHovered ? "scale(1.08)" : "scale(1)",
                      boxShadow: viewHovered ? "0 0 18px rgba(188,19,254,0.65)" : "none",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={() => setViewHovered(true)}
                    onMouseLeave={() => setViewHovered(false)}
                  >
                    <Eye size={12} /> View
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme + Color çift etiket */}
      <div className="absolute bottom-2 left-2 flex gap-1 z-10 pointer-events-none flex-wrap">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-200"
          style={{ background: "rgba(46,16,101,0.7)", border: "1px solid rgba(188,19,254,0.25)" }}>
          {item.theme}
        </span>
        {item.color && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-200"
            style={{ background: "rgba(46,16,101,0.7)", border: "1px solid rgba(188,19,254,0.25)" }}>
            {item.color}
          </span>
        )}
      </div>

      {/* Adult overlay */}
      {item.isAdult && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
          style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", background: "rgba(0,0,0,0.65)" }}
        >
          <span className="text-white/80 text-[11px] font-bold uppercase tracking-widest text-center px-2">18+ Content</span>
          <button
            onClick={(e) => { e.stopPropagation(); onView(item); }}
            className="px-5 py-1.5 rounded-full text-xs font-bold text-white transition-all duration-200"
            style={{ background: "rgba(220,38,38,0.8)", border: "1px solid rgba(220,38,38,0.9)", cursor: "pointer", pointerEvents: "auto" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 14px rgba(220,38,38,0.6)"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.8)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            Yes
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── GalleryPage ───────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const [search,         setSearch]         = useState("");
  const [debouncedSearch,setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory]  = useState("");
  const [sortBy,         setSortBy]          = useState("random");
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(true);
  const [cols,          setCols]          = useState(4);
  const [selectedItem,  setSelectedItem]  = useState<GalleryItem | null>(null);
  const [items,         setItems]         = useState<GalleryItem[]>([]);

  const loadingMoreRef  = useRef(false);
  const hasMoreRef      = useRef(true);
  const offsetRef       = useRef(0);
  const sentinelRef     = useRef<HTMLDivElement>(null);
  const seedRef         = useRef(Math.floor(Math.random() * 1_000_000));
  const categoryRef     = useRef("");
  const searchRef       = useRef("");

  // Arama 400ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const buildParams = useCallback((offset: number) => {
    const p = new URLSearchParams({ limit: String(CHUNK_SIZE), offset: String(offset), seed: String(seedRef.current) });
    if (categoryRef.current) p.set("category", categoryRef.current);
    if (searchRef.current)   p.set("search",   searchRef.current);
    return p.toString();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const r    = await fetch(`/api/gallery?${buildParams(offsetRef.current)}`);
      const data = await r.json() as { items: GalleryItem[]; hasMore: boolean };
      const fetched = data.items ?? [];
      setItems((prev) => [...prev, ...fetched]);
      hasMoreRef.current = data.hasMore ?? false;
      offsetRef.current += fetched.length;
      setHasMore(data.hasMore ?? false);
    } catch { } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [buildParams]);

  // Kategori veya arama değişince sıfırla + yeniden çek
  useEffect(() => {
    categoryRef.current    = activeCategory;
    searchRef.current      = debouncedSearch;
    offsetRef.current      = 0;
    hasMoreRef.current     = true;
    loadingMoreRef.current = false;
    setItems([]);
    setHasMore(true);
    setLoading(true);

    const controller = new AbortController();
    (async () => {
      try {
        const r    = await fetch(`/api/gallery?${buildParams(0)}`, { signal: controller.signal });
        const data = await r.json() as { items: GalleryItem[]; hasMore: boolean };
        const fetched = data.items ?? [];
        setItems(fetched);
        hasMoreRef.current = data.hasMore ?? false;
        offsetRef.current  = fetched.length;
        setHasMore(data.hasMore ?? false);
        setTimeout(() => {
          if (hasMoreRef.current && document.body.scrollHeight <= window.innerHeight + 200) loadMore();
        }, 500);
      } catch {
      } finally {
        if (!controller.signal.aborted) { loadingMoreRef.current = false; setLoading(false); }
      }
    })();
    return () => controller.abort();
  }, [activeCategory, debouncedSearch, buildParams, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "0px 0px 400px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

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

  // Filtreleme server-side (API) yapıyor; burada sadece sort
  const filtered = (() => {
    if (sortBy === "newest") {
      return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortBy === "most_liked") {
      return [...items].sort((a, b) => {
        const aS = (hashCode(a.id) * 83) % 900 + 50 + (a.realLikes || 0);
        const bS = (hashCode(b.id) * 83) % 900 + 50 + (b.realLikes || 0);
        return bS - aS;
      });
    }
    if (sortBy === "highlights") {
      return [...items].sort((a, b) => (a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1));
    }
    return items; // "random": API seeded sırasını koru
  })();

  const columns: GalleryItem[][] = Array.from({ length: cols }, () => []);
  const colHeights = new Array<number>(cols).fill(0);
  filtered.forEach((item) => {
    const minIdx = colHeights.reduce((mi, h, i, arr) => (h < arr[mi] ? i : mi), 0);
    columns[minIdx].push(item);
    const cardH = item.width > 0 ? item.height / item.width : 1;
    colHeights[minIdx] += cardH + 0.04;
  });

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {selectedItem && (
        <ImageModal item={selectedItem} onClose={() => setSelectedItem(null)} allItems={items} onSelect={setSelectedItem} />
      )}
      <style>{`
        @keyframes skeletonPulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes premiumPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
        @keyframes adultGlow {
          0%, 100% { box-shadow: inset 0 0 0 1px rgba(255,50,50,0.28); }
          50%       { box-shadow: inset 0 0 0 1.5px rgba(255,80,80,0.68), inset 0 0 14px rgba(255,30,30,0.1); }
        }
        .modal-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <Header />

      <main
        className="relative z-10 pt-28 pb-20 px-4 md:px-8"
        style={{ maxWidth: "1800px", margin: "0 auto", width: "95%" }}
      >
        <div style={{ width: "100%", maxWidth: 1400 }}>
          <Link href="/"
            className="inline-block mb-8 text-lg font-semibold text-white hover:text-white/70 transition-colors">
            ← Back to Home
          </Link>
        </div>

        <div className="text-center mb-10">
          <motion.h1
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-6xl font-black tracking-tight mb-3"
            style={{
              backgroundImage: "linear-gradient(to right, #7c3aed, #a855f7)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            Elite Gallery
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-base"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            Premium Steam Profile Gallery. Find Your Vibe.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex flex-col gap-3 mb-10 w-full"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
            <div />
            <div className="relative" style={{ width: "432px", maxWidth: "90vw" }}>
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(188,19,254,0.6)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for vibes..."
                className="w-full pl-11 pr-5 py-3 rounded-2xl text-white text-sm outline-none transition-all duration-300"
                style={{ background: "rgba(46,16,101,0.3)", border: "1px solid rgba(188,19,254,0.25)", color: "#fff" }}
                onFocus={(e)  => { e.currentTarget.style.boxShadow = "0 0 20px rgba(188,19,254,0.4)";  e.currentTarget.style.border = "1px solid rgba(188,19,254,0.55)"; }}
                onBlur={(e)   => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.border = "1px solid rgba(188,19,254,0.25)"; }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
          </div>

          <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: "none", gap: "6px" }}>
            {CATEGORIES.map((cat) => {
              const active = cat === "All" ? activeCategory === "" : activeCategory === cat;
              const isNeon    = cat === "Neon";
              const isPremCat = cat === "Premium";
              return (
                <button
                  key={cat}
                  onClick={() => { if (cat === "All") { setActiveCategory(""); return; } setActiveCategory(active ? "" : cat); }}
                  className="flex-shrink-0 px-4 py-2 rounded-full transition-all duration-200"
                  style={isPremCat ? {
                    fontSize: "15px",
                    background: "#f5c842",
                    color: "#1a0a00",
                    border: "none",
                    fontWeight: 700,
                  } : {
                    fontSize: "15px",
                    fontWeight: undefined,
                    color: "white",
                    background: active ? "rgba(188,19,254,0.3)" : "rgba(46,16,101,0.5)",
                    border: active ? "1px solid rgba(188,19,254,0.7)" : "1px solid rgba(188,19,254,0.2)",
                    boxShadow: active ? "0 0 14px rgba(188,19,254,0.4)" : "none",
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    if (isPremCat) {
                      el.style.boxShadow = "0 0 12px rgba(245,200,66,0.6), 0 0 20px rgba(245,200,66,0.25)";
                    } else if (!active) {
                      el.style.boxShadow = "0 0 12px rgba(188,19,254,0.35)";
                      el.style.border    = "1px solid rgba(188,19,254,0.45)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    if (isPremCat) {
                      el.style.boxShadow = "none";
                    } else if (!active) {
                      el.style.boxShadow = "none";
                      el.style.border    = "1px solid rgba(188,19,254,0.2)";
                    }
                  }}
                >
                  {isPremCat ? `★ ${cat}` : cat}
                </button>
              );
            })}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, ci) => (
              <div key={ci} className="flex flex-col gap-4" style={{ flex: 1 }}>
                {[220, 280, 200, 260, 180].map((h, i) => (
                  <SkeletonCard key={i} height={h + (ci * 17) % 60} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className="text-center py-32 text-white/30 text-lg">
                {hasMore ? "Loading more vibes..." : "No results found."}
              </div>
            ) : (
              <div className="flex gap-3">
                {columns.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-3" style={{ flex: 1 }}>
                    {col.map((item, i) => 
                      // 997. satırda key kısmına index (i) değerini de ekliyoruz:
<GalleryCard 
  key={`${item.id}-${ci}-${i}`} 
  item={item} 
  index={ci * 5 + i} 
  onView={setSelectedItem}
/>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div ref={sentinelRef} className="h-10 w-full mt-4" />

        {loadingMore && (
          <div className="flex justify-center py-10">
            <div
              className="w-9 h-9 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgba(188,19,254,0.35)", borderTopColor: "#BC13FE" }}
            />
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <div className="text-center py-8 text-white/20 text-xs tracking-widest uppercase">
            {items.length} vibe loaded
          </div>
        )}
      </main>

      <footer
        className="border-t py-8 text-center text-white/20 text-sm"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        © 2026 VibeProfileit — Made by SirHacktan for the Steam Community with ❤️. All rights reserved.
      </footer>
    </div>
  );
}