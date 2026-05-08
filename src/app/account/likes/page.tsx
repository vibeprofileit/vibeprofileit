"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Header from "@/components/Header";
import ProtectedImage from "@/components/ui/ProtectedImage";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, X, Download, Heart, Pencil, ExternalLink } from "lucide-react";

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
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

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
            maxWidth: "1150px", minHeight: "750px", background: "#050505",
            border: "1px solid rgba(188,19,254,0.35)",
            boxShadow: "0 0 0 1px rgba(188,19,254,0.45), 0 0 30px rgba(188,19,254,0.18)",
            scrollbarWidth: "none",
          } as React.CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
            style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(188,19,254,0.45)" }}
          >
            <X size={16} color="#fff" />
          </button>

          <div className="flex flex-col md:flex-row gap-6 p-6 items-stretch flex-1">
            {/* Sol: Görsel */}
            <div className="rounded-xl relative overflow-hidden isolate"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center", width: "fit-content", maxHeight: "75vh", background: "#050505", border: "1px solid rgba(188,19,254,0.18)" }}>
              {item.src && (
                <ProtectedImage
                  src={item.src}
                  alt={item.theme}
                  className="w-auto object-contain relative z-[1]"
                  style={{ maxHeight: "75vh" }}
                />
              )}
            </div>

            {/* Sağ: Sidebar */}
            <div className="flex flex-col gap-5 flex-1 min-w-0">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(10,10,10,0.9)", border: "1px solid rgba(188,19,254,0.1)" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(188,19,254,1), rgba(188,19,254,0.4))", boxShadow: "0 0 20px rgba(188,19,254,0.8)" }}>
                  V
                </div>
                <div>
                  <div className="text-white font-bold text-base">VibeProfileit</div>
                  <div className="text-white/50 text-xs mt-0.5">Elite Selection</div>
                </div>
              </div>

              <div className="flex gap-3">
                {[
                  { icon: <Eye size={18} style={{ color: "#fff" }} />,   val: totalViews, label: "Views", glow: "rgba(188,19,254,0.7)" },
                  { icon: <Heart size={18} style={{ color: "#fff" }} />, val: totalLikes, label: "Likes", glow: "rgba(255,77,141,0.6)"  },
                ].map(({ icon, val, label, glow }) => (
                  <div key={label} className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl gap-1"
                    style={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(188,19,254,0.2)" }}>
                    {icon}
                    <div className="font-bold text-xl" style={{ color: "#fff", textShadow: `0 0 10px ${glow}` }}>{val}</div>
                    <div className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">{label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(188,19,254,0.15)" }}>
                {[
                  { label: "Resolution", value: `${item.width}×${item.height}` },
                  { label: "Format",     value: item.format },
                  { label: "Size",       value: `${item.sizeMB} MB` },
                ].map((meta) => (
                  <div key={meta.label} className="flex items-center justify-between">
                    <span className="text-white/50 text-xs font-medium uppercase tracking-wide">{meta.label}</span>
                    <span className="text-white text-sm font-bold">{meta.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 mt-auto pb-6">
                <Link
                  href={`/design-studio?id=${item.id}&template=featured&imageUrl=${encodeURIComponent(item.src)}${item.isPremium ? "&isPremium=true" : ""}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, rgba(188,19,254,0.85), rgba(120,0,200,0.6))", border: "1px solid rgba(188,19,254,1)" }}
                >
                  <Download size={15} /> Customize & Download
                </Link>
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="relative z-[70] px-6 py-5 mt-auto" style={{ borderTop: "1px solid rgba(188,19,254,0.15)", background: "rgba(5,5,5,0.8)" }}>
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4 pl-1">Related Vibes</h3>
              <div className="grid grid-cols-4 gap-3">
                {related.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelect(rel)}
                    className="relative rounded-xl overflow-hidden cursor-pointer"
                    style={{ aspectRatio: "9/14", background: "#050505", border: "1px solid rgba(188,19,254,0.25)" }}
                  >
                    {rel.src && (
                      <img src={rel.src} alt={rel.theme} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── LikeCard ─────────────────────────────────────────────────────────────────

function LikeCard({ item, index, onView }: { item: GalleryItem; index: number; onView: (item: GalleryItem) => void }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [studioHovered, setStudioHovered] = useState(false);
  const cardRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inView,          setInView]          = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [canvasFailed,    setCanvasFailed]    = useState(false);

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

  // coverUrl yoksa canvas ile ilk kareyi çiz
  useEffect(() => {
    if (!inView || !item.isAnimated || item.coverUrl || !item.src || thumbnailLoaded || canvasFailed) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) { setCanvasFailed(true); return; }
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setCanvasFailed(true); return; }
      try { ctx.drawImage(img, 0, 0); setThumbnailLoaded(true); }
      catch { setCanvasFailed(true); }
    };
    img.onerror = () => { if (!cancelled) setCanvasFailed(true); };
    img.src = item.src;
    return () => { cancelled = true; };
  }, [inView, item.isAnimated, item.coverUrl, item.src, thumbnailLoaded, canvasFailed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.4, ease: "easeOut" }}
      ref={cardRef}
      className="relative rounded-xl overflow-hidden cursor-pointer"
      style={{ aspectRatio, width: "100%", border: "1px solid rgba(188,19,254,0.2)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setStudioHovered(false); }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      onClick={() => {
        if (item.isPremium) { router.push("/pricing"); return; }
        onView(item);
      }}
    >
      <div className="absolute inset-0" style={{ background: "#050505" }} />

      {item.isAnimated ? (
        <>
          {/* coverUrl varsa statik WebP kapak — hover'da gizle */}
          {item.coverUrl && !hovered && (
            <img
              src={item.coverUrl}
              alt={item.theme}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* coverUrl yoksa canvas her zaman DOM'da, sadece opacity değişir */}
          {!item.coverUrl && (
            <>
              {inView && !thumbnailLoaded && !canvasFailed && (
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#0a0014,#1a0035,#050505)", animation: "premiumPulse 2s ease-in-out infinite" }} />
              )}
              {canvasFailed ? (
                !hovered && inView && (
                  <img src={item.src} alt={item.theme} className="absolute inset-0 w-full h-full object-cover" />
                )
              ) : (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ objectFit: "cover", opacity: thumbnailLoaded ? 1 : 0, transition: "opacity 0.35s" }}
                />
              )}
            </>
          )}

          {/* Hover: animasyonlu GIF */}
          {hovered && inView && (
            <img
              src={item.src}
              alt={item.theme}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.8)" }}
            />
          )}
        </>
      ) : (
        inView && item.src && (
          <ProtectedImage
            src={item.src}
            alt={item.theme}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )
      )}

      {item.isAnimated && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full z-10 pointer-events-none"
          style={{ background: "rgba(8,0,20,0.85)", border: "1px solid rgba(188,19,254,0.7)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#BC13FE", display: "inline-block" }} />
          <span style={{ color: "#BC13FE", fontSize: "8px", fontWeight: 800, letterSpacing: "0.12em" }}>LIVE</span>
        </div>
      )}

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-10"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.7) 100%)" }}
          >
            <Link
              href={`/design-studio?id=${item.id}&template=featured&imageUrl=${encodeURIComponent(item.src)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2.5 right-2.5 flex items-center gap-1 px-3 py-1.5 rounded-xl z-20"
              style={{
                background: "transparent", border: "2px solid #ff1cd3",
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
                style={{ fontSize: "12px", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(188,19,254,0.7)" }}
              >
                <Eye size={12} /> View
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </motion.div>
  );
}

// ─── LikesPage ─────────────────────────────────────────────────────────────────

export default function LikesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [cols, setCols] = useState(4);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.userId) return;
    fetch("/api/account/likes")
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setLoading(false); })
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

  const columns: GalleryItem[][] = Array.from({ length: cols }, () => []);
  const colHeights = new Array<number>(cols).fill(0);
  items.forEach((item) => {
    const minIdx = colHeights.reduce((mi, h, i, arr) => (h < arr[mi] ? i : mi), 0);
    columns[minIdx].push(item);
    const cardH = item.width > 0 ? item.height / item.width : 1;
    colHeights[minIdx] += cardH + 0.04;
  });

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {selectedItem && (
        <ImageModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          allItems={items}
          onSelect={setSelectedItem}
        />
      )}

      <style>{`
        .modal-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <Header />

      <main className="relative z-10 pt-28 pb-20 px-4 md:px-8" style={{ maxWidth: "1800px", margin: "0 auto", width: "95%" }}>

        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "#ffffff" }}>
            Likes
          </h1>
        </div>

        {/* İçerik */}
        {loading ? (
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, ci) => (
              <div key={ci} className="flex flex-col gap-4" style={{ flex: 1 }}>
                {[220, 280, 200, 260].map((h, i) => (
                  <div key={i} className="rounded-xl" style={{ height: h + (ci * 17) % 60, background: "linear-gradient(90deg, rgba(46,16,101,0.3) 25%, rgba(188,19,254,0.15) 50%, rgba(46,16,101,0.3) 75%)", backgroundSize: "200% 100%", animation: "skeletonPulse 1.8s ease-in-out infinite" }} />
                ))}
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Heart size={48} style={{ color: "rgba(255,68,68,0.3)" }} />
            <p className="text-white/20 text-lg font-medium">No likes yet</p>
            <Link href="/gallery" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Browse the gallery →
            </Link>
          </div>
        ) : (
          <div className="flex gap-3">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-3" style={{ flex: 1 }}>
                {col.map((item, i) => (
                  <LikeCard
                    key={item.id}
                    item={item}
                    index={ci * 5 + i}
                    onView={setSelectedItem}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes skeletonPulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
