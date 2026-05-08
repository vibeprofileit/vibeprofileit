"use client";

import { motion } from "framer-motion";
import Header from "@/components/Header";
import { useSession } from "next-auth/react";
import { Check, Zap, Image, Sparkles } from "lucide-react";

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
    badge:   { label: "Best Value", icon: <Sparkles size={11} />, bg: "linear-gradient(to right,#dc2626,#ea580c)" },
    perks:   ["11 premium photos or", "7 AI generations", "Tokens never expire"],
    btnGradient: "linear-gradient(to right, #dc2626, #ea580c)",
    cardBg:      "linear-gradient(135deg, rgba(220,38,38,0.12), rgba(234,88,12,0.07))",
    cardBorder:  "rgba(239,68,68,0.4)",
    tokenColor:  "#fb923c",
    checkColor:  "#f97316",
  },
];

export default function PricingPage() {
  const { data: session } = useSession();

  function handleBuy(plan: typeof PLANS[0]) {
    if (!session?.user) { window.location.href = "/api/steam/login"; return; }
    alert(`${plan.name} paketi yakında aktif olacak.`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Header />

      <main className="pt-32 pb-28 px-6" style={{ maxWidth: "1140px", margin: "0 auto" }}>

        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-violet-400 mb-5 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10">
            Token Packs
          </span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.45 }}
              className="relative rounded-2xl flex flex-col"
              style={{
                background:  plan.cardBg,
                border:      `1px solid ${plan.cardBorder}`,
                padding:     "36px 32px",
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: plan.badge.bg }}>
                    {plan.badge.icon} {plan.badge.label}
                  </span>
                </div>
              )}

              {/* Plan adı */}
              <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: plan.tokenColor }}>
                {plan.name}
              </p>

              {/* Fiyat */}
              <div className="flex items-start gap-1 mb-5">
                <span className="text-2xl font-black mt-1" style={{ color: plan.tokenColor }}>$</span>
                <span className="text-6xl font-black leading-none text-white">{plan.price.split(".")[0]}</span>
                <span className="text-2xl font-black mt-1 text-white/60">.{plan.price.split(".")[1]}</span>
              </div>

              {/* Token badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mb-8 w-fit"
                style={{ background: `${plan.cardBorder}33`, border: `1px solid ${plan.cardBorder}` }}>
                <span className="text-2xl font-black" style={{ color: plan.tokenColor }}>{plan.tokens}</span>
                <span className="text-sm font-semibold text-white/50">tokens</span>
              </div>

              {/* Ayırıcı */}
              <div className="mb-6" style={{ height: "1px", background: `${plan.cardBorder}66` }} />

              {/* Özellikler */}
              <ul className="flex flex-col gap-4 mb-10 flex-1">
                {plan.perks.map(perk => (
                  <li key={perk} className="flex items-center gap-3 text-sm font-medium text-white/80">
                    <Check size={15} style={{ color: plan.checkColor, flexShrink: 0 }} />
                    {perk}
                  </li>
                ))}
              </ul>

              {/* CTA */}
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

        {/* Alt not */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="text-center text-white/20 text-xs mt-14"
        >
          Payments processed securely by Stripe. Tokens are non-refundable.
        </motion.p>
      </main>
    </div>
  );
}
