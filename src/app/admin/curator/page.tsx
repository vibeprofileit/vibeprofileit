"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Artwork = {
  id: string;
  sourceUrl: string;
  r2Key?: string | null;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
  theme: string | null;
  color: string | null;
  vibe: string | null;
  mediaType: string;
  status: string;
  isFeatured: boolean;
  isNSFW: boolean;
  isPremium: boolean;
  createdAt: string;
};

const R2_BASE = "https://vibe-images.vibeprofileit.workers.dev";

function getImageUrl(artwork: Artwork): string {
  if (artwork.r2Key) {
    const key =
      artwork.r2Key.startsWith("artworks/") || artwork.r2Key.startsWith("pending/") || artwork.r2Key.startsWith("premium/") || artwork.r2Key.startsWith("generations/")
        ? artwork.r2Key
        : `artworks/${artwork.r2Key}`;
    return `${R2_BASE}/${key}`;
  }
  return artwork.sourceUrl;
}

function sortApproved(list: Artwork[]): Artwork[] {
  return [...list].sort((a, b) => {
    if ((a.isFeatured ?? false) === (b.isFeatured ?? false)) return 0;
    return (a.isFeatured ?? false) ? -1 : 1;
  });
}

// ─── Görsel boyutlarını tarayıcıda ölç ───────────────────────────────────────
function measureImage(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

// ─── URL ile Hızlı Ekleme Formu ──────────────────────────────────────────────
function UrlAddForm({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [format, setFormat] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/admin/artworks/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl: url, width: width ? Number(width) : 0, height: height ? Number(height) : 0, format: format || "unknown" }),
    });
    if (res.ok) {
      setMsg({ type: "ok", text: "Kuyruğa eklendi." });
      setUrl(""); setWidth(""); setHeight(""); setFormat("");
      onAdded();
    } else {
      const data = await res.json();
      setMsg({ type: "err", text: data.error ?? "Hata oluştu." });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="url" placeholder="https://example.com/image.gif" value={url} onChange={(e) => setUrl(e.target.value)} required
        className="bg-zinc-900 border border-zinc-700 focus:border-[#00ff99] outline-none rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 transition-colors" />
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Genişlik</label>
          <input type="number" placeholder="1920" value={width} onChange={(e) => setWidth(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 focus:border-[#00ff99] outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Yükseklik</label>
          <input type="number" placeholder="1080" value={height} onChange={(e) => setHeight(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 focus:border-[#00ff99] outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Format</label>
          <input type="text" placeholder="jpg / gif / png" value={format} onChange={(e) => setFormat(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 focus:border-[#00ff99] outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors" />
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="py-2.5 rounded-lg font-semibold text-sm bg-[#00ff99] text-black hover:bg-[#00e58a] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? "Ekleniyor..." : "Kuyruğa Ekle"}
      </button>
      {msg && <p className={`text-xs text-center ${msg.type === "ok" ? "text-[#00ff99]" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}

// ─── R2 Dosya Yükleme Formu (Bulk) ───────────────────────────────────────────
function FileUploadForm({ onAdded }: { onAdded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<{ name: string; ok: boolean; msg: string }[]>([]);
  const [drag, setDrag] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const fresh = Array.from(incoming).filter((f) => !existing.has(f.name));
      return [...prev, ...fresh];
    });
    setResults([]);
  };

  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);
  const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif"]);
  const MIN_W = 630;
  const MIN_H = 800;

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setResults([]);

    // ── Ön filtre ────────────────────────────────────────────────────────────
    const valid: File[] = [];
    const rejected: { name: string; ok: boolean; msg: string }[] = [];

    for (const file of files) {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_TYPES.has(file.type) || !ALLOWED_EXTS.has(ext)) {
        rejected.push({ name: file.name, ok: false, msg: "Sadece JPG, PNG ve GIF formatları kabul edilir" });
        continue;
      }
      const { width, height } = await measureImage(file);
      if (width < MIN_W || height < MIN_H) {
        rejected.push({ name: file.name, ok: false, msg: `Minimum resolution ${MIN_W}x${MIN_H} required for Steam (Current: ${width}x${height})` });
        continue;
      }
      valid.push(file);
    }

    setResults(rejected);
    if (!valid.length) { setUploading(false); return; }
    // ─────────────────────────────────────────────────────────────────────────

    let done = 0;

    for (const file of valid) {
      setProgress(`Yükleniyor ${++done}/${files.length}: ${file.name}`);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("format", file.type.split("/")[1] ?? "unknown");
      try {
        const res = await fetch("/api/admin/artworks/upload", { method: "POST", body: fd });
        if (res.ok) {
          setResults((p) => [...p, { name: file.name, ok: true, msg: "✓" }]);
        } else {
          const data = await res.json().catch(() => ({}));
          setResults((p) => [...p, { name: file.name, ok: false, msg: data.error ?? "Hata" }]);
        }
      } catch (err) {
        setResults((p) => [...p, { name: file.name, ok: false, msg: (err as Error).message }]);
      }
    }

    setProgress("");
    setUploading(false);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
    onAdded();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-8 ${drag ? "border-[#00ff99] bg-[#00ff9910]" : "border-zinc-700 hover:border-zinc-500"}`}
      >
        <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,.jpg,.jpeg,.png,.gif"
          className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {files.length > 0 ? (
          <p className="text-sm text-[#00ff99] font-semibold">{files.length} dosya seçildi</p>
        ) : (
          <>
            <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-zinc-500">Dosyaları buraya sürükle veya tıkla</p>
            <p className="text-xs text-zinc-600">JPG, PNG, GIF · Maks 21 MB · Çoklu seçim</p>
          </>
        )}
      </div>

      {files.length > 0 && !uploading && (
        <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
          {files.map((f) => (
            <div key={f.name} className="flex items-center justify-between text-xs text-zinc-500 font-mono bg-zinc-900 rounded px-2 py-1">
              <span className="truncate max-w-[75%]">{f.name}</span>
              <span>{(f.size / 1024).toFixed(0)} KB</span>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <p className="text-xs text-zinc-400 font-mono truncate">{progress}</p>
      )}

      <button onClick={handleUpload} disabled={!files.length || uploading}
        className="py-2.5 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        {uploading ? `Yükleniyor... (${results.length}/${files.length})` : `${files.length ? `${files.length} dosyayı ` : ""}R2'ye Yükle & Kuyruğa Ekle`}
      </button>

      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
          {results.map((r) => (
            <p key={r.name} className={`text-xs font-mono truncate ${r.ok ? "text-[#00ff99]" : "text-red-400"}`}>
              {r.ok ? "✓" : "✗"} {r.name}{!r.ok && `: ${r.msg}`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload Panel ─────────────────────────────────────────────────────────────
type UploadTab = "url" | "file";

function UploadPanel({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<UploadTab>("url");
  return (
    <div className="w-full max-w-[660px] mb-8 rounded-xl border border-zinc-800 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-zinc-900 hover:bg-zinc-800 transition-colors text-left">
        <span className="text-sm font-semibold text-zinc-300 tracking-wide">+ Artwork Ekle</span>
        <svg className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-4 bg-zinc-950 flex flex-col gap-4">
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg">
            {(["url", "file"] as UploadTab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase transition-all ${tab === t ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {t === "url" ? "URL ile Ekle" : "Dosya Yükle (R2)"}
              </button>
            ))}
          </div>
          {tab === "url" ? <UrlAddForm onAdded={onAdded} /> : <FileUploadForm onAdded={onAdded} />}
        </div>
      )}
    </div>
  );
}

// ─── Etiket Listeleri ─────────────────────────────────────────────────────────
const THEME_SUGGESTIONS = ["Anime","Space","Nature","Fantasy","City","Abstract","Gaming","Minimal","Dark","Sci-Fi","Horror","Cute","Cars","Architecture","Ocean","Forest","Neon","Retro","Cartoon","Film","Rap","Artist","Marvel","Movie"];
const COLOR_OPTIONS = ["Black","White","Gray","Dark","Red","Orange","Yellow","Green","Blue","Purple","Pink","Brown","Teal","Multicolor","Neon"];
const STYLE_OPTIONS = ["ART", "REAL"] as const;
const SELECT_CLS = "bg-zinc-900 border border-zinc-700 focus:border-[#00ff99] outline-none rounded-lg px-3 py-2 text-sm text-white transition-colors appearance-none cursor-pointer";

// ─── Approved Modal ───────────────────────────────────────────────────────────
function ApprovedModal({
  artwork, onClose, onMoveToPending, onHardDelete, onToggleFeatured, onNext, onPrev,
}: {
  artwork: Artwork;
  onClose: () => void;
  onMoveToPending: (id: string) => Promise<void>;
  onHardDelete: (id: string) => Promise<void>;
  onToggleFeatured: (id: string, current: boolean) => Promise<void>;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [starring, setStarring] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative flex flex-col items-center gap-4 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-sm flex items-center justify-center transition-colors z-10">✕</button>
        <div className="relative w-full">
          <AnimatePresence mode="wait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              key={artwork.id}
              src={getImageUrl(artwork)}
              alt="artwork"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              className="w-full h-auto max-h-[70vh] object-contain rounded-xl border border-zinc-700"
            />
          </AnimatePresence>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all bg-black/60 border border-zinc-600 hover:border-[#00ff99] hover:shadow-[0_0_12px_rgba(0,255,153,0.5)]"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all bg-black/60 border border-zinc-600 hover:border-[#00ff99] hover:shadow-[0_0_12px_rgba(0,255,153,0.5)]"
          >
            <ChevronRight size={18} className="text-white" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400 font-mono">
          {artwork.theme && <span className="bg-zinc-800 px-2 py-1 rounded">{artwork.theme}</span>}
          {artwork.color && <span className="bg-zinc-800 px-2 py-1 rounded">{artwork.color}</span>}
          {artwork.vibe && <span className="bg-zinc-800 px-2 py-1 rounded">{artwork.vibe}</span>}
          <span className="bg-zinc-800 px-2 py-1 rounded">{artwork.mediaType}</span>
          <span className="bg-zinc-800 px-2 py-1 rounded">{artwork.width}×{artwork.height}</span>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={async () => { setStarring(true); await onToggleFeatured(artwork.id, artwork.isFeatured); setStarring(false); }} disabled={starring}
            className={`flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${artwork.isFeatured ? "bg-yellow-400 text-black hover:bg-yellow-300" : "bg-zinc-700 text-white hover:bg-zinc-600"}`}>
            {starring ? "..." : artwork.isFeatured ? "★  Featured" : "☆  Feature"}
          </button>
          {artwork.isPremium && (
            <span className="flex-1 py-3 rounded-xl font-bold text-sm text-center bg-amber-500/20 text-amber-400 border border-amber-500/30">
              💎 Premium
            </span>
          )}
          <button onClick={async () => { setLoading(true); await onMoveToPending(artwork.id); setLoading(false); onClose(); }} disabled={loading}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-zinc-600 hover:bg-zinc-500 text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Taşınıyor..." : "↩  Pending'e Al"}
          </button>
          <button onClick={async () => { if (!window.confirm("Emin misin? Bu işlem görseli R2'den de kalıcı olarak silecek!")) return; setDeleting(true); await onHardDelete(artwork.id); setDeleting(false); onClose(); }} disabled={deleting}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {deleting ? "Siliniyor..." : "🗑  DELETE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Grid Thumbnail ───────────────────────────────────────────────────────────
function GridThumb({ art, onClick }: { art: Artwork; index: number; onClick: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasLoadedRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const isAnimated = art.mediaType === "ANIMATED";

  // Viewport'a girince fetch'i tetikle (sadece animated için)
  useEffect(() => {
    if (!isAnimated) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShouldLoad(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isAnimated]);

  // Canvas + hover-to-play: yalnızca shouldLoad=true olunca başlar
  useEffect(() => {
    if (!isAnimated || !shouldLoad || canvasLoadedRef.current) return;
    const url = getImageUrl(art);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const sw = size / scale;
      const sh = size / scale;
      const sx = (img.naturalWidth - sw) / 2;
      const sy = (img.naturalHeight - sh) / 2;
      try {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        canvasLoadedRef.current = true;
        setCanvasReady(true);
      } catch {
        // CORS taint: canvas çizilemedi
      }
      if (imgRef.current) imgRef.current.src = url;
    };
    img.onerror = () => {
      if (imgRef.current) imgRef.current.src = getImageUrl(art);
    };
    img.src = url;
  }, [isAnimated, shouldLoad, art]);

  if (!isAnimated) {
    const url = getImageUrl(art);
    if (!url) return null;
    return (
      <div
        className="relative aspect-square overflow-hidden rounded-lg border border-zinc-800 hover:border-[#00ff99] transition-colors bg-zinc-800 cursor-pointer group"
        onClick={onClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="artwork" loading="lazy" decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} />
        {art.isFeatured && <span className="absolute top-1 left-1 text-yellow-400 text-sm leading-none select-none">★</span>}
        {art.isPremium && <span className="absolute top-1 right-1 text-amber-400 text-xs leading-none select-none font-bold">💎</span>}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-square overflow-hidden rounded-lg border border-zinc-800 hover:border-[#00ff99] transition-colors bg-zinc-800 cursor-pointer group"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <canvas ref={canvasRef}
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, opacity: canvasReady && !isHovered ? 1 : 0, transition: "opacity 0.2s ease" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} alt="artwork"
        style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0, opacity: isHovered ? 1 : 0, transition: "opacity 0.2s ease" }} />
      {art.isFeatured && <span className="absolute top-1 left-1 text-yellow-400 text-sm leading-none select-none">★</span>}
      {art.isPremium && <span className="absolute top-1 right-1 text-amber-400 text-xs leading-none select-none font-bold">💎</span>}
    </div>
  );
}

// ─── Approved Tab ─────────────────────────────────────────────────────────────
function ApprovedTab({
  artworks, setArtworks, loading,
}: {
  artworks: Artwork[];
  setArtworks: React.Dispatch<React.SetStateAction<Artwork[]>>;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [mediaFilter, setMediaFilter] = useState<"ALL" | "ANIMATED" | "STATIC" | "NSFW" | "PREMIUM">("ALL");

  const moveToPending = async (id: string) => {
    await fetch("/api/admin/artworks", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, moveToPending: true }),
    });
    setArtworks((prev) => prev.filter((a) => a.id !== id));
  };

  const hardDelete = async (id: string) => {
    await fetch("/api/admin/artworks", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, hardDelete: true }),
    });
    setArtworks((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    const newFeatured = !current;
    const res = await fetch(`/api/admin/artworks/${id}/featured`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: newFeatured }),
    });
    if (!res.ok) { console.error("[toggleFeatured] API hatası:", await res.text()); return; }
    setArtworks((prev) => sortApproved(prev.map((a) => a.id === id ? { ...a, isFeatured: newFeatured } : a)));
    setSelected((prev) => prev?.id === id ? { ...prev, isFeatured: newFeatured } : prev);
  };

  const togglePremium = async (id: string, current: boolean) => {
    const newPremium = !current;
    const res = await fetch("/api/admin/artworks", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, togglePremium: newPremium }),
    });
    if (!res.ok) { console.error("[togglePremium] API hatası:", await res.text()); return; }
    setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, isPremium: newPremium } : a));
    setSelected((prev) => prev?.id === id ? { ...prev, isPremium: newPremium } : prev);
  };

  const filtered = artworks.filter((a) => {
    if (mediaFilter === "NSFW") return a.isNSFW;
    if (mediaFilter === "PREMIUM") return a.isPremium;
    if (mediaFilter === "ALL") return true;
    return (a.mediaType ?? "STATIC") === mediaFilter;
  });

  if (loading) return <div className="text-zinc-400 animate-pulse mt-20">Yükleniyor...</div>;
  if (!artworks.length) return <div className="text-zinc-400 text-lg mt-20">Onaylanmış artwork yok.</div>;

  return (
    <>
      <div className="flex items-center gap-4 mb-6 w-full max-w-[900px]">
        <p className="text-zinc-500 text-sm">{filtered.length} / {artworks.length} artwork</p>
        <div className="flex gap-2">
          {(["ALL", "ANIMATED", "STATIC", "NSFW", "PREMIUM"] as const).map((f) => (
            <button key={f} onClick={() => setMediaFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                mediaFilter === f
                  ? f === "NSFW" ? "bg-red-600 text-white" : f === "PREMIUM" ? "bg-amber-500 text-black" : "bg-[#00ff99] text-black"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}>
              {f === "ALL" ? "Tümü" : f === "ANIMATED" ? "Animated" : f === "STATIC" ? "Static" : f === "NSFW" ? "+18" : "💎 Premium"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 w-full max-w-[900px]">
        {filtered.map((art, i) => (
          <GridThumb key={art.id} art={art} index={i} onClick={() => setSelected(art)} />
        ))}
      </div>
      {selected && (() => {
        const idx = filtered.findIndex((a) => a.id === selected.id);
        const handleNext = () => { if (filtered.length) setSelected(filtered[(idx + 1) % filtered.length]); };
        const handlePrev = () => { if (filtered.length) setSelected(filtered[(idx - 1 + filtered.length) % filtered.length]); };
        return (
          <ApprovedModal artwork={selected} onClose={() => setSelected(null)}
            onMoveToPending={moveToPending} onHardDelete={hardDelete} onToggleFeatured={toggleFeatured}
            onNext={handleNext} onPrev={handlePrev} />
        );
      })()}
    </>
  );
}

// ─── Regen Thumbnails Butonu ─────────────────────────────────────────────────
function RegenThumbsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; ok: number; failed: number } | null>(null);

  const run = async () => {
    if (!window.confirm("Tüm GIF cover'ları sıfırlanıp yeniden üretilecek. Devam?")) return;
    setLoading(true);
    setResult(null);
    try {
      await fetch("/api/admin/fix-cover-urls", { method: "POST" });
      const res = await fetch("/api/admin/artworks/regen-thumbnails", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      alert("Hata, konsolu kontrol et.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center gap-2 mb-3">
      <button onClick={run} disabled={loading}
        className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-700">
        {loading ? "Üretiliyor..." : "🎞  Cover Thumbnail Yenile"}
      </button>
      {result && (
        <p className="text-xs font-mono text-zinc-500">
          Toplam: {result.total} · OK: {result.ok} · Hata: {result.failed}
        </p>
      )}
    </div>
  );
}

// ─── Cleanup Butonu ───────────────────────────────────────────────────────────
function CleanupButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    r2Total: number; dbTotal: number; orphansFound: number; deleted: number; errors: number;
  } | null>(null);

  const run = async () => {
    if (!window.confirm(`R2 temizliği başlatılsın mı? Veritabanında karşılığı olmayan tüm dosyalar kalıcı olarak silinecek.`)) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/cleanup", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      alert("Temizlik hatası, konsolu kontrol et.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <button onClick={run} disabled={loading}
        className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-700">
        {loading ? "Temizleniyor..." : "🗑  R2 Senkronizasyon"}
      </button>
      {result && (
        <p className="text-xs font-mono text-zinc-500">
          R2: {result.r2Total} · DB: {result.dbTotal} · Yetim: {result.orphansFound} · Silindi: {result.deleted} · Hata: {result.errors}
        </p>
      )}
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
type PageTab = "pending" | "approved";

export default function CuratorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<PageTab>("pending");
  const [queue, setQueue] = useState<Artwork[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [approvedArtworks, setApprovedArtworks] = useState<Artwork[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tags, setTags] = useState({ theme: "", color: "", vibe: "", mediaType: "ANIMATED", isFeatured: false, isNSFW: false, isPremium: false });

  const current = queue[0] ?? null;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session?.user?.isAdmin) {
      router.replace("/");
    }
  }, [status, session, router]);

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch("/api/admin/artworks");
      if (!res.ok) { setQueue([]); setQueueLoading(false); return; }
      const data = await res.json();
      setQueue(Array.isArray(data) ? data : []);
    } catch { setQueue([]); }
    setQueueLoading(false);
  }, []);

  const fetchApproved = useCallback(async () => {
    setApprovedLoading(true);
    try {
      const res = await fetch("/api/admin/artworks?status=APPROVED");
      if (!res.ok) { setApprovedArtworks([]); setApprovedLoading(false); return; }
      const data: Artwork[] = await res.json();
      setApprovedArtworks(Array.isArray(data) ? sortApproved(data) : []);
    } catch { setApprovedArtworks([]); }
    setApprovedLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); fetchApproved(); }, [fetchQueue, fetchApproved]);

  useEffect(() => {
    if (current) {
      setTags({ theme: current.theme ?? "", color: current.color ?? "", vibe: current.vibe ?? "", mediaType: "ANIMATED", isFeatured: current.isFeatured ?? false, isNSFW: current.isNSFW ?? false, isPremium: current.isPremium ?? false });
    }
  }, [current]);

  const handleApprove = async () => {
    if (!current) return;
    if (!tags.theme.trim() || !tags.color.trim() || !tags.vibe.trim() || !tags.mediaType.trim()) {
      alert("Lütfen tüm etiketleri doldurun!");
      return;
    }
    setActionLoading(true);
    const res = await fetch("/api/admin/artworks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, ...tags }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[handleApprove] API hatası:", err);
      setActionLoading(false);
      return;
    }
    const approved: Artwork = await res.json();
    setQueue((q) => q.filter((a) => a.id !== current.id));
    setApprovedArtworks((prev) => sortApproved([approved, ...prev]));
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!current) return;
    setActionLoading(true);
    const res = await fetch("/api/admin/artworks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id }),
    });
    if (!res.ok) {
      console.error("[handleReject] API hatası:", await res.text());
      setActionLoading(false);
      return;
    }
    setQueue((q) => q.filter((a) => a.id !== current.id));
    setActionLoading(false);
  };

  if (status === "loading") {
    return <div className="min-h-screen bg-[#0a0a0f]" />;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center py-12 px-4">
      <h1 className="text-3xl font-bold mb-2 tracking-tight">
        <span className="text-[#00ff99]">VibeProfileit</span> Curator
      </h1>

      <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-8 w-full max-w-xs">
        {(["pending", "approved"] as PageTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all ${tab === t ? "bg-[#00ff99] text-black" : "text-zinc-400 hover:text-white"}`}>
            {t === "pending" ? `Pending${queue.length ? ` (${queue.length})` : ""}` : `Approved${approvedArtworks.length ? ` (${approvedArtworks.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "approved" ? (
        <>
          <RegenThumbsButton />
          <CleanupButton />
          <ApprovedTab artworks={approvedArtworks} setArtworks={setApprovedArtworks} loading={approvedLoading} />
        </>
      ) : (
        <>
          <p className="text-zinc-500 text-sm mb-10">{queue.length} artwork bekliyor</p>
          <UploadPanel onAdded={fetchQueue} />

          {queueLoading ? (
            <div className="text-zinc-400 animate-pulse">Yükleniyor...</div>
          ) : !current ? (
            <div className="text-zinc-400 text-lg mt-20">Kuyruk boş. Tüm artworkler işlendi.</div>
          ) : (
            <div className="flex flex-col items-center gap-6 w-full max-w-[660px]">

              <div className="relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-[0_0_40px_rgba(0,255,153,0.07)]"
                style={{ width: 630, height: Math.round(630 * (current.height / current.width)) || 354 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getImageUrl(current)} alt="artwork preview" className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
                <div className="absolute bottom-2 right-3 text-[11px] text-zinc-500 font-mono">
                  {current.width}×{current.height} · {current.format.toUpperCase()} · {(current.sizeBytes / 1024).toFixed(0)}KB
                </div>
              </div>

              <div className="w-full grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold">Theme</label>
                  <input list="theme-list" type="text" value={tags.theme} onChange={(e) => setTags((t) => ({ ...t, theme: e.target.value }))} placeholder="Anime, Space…"
                    className="bg-zinc-900 border border-zinc-700 focus:border-[#00ff99] outline-none rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors" />
                  <datalist id="theme-list">{THEME_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold">Color</label>
                  <select value={tags.color} onChange={(e) => setTags((t) => ({ ...t, color: e.target.value }))} className={SELECT_CLS}>
                    <option value="">— seç —</option>
                    {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold">Style</label>
                  <select value={tags.vibe} onChange={(e) => setTags((t) => ({ ...t, vibe: e.target.value }))} className={SELECT_CLS}>
                    <option value="">— seç —</option>
                    {STYLE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Featured toggle */}
              <button
                onClick={() => setTags((t) => ({ ...t, isFeatured: !t.isFeatured }))}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-all
                  ${tags.isFeatured ? "bg-yellow-400 text-black hover:bg-yellow-300" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-700"}`}
              >
                {tags.isFeatured ? "★  Featured (Approve'da kaydedilecek)" : "☆  Feature olarak işaretle"}
              </button>

              {/* NSFW toggle */}
              <button
                onClick={() => setTags((t) => ({ ...t, isNSFW: !t.isNSFW }))}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-all
                  ${tags.isNSFW ? "bg-red-700 text-white hover:bg-red-600 border border-red-500" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-700"}`}
              >
                {tags.isNSFW ? "🔞  +18 / NSFW (Approve'da kaydedilecek)" : "🔞  +18 / NSFW olarak işaretle"}
              </button>

              {/* Premium toggle */}
              <button
                onClick={() => setTags((t) => ({ ...t, isPremium: !t.isPremium }))}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-all
                  ${tags.isPremium ? "bg-amber-500 text-black hover:bg-amber-400 border border-amber-400" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-700"}`}
              >
                {tags.isPremium ? "💎  Premium (Approve'da kaydedilecek)" : "💎  Premium olarak işaretle"}
              </button>

              <div className="flex gap-2 w-full">
                {(["STATIC", "ANIMATED"] as const).map((type) => (
                  <button key={type} onClick={() => setTags((t) => ({ ...t, mediaType: type }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                      ${tags.mediaType === type
                        ? type === "ANIMATED" ? "bg-purple-600 text-white" : "bg-zinc-600 text-white"
                        : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-700"}`}>
                    {type === "ANIMATED" ? "🎞 Animated" : "🖼 Static"}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 w-full">
                <button onClick={handleApprove} disabled={actionLoading}
                  className="flex-1 py-4 rounded-xl font-bold text-lg bg-[#00ff99] text-black hover:bg-[#00e58a] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,153,0.3)]">
                  {actionLoading ? "..." : "✔  APPROVE & PUBLISH"}
                </button>
                <button onClick={handleReject} disabled={actionLoading}
                  className="flex-1 py-4 rounded-xl font-bold text-lg bg-red-600 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                  {actionLoading ? "..." : "✕  REJECT & DELETE"}
                </button>
              </div>

            </div>
          )}
        </>
      )}
    </main>
  );
}
