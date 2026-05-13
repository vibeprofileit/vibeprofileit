export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-8 text-center text-white/20 text-sm">
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-3 text-white/30 text-xs">
        <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
        <a href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</a>
        <a href="/refund" className="hover:text-white/60 transition-colors">Refund Policy</a>
        <a href="/contact" className="hover:text-white/60 transition-colors">Contact Us</a>
      </div>
      © 2026 VibeProfileit — Designed by SirHacktan. All rights reserved.
    </footer>
  );
}
