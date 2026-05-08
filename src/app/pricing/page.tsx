"use client";

import { motion } from "framer-motion";
import Header from "@/components/Header";
import { useSession } from "next-auth/react";
import { Check, Zap, Image, Sparkles } from "lucide-react";
import TokenIcon from "@/components/TokenIcon";

const PLANS = [
  {
    id:      "starter",
    name:    "Starter",
    price:   "1.99",
    tokens:  20,
    badge:   null,
    perks:   ["2 premium photos or", "1 AI generation", "Tokens never expire"],
    btnGradient: "linear-gradient(to right, #3b82f6, #6366f1)",
    cardBg:      "rgba(59,130,246,0.07)",
    cardBorder:  "rgba(99,102,241,0.3)",
    tokenColor:  "#818cf8",
    checkColor:  "#6366f1",
  },
  {
    id:      "popular",
    name:    "Popular",
    price:   "3.99",
    tokens:  50,
    badge:   { label: "Most Popular", icon: <Zap size={11} />, bg: "linear-gradient(to right,#7c3aed,#a855f7)" },
    perks:   ["5 premium photos or", "3 AI generations", "Tokens never expire"],
    btnGradient: "linear-gradient(to right, #7c3aed, #a855f7)",
    cardBg:      "rgba(124,58,237,0.12)",
    cardBorder:  "rgba(124,58,237,0.55)",
    tokenColor:  "#c084fc",
    checkColor:  "#a855f7",
  },
  {
    id:      "pro",
    name:    "Pro",
    price:   "6.99",
    tokens:  110,
    badge:   { label: "Best Value", icon: <Sparkles size={11} />, bg: "linear-gradient(to right,#d97706,#f59e0b)" },
    perks:   ["11 premium photos or", "7 AI generations", "Tokens never expire"],
    btnGradient: "linear-gradient(to right, #d97706, #f59e0b)",
    cardBg:      "linear-gradient(135deg, rgba(217,119,6,0.15), rgba(245,158,11,0.05))",
    cardBorder:  "rgba(251,191,36,0.55)",
    tokenColor:  "#fbbf24",
    checkColor:  "#f59e0b",
  },
];

export default function PricingPage() {
  const { data: session } = useSession();

  function handleBuy(plan: typeof PLANS[0]) {
    if (!session?.user) { window.location.href = "/api/steam/login"; return; }
    // TODO: Lemon Squeezy checkout URL'ini buraya ekle
    // Örnek: window.location.href = `https://vibeprofileit.lemonsqueezy.com/checkout/buy/${plan.lsVariantId}?checkout[custom][userId]=${session.user.userId}`
    alert(`${plan.name} paketi yakında aktif olacak.`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden flex flex-col">
      <Header />

      <main className="pt-32 pb-16 px-6 flex-1" style={{ maxWidth: "1140px", margin: "0 auto", width: "100%" }}>

        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <h1 className="text-5xl font-black tracking-tight mb-4"
            style={{ background: "linear-gradient(to right,#7c3aed,#a855f7,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Get Your Tokens
          </h1>
          <p className="text-white/40 text-base max-w-sm mx-auto leading-relaxed">
            Unlock premium photos or generate AI wallpapers. Tokens never expire.
          </p>
        </motion.div>

        {/* Token maliyetleri */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.4 }}
          className="flex justify-center gap-3 mb-16"
        >
          {[
            { icon: <Image size={14} />,    label: "Premium Photo",  cost: 10, color: "#818cf8" },
            { icon: <Sparkles size={14} />, label: "AI Generation",  cost: 15, color: "#dc2626" },
          ].map(({ icon, label, cost, color }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ color }}>{icon}</span>
              <span className="text-sm text-white/70 font-medium">{label}</span>
              <span className="text-sm font-black" style={label === "AI Generation" ? {
                background: "linear-gradient(to right, #dc2626, #ea580c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              } : { color }}>{cost} tokens</span>
            </div>
          ))}
        </motion.div>

        {/* Kartlar */}
        <style>{`
          @keyframes proGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.2), 0 0 60px rgba(251,191,36,0.06), 0 24px 48px rgba(0,0,0,0.45); }
            50%       { box-shadow: 0 0 38px rgba(251,191,36,0.38), 0 0 90px rgba(251,191,36,0.13), 0 24px 48px rgba(0,0,0,0.45); }
          }
          .pro-card { animation: proGlow 3s ease-in-out infinite; }
        `}</style>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:items-end">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 28, scale: 1 }}
              animate={{
                opacity: 1,
                y: plan.id === "pro" ? -12 : 0,
                scale: plan.id === "pro" ? 1.04 : 1,
              }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.45 }}
              className={`relative rounded-2xl flex flex-col${plan.id === "pro" ? " pro-card" : ""}`}
              style={{
                background: plan.cardBg,
                border: plan.id === "pro"
                  ? "2px solid rgba(251,191,36,0.6)"
                  : `1px solid ${plan.cardBorder}`,
                padding: "36px 32px",
              }}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: plan.badge.bg }}>
                    {plan.badge.icon} {plan.badge.label}
                  </span>
                </div>
              )}

              <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: plan.tokenColor }}>
                {plan.name}
              </p>

              <div className="flex items-start gap-1 mb-5">
                <span className="text-2xl font-black mt-1" style={{ color: plan.tokenColor }}>$</span>
                <span className="text-6xl font-black leading-none text-white">{plan.price.split(".")[0]}</span>
                <span className="text-2xl font-black mt-1 text-white/60">.{plan.price.split(".")[1]}</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mb-8 w-fit"
                style={{ background: `${plan.cardBorder}33`, border: `1px solid ${plan.cardBorder}` }}>
                <TokenIcon size={16} />
                <span className="text-2xl font-black" style={{ color: plan.tokenColor }}>{plan.tokens}</span>
                <span className="text-sm font-semibold text-white/50">tokens</span>
              </div>

              <div className="mb-6" style={{ height: "1px", background: `${plan.cardBorder}66` }} />

              <ul className="flex flex-col gap-4 mb-10 flex-1">
                {plan.perks.map(perk => (
                  <li key={perk} className="flex items-center gap-3 text-sm font-medium text-white/80">
                    <Check size={15} style={{ color: plan.checkColor, flexShrink: 0 }} />
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuy(plan)}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-transform duration-200 hover:scale-105 active:scale-95"
                style={{ background: plan.btnGradient }}
              >
                Get {plan.tokens} Tokens
              </button>
            </motion.div>
          ))}
        </div>

      </main>

      {/* Trust Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-14 mb-4"
      >
        {/* 4 Trust Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[
            { icon: "🔒", label: "256-bit Encryption" },
            { icon: "⚡", label: "Instant Token Delivery" },
            { icon: "♾️",  label: "Tokens Never Expire" },
            { icon: "💳", label: "All Cards Accepted" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/50"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Lemon Squeezy badge + card logos row */}
        <div className="flex flex-col items-center gap-3">
          {/* Lemon Squeezy */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 21 28" width="18" height="24">
              <path fill="#FFC233" fillRule="evenodd" d="m6.92882 17.1856 7.51128 3.4727c.931.4306 1.5881 1.1533 1.943 1.9823.8976 2.0993-.3292 4.2463-2.255 5.0185-1.9262.7718-3.979.2751-4.91242-1.908l-3.26891-7.6645c-.25331-.5941.38303-1.1779.98205-.901Zm.45024-2.248 7.75364-2.931c2.5769-.9741 5.3918.869 5.3538 3.547-.0006.035-.0012.0699-.0021.1052-.0557 2.6078-2.7923 4.3606-5.3126 3.438l-7.7854-2.8495c-.62104-.2272-.62563-1.076-.00734-1.3097Zm-.43407-1.0152 7.62211-3.2387c2.5328-1.07634 3.1756-4.30675 1.1919-6.17327a9.026257 9.026257 0 0 0-.0783-.07315c-1.9449-1.80521-5.1599-1.16961-6.26712 1.20811L5.99323 12.9915c-.2729.5858.34387 1.1891.95176.9309Zm-1.9615-1.2798 2.77116-7.59845c.34357-.94215.27993-1.90295-.07526-2.73195C6.77994.21378 4.34409-.463579 2.41853.309741.493284 1.08336-.594621 2.84029.340622 5.02253L3.63095 12.6787c.25515.5933 1.13166.5699 1.35254-.0361Z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs font-semibold text-white/30">Powered by</span>
            <span className="text-xs font-black text-white/50 tracking-tight">Lemon Squeezy</span>
          </div>

          {/* Card logos */}
          <div className="flex items-center gap-2">
            {/* Visa */}
            <div className="flex items-center justify-center px-3 py-2 rounded"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", width: 72, height: 44 }}>
              <svg viewBox="0 0 48 16" width="54" height="18">
                <text x="0" y="13" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="14" fill="#1A1F71" letterSpacing="-0.5">VISA</text>
              </svg>
            </div>

            {/* Mastercard */}
            <div className="flex items-center justify-center rounded"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", width: 72, height: 44 }}>
              <svg viewBox="0 0 38 24" width="50" height="32">
                <circle cx="14" cy="12" r="10" fill="#EB001B" />
                <circle cx="24" cy="12" r="10" fill="#F79E1B" />
                <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00" />
              </svg>
            </div>

            {/* Amex */}
            <div className="flex items-center justify-center px-2 py-2 rounded"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", width: 72, height: 44 }}>
              <svg viewBox="0 0 50 18" width="56" height="20">
                <text x="0" y="13" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" fill="#2E77BC" letterSpacing="0.5">AMEX</text>
              </svg>
            </div>
          </div>

          {/* Policy text */}
          <div className="text-center" style={{ maxWidth: 500 }}>
            <p className="text-sm text-white/30 leading-relaxed">
              All sales are final. Tokens are credited instantly and never expire.
            </p>
            <div className="my-3" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <p className="text-sm text-white/45 leading-relaxed">
              However, if you experience a technical issue or were charged but didn&apos;t receive your tokens,
              contact us via the{" "}
              <span className="font-semibold" style={{ color: "#a78bfa" }}>
                Help &amp; Feedback
              </span>{" "}
              button.
            </p>
          </div>
        </div>
      </motion.div>

      <footer
        className="border-t py-8 text-center text-white/20 text-sm"
        style={{ borderColor: "rgba(255,255,255,0.05)", marginTop: "auto" }}
      >
        © 2026 VibeProfileit — Made by SirHacktan for the Steam Community with ❤️. All rights reserved.
      </footer>
    </div>
  );
}
