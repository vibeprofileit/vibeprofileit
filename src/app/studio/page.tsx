import Link from "next/link";

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-black text-white">Under Construction: AI Studio</h1>
      <Link href="/" className="px-6 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all text-sm font-medium">
        Back to Home
      </Link>
    </div>
  );
}
