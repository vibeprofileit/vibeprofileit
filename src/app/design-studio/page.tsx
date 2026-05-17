"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import NextImage from "next/image";
import Link from "next/link";
import { ChevronRight, Scissors } from "lucide-react";
import { motion } from "framer-motion";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { SteamProfileData, SteamFriend } from "../api/steam/profile/route";
import { runGifPipeline as processGif } from "@/lib/gif-pipeline";
import { stampWatermark } from "@/lib/watermark";
import Footer from "@/components/Footer";
const MAX_FILE_SIZE      = 15 * 1024 * 1024; // 15 MB
const ELITE_BYPASS_BYTES = 5_138_022;        // 4.9 MB — static görsel sıkıştırma eşiği

// ─── BadgeCell -- gorsel yuklenirse ikon, yuklenemezse seviye etiketi ─────────
function BadgeCell({ icon, label }: { icon: string; label: string }) {
  const [failed, setFailed] = useState(false);
  const proxied = icon ? `/api/steam/imgproxy?url=${encodeURIComponent(icon)}` : "";

  return (
    <div style={{
      aspectRatio: "1", borderRadius: 4, background: "#2a3f55", overflow: "hidden",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 2,
    }}>
      {!failed && proxied ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxied}
          alt={label}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "72%", height: "72%", objectFit: "contain" }}
        />
      ) : (
        // Gorsel gelmezse: seviye metnini buyuk goster
        <span style={{ fontSize: 11, fontWeight: 700, color: "#66c0f4", letterSpacing: "0.04em" }}>
          {label}
        </span>
      )}
      {!failed && (
        <span style={{ fontSize: 7, color: "#6a8a9a", lineHeight: 1 }}>{label}</span>
      )}
    </div>
  );
}

// ─── Dropzone ─────────────────────────────────────────────────
function Dropzone({ label, hint, icon, imageUrl, onFile, validate, accept, disabled }: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  imageUrl: string | null;
  onFile: (url: string, file: File) => void;
  validate?: (file: File, inputEl: HTMLInputElement | null) => Promise<boolean>;
  accept?: string;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (disabled) return;
    if (!file.type.startsWith("image/")) return;
    if (validate && !(await validate(file, inputRef.current))) return;
    onFile(URL.createObjectURL(file), file);
  }, [onFile, validate, disabled]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
      onDragOver={(e) => { if (!disabled) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative flex-1 min-h-[140px] rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center gap-2
        ${disabled
          ? "border-white/5 bg-white/[0.02] cursor-not-allowed opacity-40"
          : dragging ? "border-purple-500 bg-purple-500/10 cursor-pointer"
          : imageUrl ? "border-purple-500/40 bg-black/30 cursor-pointer"
          : "border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? "image/*"}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={label} className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="relative z-10 bg-black/60 rounded-lg px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
            {label} — click to change
          </div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.30)" }}>{icon}</div>
          <p className="text-sm font-semibold" style={{ color: "#8f98a0" }}>{label}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{hint}</p>
        </>
      )}
    </div>
  );
}

// ─── Placeholder data (giris yapilmamissa gosterilir) ───────
const placeholderFriends = [
  { name: "xX_ShadowFox_Xx", status: "CS2",           dot: "#5ba85b" },
  { name: "NeonRift",         status: "Dota 2",        dot: "#5ba85b" },
  { name: "velvetbyte",       status: "Hollow Knight", dot: "#5ba85b" },
  { name: "KairiSol",         status: "Online",        dot: "#4f9fbf" },
  { name: "pr0xima",          status: "Online",        dot: "#4f9fbf" },
];
const fakeGames = [
  { name: "Counter-Strike 2", hours: "1,240 hrs", last: "2 days ago", img: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/capsule_184x69.jpg" },
  { name: "Dota 2",           hours: "843 hrs",   last: "1 week ago", img: "https://cdn.cloudflare.steamstatic.com/steam/apps/570/capsule_184x69.jpg" },
];
const fakeComments = [
  { user: "NeonRift",   text: "bro that background is insane 🔥", time: "3 hours ago" },
  { user: "velvetbyte", text: "when are we playing?",             time: "Yesterday"   },
];

// ─── Steam arkadas durumu -> renk + etiket ────────────────────
function friendDot(f: SteamFriend): string {
  if (f.gameextrainfo) return "#5ba85b";   // oyunda -> yesil
  if (f.personastate === 1) return "#4f9fbf"; // online -> mavi
  if (f.personastate === 2) return "#4f9fbf"; // mesgul -> mavi
  if (f.personastate === 3) return "#a09040"; // uzakta -> sari
  return "#666";                            // cevrimdisi -> gri
}
function friendStatus(f: SteamFriend): string {
  if (f.gameextrainfo) return f.gameextrainfo;
  const map: Record<number, string> = { 1: "Online", 2: "Busy", 3: "Away", 4: "Snooze" };
  return map[f.personastate] ?? "Offline";
}

// badgeIconUrl kaldirildi -- URL'ler artik server tarafinda /api/steam/profile icinde
// GetAssetClassInfo ile cozumleniyor ve badge.iconUrl olarak geliyor.

// ─── Section styles ───────────────────────────────────────────
const sBox: React.CSSProperties = {
  background: "rgba(27,40,56,0.95)",
  borderRadius: 4,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.10)",
};
const sTitle: React.CSSProperties = {
  padding: "6px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontWeight: 600,
  color: "#8f98a0",
};

// ─── Main Page ────────────────────────────────────────────────
function UploadPageInner() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [bgUrl, setBgUrl]           = useState<string | null>(null);
  const [bgFile, setBgFile]         = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [progress, setProgress]           = useState(0);
  const [profileName, setProfileName]     = useState("SteamUser");
  const [profileLevel, setProfileLevel]   = useState("50");
  const [resetKey, setResetKey]           = useState(0);
  const [steamData, setSteamData]         = useState<SteamProfileData | null>(null);
  const [profileBackground, setProfileBackground] = useState<string | null>(null);
  const [panelOpacity, setPanelOpacity]   = useState(0.8);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [showcaseMode, setShowcaseMode] = useState<'classic' | 'featured' | null>(null);
  const [gifWarning, setGifWarning] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [opacityTip, setOpacityTip] = useState(false);

  useEffect(() => {
    if (!opacityTip) return;
    const handle = (e: PointerEvent) => {
      if (opacityTipRef.current && !opacityTipRef.current.contains(e.target as Node)) {
        setOpacityTip(false);
      }
    };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [opacityTip]);
  const [isPremiumImage, setIsPremiumImage] = useState(false);

  const outerRef  = useRef<HTMLDivElement>(null);
  const opacityTipRef = useRef<HTMLDivElement>(null);
  const masterRef = useRef<HTMLDivElement>(null);
  const [scaleFactor,  setScaleFactor]  = useState(1);
  const [scaledHeight, setScaledHeight] = useState(1000);

  const dynBox: React.CSSProperties = {
    ...sBox,
    background:           'rgba(23,26,33,' + panelOpacity + ')',
    backdropFilter:       panelOpacity > 0 ? 'blur(8px)' : 'none',
    WebkitBackdropFilter: panelOpacity > 0 ? 'blur(8px)' : 'none',
    border:               '1px solid rgba(255,255,255,' + (panelOpacity * 0.10) + ')',
  };

  // ── Galeriden / Studio'dan gelen URL parametrelerini isle ──────
  useEffect(() => {
    const template  = searchParams.get("template");
    const imageUrl  = searchParams.get("imageUrl");
    const source    = searchParams.get("source");
    if (searchParams.get("isPremium") === "true" || source === "ai-studio") setIsPremiumImage(true);

    if (template === "featured") {
      setShowcaseMode("featured");
    }

    if (imageUrl) {
      setBgUrl(imageUrl);
    }

    // ai-studio bridge: localStorage'daki base64 görseli arka plan yap
    if (source === "ai-studio") {
      const stored = localStorage.getItem("studio_generated_image");
      if (stored) {
        setBgUrl(stored);
        localStorage.removeItem("studio_generated_image");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Giris yapilmissa overlay'i kapat ────────────────────────
  useEffect(() => {
    if (status === "authenticated") {
      setOverlayVisible(false);
      setOverlayDismissed(true);
    }
  }, [status]);

  // ── Session'dan gelen Steam ismi ─────────────────────────────
  const sessionSynced = useRef(false);
  useEffect(() => {
    if (status === "authenticated" && session?.user && !sessionSynced.current) {
      const steamName = session.user.personaName ?? session.user.name ?? "SteamUser";
      setProfileName(steamName);
      sessionSynced.current = true;
    }
  }, [status, session]);

  // ── Steam API'den gercek profil verisi cek ───────────────────
  const levelSynced = useRef(false);
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/steam/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data: SteamProfileData | null) => {
        if (!data) return;
        setSteamData(data);
        if (data.profileBackground) setProfileBackground(data.profileBackground);
        // Seviyeyi ilk kez (kullanici degistirmediyse) doldur
        if (!levelSynced.current && data.level > 0) {
          setProfileLevel(String(data.level));
          levelSynced.current = true;
        }
      })
      .catch(() => {/* sessizce gec */});
  }, [status]);

  // ── Session'dan gelen Steam avatari ─────────────────────────
  const sessionAvatarUrl: string | null =
    status === "authenticated"
      ? (session?.user?.avatarFull ?? session?.user?.image ?? null)
      : null;

  // ── Onizlemede gosterilecek arkadas listesi ──────────────────
  const displayFriends = steamData?.friends && steamData.friends.length > 0
    ? steamData.friends
        .slice()
        .sort((a, b) => {
          const priority = (f: typeof a): number => {
            if (f.gameextrainfo) return 0;
            if (f.personastate > 0) return 1;
            return 2;
          };
          const diff = priority(a) - priority(b);
          if (diff !== 0) return diff;
          return a.personaname.localeCompare(b.personaname);
        })
        .map((f) => ({
          name:   f.personaname,
          status: friendStatus(f),
          dot:    friendDot(f),
        }))
    : placeholderFriends;

  const displayFriendCount = steamData?.friendCount ?? 35;

  // ── Onizlemede gosterilecek rozetler ─────────────────────────
  // iconUrl server'da GetAssetClassInfo ile cozumlendi -- dogrudan kullan
  const displayBadges: Array<{ key: string; icon: string; label: string }> =
    steamData?.badges && steamData.badges.length > 0
      ? steamData.badges.map((b, i) => ({
          key:   `badge-${i}`,
          icon:  b.iconUrl,
          label: `Lv${b.level}`,
        }))
      : [];

  // Resets all uploads and profile settings to defaults
  const handleReset = () => {
    setBgUrl(null);
    setBgFile(null);
    setAvatarUrl(null);
    setAvatarFile(null);
    const steamName = session?.user?.personaName ?? session?.user?.name ?? "SteamUser";
    setProfileName(steamName);
    const resetLevel = steamData?.level ? String(steamData.level) : "50";
    setProfileLevel(resetLevel);
    setPanelOpacity(0.8);
    sessionSynced.current = true;
    setResetKey((k) => k + 1); // forces Dropzone remount → clears file inputs
  };

  const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload  = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
      img.src = url;
    });

  const validateBackground = async (file: File, inputEl: HTMLInputElement | null): Promise<boolean> => {
    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      alert("Only JPEG, PNG, and GIF files are allowed for background.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File size exceeds 15MB limit.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    let dims: { width: number; height: number };
    try { dims = await readImageDimensions(file); } catch {
      alert("Could not read image dimensions.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    const minWidth = 630;
    if (dims.width < minWidth) {
      alert('Image must be at least 630px wide for high-quality Steam alignment.');
      if (inputEl) inputEl.value = "";
      return false;
    }
    if (dims.height < 800) {
      alert("Image must be at least 800px tall.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    if (dims.width > 4000 || dims.height > 4000) {
      alert("Image dimensions are too large. Max 4000px supported.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    return true;
  };

  const validateAvatar = async (file: File, inputEl: HTMLInputElement | null): Promise<boolean> => {
    const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];
    if (!ALLOWED.includes(file.type)) {
      alert(file.type === "image/gif"
        ? "GIF files are not supported for avatars."
        : "Only JPEG and PNG files are allowed for avatars.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File size exceeds 15MB limit.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    let dims: { width: number; height: number };
    try { dims = await readImageDimensions(file); } catch {
      alert("Could not read image dimensions.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    if (dims.width < 600) {
      alert("Image must be at least 600px wide.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    if (dims.height < 500) {
      alert("Image must be at least 500px tall.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    if (dims.width > 4000 || dims.height > 4000) {
      alert("Image dimensions are too large. Max 4000px supported.");
      if (inputEl) inputEl.value = "";
      return false;
    }
    return true;
  };

  const canProceed = !!bgUrl || !!avatarUrl;

  // Draws image onto a 1920x720 canvas using object-cover logic — no gaps
  const drawCoverCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width  = 1920;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    // Scale fills both dimensions — no empty space left
    const scale  = Math.max(1920 / img.width, 720 / img.height);
    const drawW  = img.width  * scale;
    const drawH  = img.height * scale;
    // Center align — no gaps on any edge
    const offsetX = (1920 - drawW) / 2;
    const offsetY = (720  - drawH) / 2;
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    return canvas;
  };

  // Crops a slice from the source canvas at the given x offset and width
  const cropCanvas = (source: HTMLCanvasElement, x: number, width: number): HTMLCanvasElement => {
    const out = document.createElement("canvas");
    out.width  = width;
    out.height = source.height;
    out.getContext("2d")!.drawImage(source, x, 0, width, source.height, 0, 0, width, source.height);
    return out;
  };

  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));

  const STEAM_MAX_BYTES  = 5242880;                          // 5 MB (Steam hard limit)
  const STEAM_SAFE_BYTES = Math.floor(4.95 * 1024 * 1024); // 4.95 MB -- backend ile eslesik

  // PNG (quality 1.0) → JPEG 1.0 → 0.95 → … → 0.10 (~5% steps).
  // Returns null if still above the safe limit at minimum quality.
  const canvasToBlobUnder5MB = async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
    const png = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    if (png.size <= STEAM_SAFE_BYTES) return png;
    let q = 1.0;
    while (q >= 0.10) {
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/jpeg", q)
      );
      if (blob.size <= STEAM_SAFE_BYTES) return blob;
      q = Math.round((q - 0.05) * 100) / 100;
    }
    return null;
  };

  const handleCutAndDownload = async () => {
    if (!bgUrl && !avatarUrl) {
      alert("Please upload at least a background image or an avatar.");
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);
    setProgress(0);
    setGifWarning(false);

    try {
      const zip = new JSZip();

      // ── Resolve gallery image to a local File if needed ──────────────────────
      let effectiveBgFile = bgFile;
      if (bgUrl && !bgFile) {
        try {
          let blob: Blob;
          if (bgUrl.startsWith("data:")) {
            // AI Studio'dan gelen base64 data URL — direkt fetch
            const res = await fetch(bgUrl);
            blob = await res.blob();
          } else {
            // Galeri görseli — R2 proxy üzerinden
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(bgUrl)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            blob = await res.blob();
          }
          const fileName = bgUrl.startsWith("data:") ? "ai_generated.png" : (bgUrl.split("/").pop()?.split("?")[0] ?? "gallery_image");
          effectiveBgFile = new File([blob], fileName, { type: blob.type || "image/png" });
          setBgFile(effectiveBgFile);
        } catch {
          alert("Could not load the gallery image. Please upload manually.");
          setIsProcessing(false);
          setProgress(0);
          return;
        }
      }

      // ── Avatar → 184×184 object-cover crop ───────────────────────────────────
      if (avatarUrl && avatarFile) {
        setProgress(5);
        const avatarImg = new Image();
        avatarImg.src   = avatarUrl;
        await new Promise<void>((res) => { avatarImg.onload = () => res(); });
        const SIZE = 184;
        const avatarCanvas  = document.createElement("canvas");
        avatarCanvas.width  = SIZE;
        avatarCanvas.height = SIZE;
        const ctx = avatarCanvas.getContext("2d")!;
        const scale   = Math.max(SIZE / avatarImg.width, SIZE / avatarImg.height);
        const drawW   = avatarImg.width  * scale;
        const drawH   = avatarImg.height * scale;
        const offsetX = (SIZE - drawW) / 2;
        const offsetY = (SIZE - drawH) / 2;
        ctx.drawImage(avatarImg, offsetX, offsetY, drawW, drawH);
        zip.file("steam_avatar.png", await canvasToBlob(avatarCanvas));
        setProgress(15);
      }

      // ── Background ────────────────────────────────────────────────────────────
      if (bgUrl && effectiveBgFile) {
        const isGif      = effectiveBgFile.type === "image/gif" ||
                           effectiveBgFile.name.toLowerCase().endsWith(".gif");
        const isFeatured = showcaseMode === "featured";
        const shouldWatermark = !isPremiumImage && !bgFile;

        if (isGif) {
          setProgress(20);
          const mode = isFeatured ? "featured" : "classic";
          const gifResults = await processGif(
            effectiveBgFile,
            mode,
            (p) => setProgress(20 + Math.round(p * 0.65)),
            () => setGifWarning(true)
          );
          for (const [name, blob] of Object.entries(gifResults)) {
            zip.file(name, blob);
          }
          setProgress(85);

        // ── Static image path: existing Canvas API logic ──────────────────────
        } else {
          setProgress(20);
          const bgImg      = new Image();
          const localBgUrl = URL.createObjectURL(effectiveBgFile);
          bgImg.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => {
            bgImg.onload  = () => { URL.revokeObjectURL(localBgUrl); res(); };
            bgImg.onerror = () => { URL.revokeObjectURL(localBgUrl); rej(new Error("Image load failed")); };
            bgImg.src = localBgUrl;
          });
          setProgress(40);

          const srcW    = bgImg.naturalWidth;
          const srcH    = bgImg.naturalHeight;
          const isElite = effectiveBgFile.size < ELITE_BYPASS_BYTES;

          if (isFeatured) {
            const targetW        = 630;
            const targetH        = Math.max(1, Math.round(srcH * (targetW / srcW)));
            const featuredCanvas = document.createElement("canvas");
            featuredCanvas.width  = targetW;
            featuredCanvas.height = targetH;
            featuredCanvas.getContext("2d")!
              .drawImage(bgImg, 0, 0, srcW, srcH, 0, 0, targetW, targetH);
            setProgress(70);
            if (shouldWatermark) await stampWatermark(featuredCanvas);
            if (isElite) {
              zip.file("featured_main.png", await canvasToBlob(featuredCanvas));
            } else {
              const blob = await canvasToBlobUnder5MB(featuredCanvas);
              if (!blob) { alert("File exceeds Steam's 5 MB limit."); setIsProcessing(false); setProgress(0); return; }
              zip.file("featured_main.jpg", blob);
            }

          } else {
            const masterW      = 612;
            const masterH      = Math.max(1, Math.round(srcH * (masterW / srcW)));
            const masterCanvas = document.createElement("canvas");
            masterCanvas.width  = masterW;
            masterCanvas.height = masterH;
            const mCtx = masterCanvas.getContext("2d")!;
            mCtx.fillStyle = "#000000";
            mCtx.fillRect(0, 0, masterW, masterH);
            mCtx.drawImage(bgImg, 0, 0, srcW, srcH, 0, 0, masterW, masterH);
            setProgress(70);

            const mainCrop = cropCanvas(masterCanvas, 0,   506);
            const sideCrop = cropCanvas(masterCanvas, 512, 100);
            if (shouldWatermark) await stampWatermark(sideCrop);

            if (isElite) {
              zip.file("main.png", await canvasToBlob(mainCrop));
              zip.file("side.png", await canvasToBlob(sideCrop));
            } else {
              const blobMain = await canvasToBlobUnder5MB(mainCrop);
              if (!blobMain) { alert("File exceeds Steam's 5 MB limit."); setIsProcessing(false); setProgress(0); return; }
              zip.file("main.jpg", blobMain);
              const blobSide = await canvasToBlobUnder5MB(sideCrop);
              if (!blobSide) { alert("File exceeds Steam's 5 MB limit."); setIsProcessing(false); setProgress(0); return; }
              zip.file("side.jpg", blobSide);
            }
          }
          setProgress(85);
        }
      }

      setProgress(95);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "steam_profile_design.zip");
      setProgress(100);

    } catch (err) {
      console.error("handleCutAndDownload error:", err);
      const msg = err instanceof Error ? err.message : "An error occurred during processing. Please try again.";
      alert(msg);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // ── MasterWrapper: container genişliği / 1920 = scale katsayısı ─────────────
  useEffect(() => {
    const outer  = outerRef.current;
    const master = masterRef.current;
    if (!outer || !master) return;
    const update = () => {
      const factor = Math.min(outer.offsetWidth / 1920, 1);
      setScaleFactor(factor);
      setScaledHeight(Math.round(master.scrollHeight * factor));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(master);
    return () => ro.disconnect();
  }, []);

  const pbLower   = profileBackground ? profileBackground.toLowerCase() : '';
  const bgIsVideo = !!profileBackground && (pbLower.indexOf('.mp4') !== -1 || pbLower.indexOf('.webm') !== -1);
  const bgIsImage = !!profileBackground && (pbLower.indexOf('.jpg') !== -1 || pbLower.indexOf('.jpeg') !== -1 || pbLower.indexOf('.png') !== -1 || pbLower.indexOf('.gif') !== -1);
  const bgMime    = pbLower.indexOf('.webm') !== -1 ? 'video/webm' : 'video/mp4';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <style>{`
        @keyframes shimmerFlow {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      {/* ── Upload Controls ── */}
      <div className="w-full max-w-[976px] mx-auto pt-10 px-4">
        <Link href="/"
          className="inline-block mb-8 text-lg font-semibold text-white hover:text-white/70 transition-colors">
          ← Back to Home
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-black mb-1" style={{
            backgroundImage: "linear-gradient(to right, #2563eb, #06b6d4)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}>
            Design Studio
          </h1>
          <p className="text-white/70 text-sm">Complete your profile — Background &amp; Avatar</p>
        </div>

        {/* GIF 5 MB uyarisi */}
        {gifWarning && (
          <div className="mb-4 flex items-start gap-3 rounded-xl px-5 py-4"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.40)" }}>
            <span style={{ fontSize: 18, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>⚠</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "#fca5a5", marginBottom: 2 }}>
                Quality adjusted to fit Steam limits.
              </p>
            </div>
            <button
              onClick={() => setGifWarning(false)}
              className="ml-auto flex-shrink-0 text-sm font-bold transition-opacity hover:opacity-60"
              style={{ color: "rgba(252,165,165,0.60)" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload panel */}
        <div className="rounded-xl p-5"
          style={{ background: "#11161d", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: "#8f98a0" }}>
            Artwork Showcase &amp; Avatar
          </p>

          {/* Showcase mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowcaseMode('classic')}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200"
              style={{
                background:   showcaseMode === 'classic' ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)",
                border:       showcaseMode === 'classic' ? "1px solid rgba(139,92,246,0.60)" : "1px solid rgba(255,255,255,0.10)",
                color:        showcaseMode === 'classic' ? "#c4b5fd" : "#8f98a0",
              }}
            >
              <span className="md:hidden">Classic</span>
              <span className="hidden md:inline">Artwork Showcase</span>
            </button>
            <button
              onClick={() => setShowcaseMode('featured')}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200"
              style={{
                background:   showcaseMode === 'featured' ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.04)",
                border:       showcaseMode === 'featured' ? "1px solid rgba(59,130,246,0.60)" : "1px solid rgba(255,255,255,0.10)",
                color:        showcaseMode === 'featured' ? "#93c5fd" : "#8f98a0",
              }}
            >
              <span className="md:hidden">Featured</span>
              <span className="hidden md:inline">Featured Artwork Showcase</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">

            {/* Background zone */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8f98a0" }}>Artwork Showcase</span>
                <div className="relative group">
                  <span className="text-[10px] cursor-help select-none font-bold leading-none" style={{ color: "#6b7280" }}>(?)</span>
                  <div className="absolute bottom-full left-0 mb-2 w-60 bg-gray-800 text-xs text-gray-200 p-2 rounded shadow-lg
                                  opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 whitespace-normal">
                    Max 15MB. Images are auto-scaled to 1920px for perfect Steam alignment. GIFs are auto-optimized.
                  </div>
                </div>
              </div>
              <Dropzone
                key={`bg-${resetKey}`}
                label="Artwork Showcase"
                hint="Select a mode above first"
                disabled={showcaseMode === null}
                icon={
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width={22} height={22}>
                    {/* Left panel */}
                    <rect x="2" y="8" width="13" height="32" rx="2" stroke="currentColor" strokeWidth="2.2" fill="none" opacity="0.6" />
                    {/* Center panel (larger) */}
                    <rect x="17" y="4" width="14" height="40" rx="2" stroke="currentColor" strokeWidth="2.2" fill="none" />
                    {/* Right panel */}
                    <rect x="33" y="8" width="13" height="32" rx="2" stroke="currentColor" strokeWidth="2.2" fill="none" opacity="0.6" />
                    {/* Center image indicator */}
                    <circle cx="24" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.7" />
                    <path d="M18 36 l4-6 3 4 3-3 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
                  </svg>
                }
                imageUrl={bgUrl}
                accept="image/jpeg,image/png,image/gif"
                validate={validateBackground}
                onFile={(url, file) => { setBgUrl(url); setBgFile(file); }}
              />
            </div>

            {/* Avatar zone */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8f98a0" }}>Avatar</span>
                <div className="relative group">
                  <span className="text-[10px] cursor-help select-none font-bold leading-none" style={{ color: "#6b7280" }}>(?)</span>
                  <div className="absolute bottom-full left-0 mb-2 w-60 bg-gray-800 text-xs text-gray-200 p-2 rounded shadow-lg
                                  opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 whitespace-normal">
                    Max 15MB. Steam does not support custom GIF avatars. Upload PNG or JPG.
                  </div>
                </div>
              </div>
              <Dropzone
                key={`av-${resetKey}`}
                label="Avatar"
                hint="Drag & drop or click"
                icon={
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width={22} height={22}>
                    {/* Head */}
                    <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2.2" fill="none" />
                    {/* Shoulders */}
                    <path d="M8 42 C8 32 16 26 24 26 C32 26 40 32 40 42" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                  </svg>
                }
                imageUrl={avatarUrl}
                accept="image/jpeg,image/png"
                validate={validateAvatar}
                onFile={(url, file) => { setAvatarUrl(url); setAvatarFile(file); }}
              />
            </div>

          </div>

          <button
            disabled={!canProceed || isProcessing}
            onClick={handleCutAndDownload}
            onPointerEnter={() => setBtnHovered(true)}
            onPointerLeave={() => setBtnHovered(false)}
            className="mt-5 w-full py-3 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed overflow-hidden"
            style={{
              background: "linear-gradient(90deg,#7c3aed,#3b82f6,#7c3aed,#3b82f6,#7c3aed)",
              backgroundSize: "300% auto",
              animation: "shimmerFlow 8s linear infinite",
              transition: "box-shadow 0.3s ease, transform 0.2s ease",
              boxShadow: "0 0 12px rgba(139,92,246,0.3)",
              transform: btnHovered && canProceed && !isProcessing ? "scale(1.012)" : "scale(1)",
            }}
          >
            <motion.span
              animate={btnHovered && canProceed && !isProcessing ? { rotate: [0, -20, 15, -8, 0] } : { rotate: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              style={{ display: "flex", alignItems: "center" }}
            >
              <Scissors size={15} />
            </motion.span>
            {isProcessing
              ? `Processing: ${progress}%`
              : "Cut & Download"}
            {!isProcessing && <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* ── Profile Settings + View Settings — yan yana ── */}
      <div className="w-full max-w-[976px] mx-auto px-4 mb-6 flex flex-col md:flex-row gap-4 md:gap-0 items-stretch">

        {/* Profile Settings */}
        <div className="flex-1 rounded-xl md:rounded-l-xl md:rounded-r-none px-5 py-4"
          style={{ background: "#11161d", border: "1px solid rgba(255,255,255,0.08)" }}>

          {/* Section header */}
          <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: "#8f98a0" }}>
            Profile Settings
          </p>

          <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">

            {/* Display Name */}
            <div className="flex flex-col gap-1.5 w-full md:flex-1">
              <label style={{ fontSize: 10, fontWeight: 600, color: "#8f98a0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Display Name
              </label>
              <input
                type="text"
                value={profileName}
                maxLength={32}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="SteamUser"
                className="rounded px-3 py-2 text-sm text-white outline-none w-full"
                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#c6d4df" }}
              />
              <span style={{ fontSize: 10, color: "#4b6a8a", textAlign: "right" }}>{profileName.length}/32</span>
            </div>

            {/* Level */}
            <div className="flex flex-col gap-1.5 w-full md:w-32">
              <label style={{ fontSize: 10, fontWeight: 600, color: "#8f98a0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Level
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={profileLevel}
                maxLength={6}
                onKeyDown={(e) => {
                  // Block any non-digit key before it reaches the input
                  if (!/^\d$/.test(e.key) && !["Backspace","Delete","ArrowLeft","ArrowRight","Tab"].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setProfileLevel(val);
                }}
                className="rounded px-3 py-2 text-sm outline-none w-full"
                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", color: "#c6d4df" }}
              />
            </div>

            {/* Reset All */}
            <div className="self-start md:self-end md:pb-[1px]">
              <button
                onClick={handleReset}
                className="rounded px-4 py-2 text-sm font-semibold transition-colors duration-150"
                style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.30)", color: "#fca5a5" }}
                onPointerEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)"; }}
                onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                Reset All
              </button>
            </div>

          </div>
        </div>

        {/* View Settings -- ayni stilde, sagda */}
        <div className="w-full md:w-64 flex-shrink-0 rounded-xl md:rounded-r-xl md:rounded-l-none px-5 py-4 flex flex-col justify-center gap-3"
          style={{ background: "#11161d", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <label style={{ fontSize: 10, fontWeight: 600, color: "#8f98a0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Panel Opacity
              </label>
              <div className="relative" ref={opacityTipRef}>
                <button
                  type="button"
                  onClick={() => setOpacityTip(v => !v)}
                  style={{ fontSize: 10, fontWeight: 700, color: opacityTip ? "#93c5fd" : "#4b6a8a", lineHeight: 1, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >(?)</button>
                {opacityTip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50">
                    <div className="bg-black/90 backdrop-blur-md border border-white/10 text-xs p-2 rounded-lg shadow-xl" style={{ color: "#c6d4df", lineHeight: 1.5 }}>
                      Standard opacity is 80%. Other opacity options are only available through the Steam Points Store, and the transparency range depends on the bundle you purchase.
                    </div>
                  </div>
                )}
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c6d4df" }}>
              {Math.round(panelOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panelOpacity}
            onChange={(e) => setPanelOpacity(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{
              height: 3,
              accentColor: "#004080",
              background: 'linear-gradient(to right,#004080 0%,#004080 ' + (panelOpacity * 100) + '%,rgba(255,255,255,0.12) ' + (panelOpacity * 100) + '%,rgba(255,255,255,0.12) 100%)',
              borderRadius: 999,
            }}
          />
          <div className="flex justify-between">
            <span className="text-gray-300 font-semibold tracking-wider" style={{ fontSize: 10 }}>0%</span>
            <span className="text-gray-300 font-semibold tracking-wider" style={{ fontSize: 10 }}>50%</span>
            <span className="text-gray-300 font-semibold tracking-wider" style={{ fontSize: 10 }}>100%</span>
          </div>
        </div>

      </div>

      {/* ── STEAM PREVIEW AREA ────────────────────────────────────────────────────
          Full-width background (1920px, top center).
          Profile content centered inside a 960px container.
          User sees the wallpaper side margins at the same ratio as Steam.
      ──────────────────────────────────────────────────────────────────────────── */}
      <div className="mt-10 w-full overflow-x-auto">
        <p className="md:hidden text-center text-xs mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>← Scroll to explore preview →</p>

        {/* 1920px canvas — bordered, centered, wallpaper lives here */}
        <div
          ref={outerRef}
          className="relative mx-auto overflow-hidden"
          style={{
            maxWidth: 1920,
            minWidth: 768,
            border:   "1px solid #2a475e",
            height:   scaledHeight,
          }}
        >
          {/* MasterWrapper — 1920px sabit canvas, CSS transform: scale ile preview'a indirgenir */}
          <div
            ref={masterRef}
            style={{
              position:        "absolute",
              top:             0,
              left:            0,
              width:           1920,
              transformOrigin: "top left",
              transform:       `scale(${scaleFactor})`,
            }}
          >
            {/* ── Background Layer — z-0, top:0'a sabit, vitrin büyüse de etkilenmez ── */}
            {bgIsImage && (
              <div
                style={{
                  position:           "absolute",
                  top:                0,
                  left:               0,
                  width:              1920,
                  height:             "100%",
                  zIndex:             0,
                  backgroundImage:    'url(' + profileBackground + ')',
                  backgroundSize:     "1920px auto",
                  backgroundPosition: "top left",
                  backgroundRepeat:   "no-repeat",
                  pointerEvents:      "none",
                }}
              />
            )}
          {/* ── Preview Access Overlay ── */}
          {!overlayDismissed && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                background: 'rgba(10,10,18,0.72)',
                opacity: overlayVisible ? 1 : 0,
                pointerEvents: overlayVisible ? 'auto' : 'none',
                transition: 'opacity 0.5s ease',
              }}
              onTransitionEnd={() => { if (!overlayVisible) setOverlayDismissed(true); }}
            >
              <div className="flex flex-col items-center gap-6 max-w-md w-full mx-4 rounded-2xl px-8 py-10"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z" />
                  </svg>
                </div>

                {/* Heading */}
                <h2 className="text-2xl font-black text-center" style={{
                  backgroundImage: 'linear-gradient(to right, #a855f7, #ffffff)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}>
                  Design Studio
                </h2>

                {/* Message */}
                <p className="text-center text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
                  Sign in to experience a fully compatible preview with your own Steam background, avatar, and profile details.
                </p>

                {/* Login with Steam — primary */}
                <button
                  onClick={() => { window.location.href = '/api/steam/login'; }}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-full font-semibold text-sm transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(to right, #7c3aed, #2563eb)',
                    boxShadow: '0 0 24px rgba(139,92,246,0.35)',
                    color: '#fff',
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z" />
                  </svg>
                  Login with Steam
                </button>

                {/* Continue as Guest — secondary */}
                <button
                  onClick={() => setOverlayVisible(false)}
                  className="w-full flex flex-col items-center gap-0.5 py-3 rounded-full font-semibold text-sm transition-colors hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.70)', background: 'transparent' }}
                >
                  <span>Continue as Guest</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>Try with default profile data</span>
                </button>

              </div>
            </div>
          )}

          {bgIsVideo ? (
            <video
              key={profileBackground}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 1 }}
            >
              <source src={profileBackground!} type={bgMime} />
            </video>
          ) : null}

        {/* LAYER 2 — 960px Steam profile content, z-10, horizontally centered */}
        <div
          className="relative z-10 max-w-[960px] mx-auto p-6 mb-20"
          style={{
            color:             "#8f98a0",
            fontFamily:        "Arial, 'Helvetica Neue', sans-serif",
            fontSize:          13,
            userSelect:        "none",
            boxShadow:            panelOpacity > 0 ? '0 0 0 1px rgba(255,255,255,0.08), 4px 0 12px rgba(0,0,0,0.5), -4px 0 12px rgba(0,0,0,0.5)' : 'none',
            backgroundColor:      'rgba(23,26,33,' + panelOpacity + ')',
            backdropFilter:       panelOpacity > 0 ? 'blur(8px)' : 'none',
            WebkitBackdropFilter: panelOpacity > 0 ? 'blur(8px)' : 'none',
          }}
        >

          {/* ── Profile Header ── */}
          <div className="flex flex-row items-start justify-between w-full px-4 pt-4 pb-3">

            {/* SOL: Avatar + Isim yan yana, ustten hizali */}
            <div className="flex flex-row items-start gap-5">

              {/* Avatar */}
              <div className="w-40 h-40 border-2 border-[#2a475e] relative overflow-hidden shrink-0">
                {avatarUrl ? (
                  <div className="w-full h-full bg-no-repeat bg-center bg-cover"
                    style={{ backgroundImage: 'url(' + avatarUrl + ')' }} />
                ) : sessionAvatarUrl ? (
                  <NextImage
                    src={sessionAvatarUrl}
                    alt={profileName}
                    fill
                    sizes="160px"
                    className="object-cover"
                    unoptimized={false}
                  />
                ) : (
                  <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                    <span style={{ fontSize: 64, fontWeight: 900, color: "rgba(255,255,255,0.65)" }}>?</span>
                  </div>
                )}
              </div>

              {/* Isim -- avatarin sagininda, ustle hizali */}
              <div className="flex flex-col justify-start pt-2">
                <h1 className="text-2xl font-bold text-white leading-tight">{profileName || "SteamUser"}</h1>
              </div>
            </div>

            {/* SAG: Level + Edit butonu */}
            <div className="flex flex-col items-end gap-3 pr-8 pt-2">
              <div className="flex flex-row items-center gap-2">
                <span className="text-gray-300 text-sm tracking-wider uppercase">Level</span>
                <div className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-white font-bold text-xs">
                  {profileLevel || "0"}
                </div>
              </div>
              <button className="bg-slate-700/80 hover:bg-slate-600 text-white px-4 py-1 rounded text-sm transition-colors">
                Edit Profile
              </button>
            </div>

          </div>

          {/* ── Content Grid ── */}
          <div className="grid grid-cols-[1fr_270px] gap-3">

            {/* Main column */}
            <div className="flex flex-col gap-3">

              {/* Artwork Showcase — mode-aware preview */}
              <div style={dynBox}>
                <div style={sTitle}>
                  {showcaseMode === 'featured' ? 'Featured Artwork Showcase' : 'Artwork Showcase'}
                </div>
                <div style={{ padding: 10, display: "flex", gap: showcaseMode === 'featured' ? 0 : 6 }}>

                  {showcaseMode === 'featured' ? (
                    /* ── Featured: single 630px box — full height, no crop ── */
                    <div style={{
                      width: 630, flexShrink: 0, borderRadius: 3,
                      backgroundColor: "#171a21",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxSizing: "border-box", overflow: "hidden",
                      ...(bgUrl ? {} : {
                        minHeight: 500,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 8,
                      }),
                    }}>
                      {bgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bgUrl} alt="Featured preview" style={{ width: "100%", height: "auto", display: "block" }} />
                      ) : (
                        <>
                          <span style={{ fontSize: 28, color: "rgba(255,255,255,0.08)", lineHeight: 1 }}>+</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.08)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Upload Artwork</span>
                        </>
                      )}
                    </div>

                  ) : (
                    /* ── Classic: 506px + gap(6px) + 100px — full height, shared 612px img ── */
                    <>
                      {/* main: shows x=0..505 of the 612px-wide image */}
                      <div style={{
                        width: 506, flexShrink: 0, borderRadius: 3,
                        backgroundColor: "#171a21",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxSizing: "border-box", overflow: "hidden",
                        ...(bgUrl ? {} : {
                          minHeight: 500,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: 8,
                        }),
                      }}>
                        {bgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={bgUrl} alt="Main preview" style={{ width: 612, height: "auto", display: "block", marginLeft: 0, maxWidth: "none" }} />
                        ) : (
                          <>
                            <span style={{ fontSize: 28, color: "rgba(255,255,255,0.08)", lineHeight: 1 }}>+</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.08)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Upload Artwork</span>
                          </>
                        )}
                      </div>
                      {/* side: shows x=512..611 of the 612px-wide image via negative margin */}
                      <div style={{
                        width: 100, flexShrink: 0, borderRadius: 3,
                        backgroundColor: "#171a21",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxSizing: "border-box", overflow: "hidden",
                        ...(bgUrl ? {} : {
                          minHeight: 500,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: 6,
                        }),
                      }}>
                        {bgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={bgUrl} alt="Side preview" style={{ width: 612, height: "auto", display: "block", marginLeft: -512, maxWidth: "none" }} />
                        ) : (
                          <>
                            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.08)", lineHeight: 1 }}>+</span>
                            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.08)", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>Side</span>
                          </>
                        )}
                      </div>
                    </>
                  )}

                </div>
              </div>

              {/* Recent Activity */}
              <div style={dynBox}>
                <div style={sTitle}>Recent Activity</div>
                <div style={{ padding: 10 }}>
                  {fakeGames.map((g) => (
                    <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <img
                        src={g.img}
                        alt={g.name}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        loading="lazy"
                        style={{ width: 92, height: 34, minWidth: 92, borderRadius: 3, flexShrink: 0, objectFit: "cover", display: "block" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#c6d4df" }}>{g.name}</div>
                        <div style={{ fontSize: 10 }}>{g.hours} on record · last played: {g.last}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div style={dynBox}>
                <div style={sTitle}>Comments</div>
                <div style={{ padding: 10 }}>
                  {fakeComments.map((c) => (
                    <div key={c.user} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 3, background: "#2a475e", flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#66c0f4" }}>{c.user} </span>
                        <span style={{ fontSize: 11 }}>{c.text}</span>
                        <div style={{ fontSize: 10, marginTop: 2, color: "#4b6a8a" }}>{c.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar — 270px */}
            <div className="flex flex-col gap-3">

              {/* Online durumu -- Friends kutusunun hemen ustunde */}
              <div style={{ paddingLeft: 4, paddingBottom: 2 }}>
                {status === "authenticated" ? (
                  <span style={{ fontSize: 16, color: "#57cbde" }}>Currently Online</span>
                ) : (
                  <span style={{ fontSize: 16, color: "#6a7a8a" }}>Offline</span>
                )}
              </div>

              <div style={dynBox}>
                <div style={sTitle}>
                  Friends{" "}
                  <span style={{ color: "#4c9e4c" }}>
                    {displayFriends.filter((f) => f.dot !== "#666").length} online
                  </span>
                </div>
                <div style={{ padding: 8 }}>
                  {displayFriends.map((f) => (
                    <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: f.dot }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#c6d4df", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        <div style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.status}</div>
                      </div>
                    </div>
                  ))}
                  {displayFriendCount > displayFriends.length && (
                    <div style={{ fontSize: 10, color: "#4b6a8a", marginTop: 4 }}>
                      +{displayFriendCount - displayFriends.length} more friends...
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
          </div>
      </div>
    </div>

      <Footer />
  </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadPageInner />
    </Suspense>
  );
}
