"use client";

import { motion } from "framer-motion";
import { Upload, Library, Sparkles, ChevronRight } from "lucide-react";
import type { Variants } from "framer-motion";
import Link from "next/link";
import Header from "@/components/Header";

const routes = [
  {
    id: "custom-upload",
    href: "/design-studio",
    icon: Upload,
    title: "Design Studio",
    subtitle: "Your style, your visuals",
    description:
      "Upload your own or our artwork in PNG, JPG, or GIF format. Create a pixel-perfect Steam profile.",
    gradient: "from-blue-600/20 to-cyan-500/20",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/10",
    tag: "Your Visuals",
    tagColor: "bg-blue-500/20 text-blue-300",
  },
  {
    id: "elite-library",
    href: "/gallery",
    icon: Library,
    title: "Elite Gallery",
    subtitle: "Premium collections, ready to customize",
    description:
      "Browse hundreds of premium Steam profile designs. Find your favorite vibe and perfect it using our professional Design Studio tools.",
    gradient: "from-violet-600/20 to-purple-500/20",
    border: "border-violet-500/30",
    glow: "shadow-violet-500/10",
    tag: "Most Popular",
    tagColor: "bg-violet-500/20 text-violet-300",
  },
  {
    id: "ai-studio",
    href: "/ai-studio",
    icon: Sparkles,
    title: "AI Studio",
    subtitle: "Imagine, describe, create",
    description:
      "Write a prompt and let AI generate your Steam profile in seconds. Unlimited iterations, unique results.",
    gradient: "from-rose-600/20 to-orange-500/20",
    border: "border-rose-500/30",
    glow: "shadow-rose-500/10",
    tag: "New",
    tagColor: "bg-rose-500/20 text-rose-300",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="pt-36 pb-16 px-6 text-center relative">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-violet-400 mb-4 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10">
            Steam Profile Design Platform
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6" style={{
            backgroundImage: "linear-gradient(to right, #e0f2fe, #22d3ee, #06b6d4, #a855f7, #d946ef)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            lineHeight: "1.25",
            paddingBottom: "6px",
          }}>
            The Most Powerful Engine for Your Steam Aesthetic
          </h1>
          <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto mb-2 leading-relaxed tracking-wide whitespace-nowrap">
            Professional tools to design, customize, and elevate your profile.
          </p>
          <p className="text-white/90 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed tracking-wide">
            All in one place.
          </p>
          <style>{`
            @keyframes nebulaShift {
              0%   { background-position: 0% 50%; }
              50%  { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes shimmerPass {
              0%   { transform: translateX(-120%) skewX(-20deg); }
              100% { transform: translateX(320%) skewX(-20deg); }
            }
            @keyframes pulseX {
              0%, 100% { transform: translateX(0px); }
              50%       { transform: translateX(4px); }
            }
            .vg-nebula {
              background: linear-gradient(120deg, rgba(188,19,254,0.18) 0%, rgba(139,92,246,0.22) 40%, rgba(236,72,153,0.14) 70%, rgba(188,19,254,0.18) 100%);
              background-size: 250% 250%;
              animation: nebulaShift 5s ease infinite;
            }
            .ai-nebula {
              background: linear-gradient(120deg, rgba(225,29,72,0.18) 0%, rgba(249,115,22,0.22) 40%, rgba(220,38,38,0.14) 70%, rgba(225,29,72,0.18) 100%);
              background-size: 250% 250%;
              animation: nebulaShift 5s ease infinite;
            }
            .vg-shimmer::after {
              content: '';
              position: absolute;
              top: 0; bottom: 0;
              width: 40%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
              animation: shimmerPass 3s ease-in-out infinite;
            }
            .gs-arrow {
              animation: pulseX 1.2s ease-in-out infinite;
            }
          `}</style>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 340, damping: 22 }}
            >
              <Link
                href="/design-studio"
                className="relative overflow-hidden flex items-center justify-center px-8 py-3.5 rounded-full font-bold text-white transition-all duration-300"
                style={{
                  background: "linear-gradient(to right, #2563eb, #06b6d4)",
                }}
              >
                Design Tool
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
              <Link
                href="/gallery"
                className="vg-nebula vg-shimmer relative overflow-hidden flex items-center gap-2 justify-center px-8 py-3.5 rounded-full font-semibold text-white transition-all duration-300"
                style={{
                  border: "1px solid rgba(188,19,254,0.45)",
                }}
              >
                View Gallery
                <span className="gs-arrow" style={{ color: "rgba(188,19,254,0.85)" }}><ChevronRight size={16} /></span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
              <Link
                href="/ai-studio"
                className="ai-nebula vg-shimmer relative overflow-hidden flex items-center gap-2 justify-center px-11 py-3.5 rounded-full font-semibold text-white transition-all duration-300"
                style={{
                  border: "1px solid rgba(225,29,72,0.45)",
                }}
              >
                AI Studio
                <span className="gs-arrow" style={{ color: "rgba(249,115,22,0.85)" }}><ChevronRight size={16} /></span>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Steam Profile Mockup */}
      <section className="px-6 pb-24 flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          {/* Browser chrome */}
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-500/10">
            {/* Chrome bar */}
            <div className="bg-[#1a1a2e] px-4 py-3 flex items-center gap-2 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 mx-4 bg-white/5 rounded-md px-3 py-1 text-xs text-white/30 text-center">
                steamcommunity.com/id/yourprofile
              </div>
            </div>

            {/* Steam Profile Card */}
            <div className="bg-[#1b2838] relative overflow-hidden">
              {/* Profile banner */}
              <div className="h-36 bg-gradient-to-r from-[#1a1a3e] via-violet-900/50 to-[#1a2a3e] relative">
                {/* Animated grid overlay */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1b2838]/80" />
                {/* Glow orbs */}
                <div className="absolute top-4 left-1/3 w-24 h-24 bg-violet-500/30 rounded-full blur-2xl" />
                <div className="absolute top-2 right-1/4 w-16 h-16 bg-blue-500/30 rounded-full blur-xl" />
              </div>

              {/* Profile info row */}
              <div className="px-6 pb-6 -mt-10 relative">
                <div className="flex items-end gap-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-xl border-2 border-[#4a9eff] bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                    <span className="text-3xl">🎮</span>
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-lg">YourUsername</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#4a9eff]/20 text-[#4a9eff] border border-[#4a9eff]/30">Online</span>
                    </div>
                    <p className="text-white/40 text-sm">Level 42 · 847 games · 12,340 hours</p>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Badges", value: "124" },
                    { label: "Friends", value: "89" },
                    { label: "Achievements", value: "2.4K" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#16202d] rounded-lg px-3 py-2.5 text-center border border-white/5">
                      <div className="text-white font-bold text-base">{s.value}</div>
                      <div className="text-white/30 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Showcase placeholder */}
                <div className="mt-4 bg-[#16202d] rounded-lg p-3 border border-white/5">
                  <div className="text-xs text-white/30 mb-2 uppercase tracking-wider">Profile Showcase</div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-12 rounded bg-gradient-to-br from-violet-900/30 to-blue-900/30 border border-white/5 flex items-center justify-center"
                      >
                        <div className="w-6 h-6 rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vibe badge overlay */}
              <div className="absolute top-4 right-4 text-xs px-2.5 py-1 rounded-full bg-violet-600/80 backdrop-blur-sm border border-violet-400/30 font-semibold">
                ✦ vibe profile
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Route Cards */}
      <section className="px-6 pb-32 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-3">
            Choose your path
          </h2>
          <p className="text-white/40 text-base">Three ways to build perfection.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {routes.map((route, i) => (
            <Link key={route.id} href={route.href}>
            <motion.div
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`relative group rounded-2xl border ${route.border} bg-gradient-to-br ${route.gradient} p-6 cursor-pointer shadow-xl ${route.glow} hover:shadow-2xl transition-shadow overflow-hidden`}
            >
              {/* Card glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />

              <div className="relative">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
                  <route.icon size={22} className="text-white" />
                </div>

                {/* Tag */}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${route.tagColor} mb-3 inline-block`}>
                  {route.tag}
                </span>

                <h3 className="text-xl font-black mb-1">{route.title}</h3>
                <p className="text-white/50 text-sm mb-4 leading-relaxed">{route.subtitle}</p>
                <p className="text-white/35 text-sm leading-relaxed">
                  {route.id === 'elite-library' ? (
                    <>
                      Browse hundreds of premium Steam profile designs. Find your favorite vibe and perfect it using our professional <strong className="text-white/60 font-bold">Design Studio</strong> tools.
                    </>
                  ) : route.description}
                </p>

                {/* CTA */}
                <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-white/60 group-hover:text-white transition-colors">
                  Explore <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
            </Link>
          ))}
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-white/20 text-sm">
        <div className="flex justify-center gap-6 mb-3 text-white/30 text-xs">
          <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</a>
          <a href="/refund" className="hover:text-white/60 transition-colors">Refund Policy</a>
          <a href="/contact" className="hover:text-white/60 transition-colors">Contact Us</a>
        </div>
        © 2026 VibeProfileit — Made by SirHacktan for the Steam Community with ❤️ . All rights reserved.
      </footer>
    </div>
  );
}
