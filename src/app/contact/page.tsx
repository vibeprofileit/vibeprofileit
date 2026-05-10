import Header from "@/components/Header";
import { Mail, Clock, HelpCircle } from "lucide-react";

export const metadata = { title: "Contact Us — VibeProfileit" };

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-20 px-6" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <h1 className="text-4xl font-black mb-2">Contact Us</h1>
        <p className="text-white/40 text-sm mb-12">
          We&apos;re a small team — but we read every message and respond as quickly as we can.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
          {[
            {
              icon: <Mail size={20} />,
              label: "Email",
              value: "vibeprofileit@gmail.com",
              href: "mailto:vibeprofileit@gmail.com",
              color: "#818cf8",
            },
            {
              icon: <Clock size={20} />,
              label: "Response Time",
              value: "Within 48 business hours",
              href: null,
              color: "#a855f7",
            },
            {
              icon: <HelpCircle size={20} />,
              label: "In-App Support",
              value: "Use the Help & Feedback button",
              href: null,
              color: "#c084fc",
            },
          ].map(({ icon, label, value, href, color }) => (
            <div
              key={label}
              className="rounded-2xl p-6"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="mb-3" style={{ color }}>{icon}</div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</p>
              {href ? (
                <a href={href} className="text-sm font-semibold underline" style={{ color }}>
                  {value}
                </a>
              ) : (
                <p className="text-sm font-semibold text-white/70">{value}</p>
              )}
            </div>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-bold mb-5 text-white">What can we help you with?</h2>
          <div className="space-y-3">
            {[
              { topic: "Token delivery issue", detail: "Charged but tokens not credited — include your Lemon Squeezy order number." },
              { topic: "Refund request", detail: "See our Refund Policy first. If eligible, email with your order number and SteamID." },
              { topic: "AI generation problem", detail: "Describe the prompt you used and the issue you encountered." },
              { topic: "Account or login issue", detail: "Include your Steam display name or SteamID64." },
              { topic: "Other", detail: "Any feedback, bug reports, or general questions are welcome." },
            ].map(({ topic, detail }) => (
              <div
                key={topic}
                className="flex gap-4 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: "#7c3aed", alignSelf: "stretch" }} />
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{topic}</p>
                  <p className="text-xs text-white/40">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          <p className="text-sm text-white/50 mb-3">Ready to reach out?</p>
          <a
            href="mailto:vibeprofileit@gmail.com"
            className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white transition-transform duration-200 hover:scale-105"
            style={{ background: "linear-gradient(to right, #7c3aed, #a855f7)" }}
          >
            Send us an Email
          </a>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}

function LegalFooter() {
  return (
    <footer className="border-t border-white/5 py-8 text-center text-white/20 text-sm">
      <div className="flex justify-center gap-6 mb-3 text-white/30 text-xs">
        <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
        <a href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</a>
        <a href="/refund" className="hover:text-white/60 transition-colors">Refund Policy</a>
        <a href="/contact" className="hover:text-white/60 transition-colors">Contact Us</a>
      </div>
      © 2026 VibeProfileit — All rights reserved.
    </footer>
  );
}
