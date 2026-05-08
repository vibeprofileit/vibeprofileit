"use client";

import { motion } from "framer-motion";
import Header from "@/components/Header";
import { useSession } from "next-auth/react";
import { Check, Zap, Image, Sparkles } from "lucide-react";

const PLANS = [
  {
    name:    "Starter",
    price:   "$1.99",
    tokens:  20,
    popular: false,
    pro:     false,
    perks: [
      "20 tokens",
      "2 premium photos",
      "1 AI generation",
      "No expiry",
    ],
  },
  {
    name:    "Popular",
    price:   "$3.99",
    tokens:  50,
    popular: true,
    pro:     false,
    perks: [
      "50 tokens",
      "5 premium photos",
      "3 AI generations",
      "No expiry",
    ],
  },
  {
    name:    "Pro",
    price:   "$6.99",
    tokens:  110,
    popular: false,
    pro:     true,
    perks: [
      "110 tokens",
      "11 premium photos",
      "7 AI generations",
      "No expiry",
    ],
  },
];

const TOKEN_COSTS = [
  { icon: <Image size={16} />,    label: "Premium Photo",  cost: 10 },
  { icon: <Sparkles size={16} />, label: "AI Generation",  cost: 15 },
];

export default function PricingPage() {
  const { data: session } = useSession();

  function handleBuy(plan: typeof PLANS[0]) {
    if (!session?.user) {
      window.location.href = "/api/steam/login";
      return;
    }
    // Stripe entegrasyonu Sprint 2'de gelecek
    alert(`${plan.name} paketi yakında aktif olacak.`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Header />

      <main className="pt-32 pb-24 px-6" style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-violet-400 mb-4 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10">
            Token Packs
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4"
            style={{ background: "linear-gradient(to right, #7c3aed, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Get Your Tokens
          </h1>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Use tokens to unlock premium photos or generate AI wallpapers. Tokens never expire.
          </p>
        </motion.div>

        {/* Token maliyetleri */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex justify-center gap-4 mb-14"
        >
          {TOKEN_COSTS.map(({ icon, label, cost }) => (
            <div key={label} className="flex items-center gap-2.5 px-4 py-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-violet-400">{icon}</span>
              <span className="text-sm text-white/60 font-medium">{label}</span>
              <span className="text-sm font-bold text-white">{cost} tokens</span>
            </div>
          ))}
        </motion.div>

        {/* Paketler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.45 }}
              className="relative rounded-2xl flex flex-col"
              style={{
                background: plan.pro
                  ? "linear-gradient(135deg, rgba(220,38,38,0.12), rgba(234,88,12,0.08))"
                  : plan.popular
                  ? "rgba(124,58,237,0.12)"
                  : "rgba(255,255,255,0.03)",
                border: plan.pro
                  ? "1px solid rgba(239,68,68,0.35)"
                  : plan.popular
                  ? "1px solid rgba(124,58,237,0.6)"
                  : "1px solid rgba(255,255,255,0.1)",
                padding: "32px 28px",
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: "linear-gradient(to right, #7c3aed, #a855f7)", color: "#fff" }}>
                    <Zap size={11} /> Most Popular
                  </span>
                </div>
              )}
              {plan.pro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: "linear-gradient(to right, #dc2626, #ea580c)", color: "#fff" }}>
                    <Sparkles size={11} /> Best Value
                  </span>
                </div>
              )}

              {/* İsim + fiyat */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-2">{plan.name}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>
                  <span className="text-violet-300 font-bold text-sm">{plan.tokens}</span>
                  <span className="text-violet-400/70 text-xs font-medium">tokens</span>
                </div>
              </div>

              {/* Özellikler */}
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.perks.map(perk => (
                  <li key={perk} className="flex items-center gap-2.5 text-sm text-white/80">
                    <Check size={14} className={`flex-shrink-0 ${plan.pro ? "text-rose-400" : "text-violet-400"}`} />
                    {perk}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleBuy(plan)}
                className="w-full py-3 rounded-xl font-bold text-sm transition-transform duration-200 hover:scale-105 active:scale-95"
                style={plan.pro ? {
                  background: "linear-gradient(to right, #dc2626, #ea580c)",
                  color: "#fff",
                } : plan.popular ? {
                  background: "linear-gradient(to right, #7c3aed, #a855f7)",
                  color: "#fff",
                } : {
                  background: "rgba(255,255,255,0.06)",
                  border:     "1px solid rgba(255,255,255,0.12)",
                  color:      "rgba(255,255,255,0.85)",
                }}
              >
                Get {plan.tokens} Tokens
              </button>
            </motion.div>
          ))}
        </div>

        {/* Alt not */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/20 text-xs mt-12"
        >
          Payments processed securely by Stripe. Tokens are non-refundable.
        </motion.p>
      </main>
    </div>
  );
}
