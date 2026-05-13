"use client";

import Header from "@/components/Header";
import { Mail, Clock, HelpCircle } from "lucide-react";
import Footer from "@/components/Footer";
import { useState } from "react";

export default function ContactPage() {
  const [email, setEmail]       = useState("");
  const [message, setMessage]   = useState("");
  const [status, setStatus]     = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !message) return;

    const tokenInput = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("[name='cf-turnstile-response']");
    const turnstileToken = tokenInput?.value || "";

    setStatus("sending");
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message, turnstileToken }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

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
            { icon: <Mail size={20} />, label: "Email", value: "vibeprofileit@gmail.com", href: "mailto:vibeprofileit@gmail.com", color: "#818cf8" },
            { icon: <Clock size={20} />, label: "Response Time", value: "Within 72 business hours", href: null, color: "#a855f7" },
            { icon: <HelpCircle size={20} />, label: "In-App Support", value: "Use the contact form below", href: null, color: "#c084fc" },
          ].map(({ icon, label, value, href, color }) => (
            <div key={label} className="rounded-2xl p-6"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="mb-3" style={{ color }}>{icon}</div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</p>
              {href ? (
                <a href={href} className="text-sm font-semibold underline" style={{ color }}>{value}</a>
              ) : (
                <p className="text-sm font-semibold text-white/70">{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <div className="rounded-2xl p-6 mb-10"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-lg font-bold mb-5">Send us a message</h2>

          {status === "sent" ? (
            <div className="py-10 text-center">
              <p className="text-violet-400 font-semibold mb-1">Message sent!</p>
              <p className="text-white/40 text-sm">We&apos;ll get back to you within 72 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/30">
                  Your Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  onFocus={e => { e.currentTarget.style.border = "1px solid rgba(124,58,237,0.5)"; }}
                  onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/30">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  className="rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  onFocus={e => { e.currentTarget.style.border = "1px solid rgba(124,58,237,0.5)"; }}
                  onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
                />
              </div>

              <div
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                data-theme="dark"
              />

              {status === "error" && (
                <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "linear-gradient(to right, #7c3aed, #a855f7)" }}
              >
                {status === "sending" ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
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
              <div key={topic} className="flex gap-4 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: "#7c3aed", alignSelf: "stretch" }} />
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{topic}</p>
                  <p className="text-xs text-white/40">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
