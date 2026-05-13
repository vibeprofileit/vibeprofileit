import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-6 text-center">
      <div
        className="text-[120px] font-black leading-none mb-4 select-none"
        style={{
          backgroundImage: "linear-gradient(to right, #7c3aed, #a855f7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </div>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-white/40 text-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full font-semibold text-sm text-white transition-opacity hover:opacity-80"
        style={{ background: "linear-gradient(to right, #7c3aed, #a855f7)" }}
      >
        Back to Home
      </Link>
    </div>
  );
}
