"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Footer from "@/components/Footer";

const features = [
  {
    title: "AI-Powered Backgrounds",
    description:
      "Describe your vibe in a few words and let our AI generate a stunning background tailored to your Steam profile — no design skills needed.",
  },
  {
    title: "Auto-Sizing for Steam Profiles",
    description:
      "Our smart cropper automatically fits your image to Steam's exact dimensions, so what you see is exactly what goes live on your profile.",
  },
  {
    title: "Live Profile Preview",
    description:
      "See how your profile looks in real time before publishing. Tweak colors, layouts, and artwork until it's exactly right.",
  },
];

const faqs = [
  {
    question: "How to use?",
    answer:
      "Designing is easy, but applying it to Steam needs a trick. Click the 'How to Use' page in the menu to see our step-by-step guide and get the 'Magic Code'.",
  },
  {
    question: "Why should I login with Steam?",
    answer:
      "Stop wasting time. Log in to see your real Steam profile—avatar, background, and all. Vibe with showcases that perfectly match your aesthetic.",
  },
  {
    question: "Is it safe to use with my Steam account?",
    answer:
      "Yes. VibeProfileit never asks for your Steam password and do not use your Trade API.We use Steam's official OpenID login, so your credentials stay completely private.",
  },
  {
    question: "Do I need any design experience?",
    answer:
      "Not at all. Whether you upload your own artwork or let AI generate it for you, the whole process is designed to be intuitive and fast — even for first-timers.",
  },
  {
    question: "Does this comply with Steam's guidelines?",
    answer:
      "We built VibeProfileit with Steam's content policies in mind. All generated and uploaded content is checked against community guidelines before going live.",
  },
  {
    question: "Can I use VibeProfileit designs on other platforms?",
    answer:
      "Our designs are specifically sized for Steam, but you can download them and use them anywhere you like.",
  },
  {
    question: "How long does the design process take?",
    answer:
      "With our AI engine, generating a unique background takes seconds. Cropping is instant.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "Yes! You can try our basic design tools and previews for free.",
  },
  {
    question: "Will my designs be affected by Steam trade bans?",
    answer:
      "No. We create static images for your artwork showcase. They are unrelated to Steam trading functions.",
  },
];

export default function FeaturesPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white px-6 py-16 overflow-hidden">
      {/* Radial glow background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[700px] h-[700px] rounded-full bg-gradient-radial from-violet-600/10 via-blue-700/5 to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-block mb-12 text-lg font-semibold text-white hover:text-white/70 transition-colors"
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-black mb-4" style={{
            backgroundImage: "linear-gradient(to right, #a855f7, #ffffff)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}>
            What can VibeProfileit do?
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Everything you need to make your Steam profile stand out — no friction, no fluff.
          </p>
        </motion.div>

        {/* Core Features Grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-20">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group relative h-44 rounded-2xl bg-zinc-900/80 border border-purple-500/20 shadow-md shadow-purple-500/10 overflow-hidden cursor-default hover:border-purple-500/50 hover:shadow-purple-500/25 hover:shadow-lg transition-all duration-300"
            >
              {/* Default: centered title */}
              <div className="absolute inset-0 flex items-center justify-center p-6 group-hover:opacity-0 transition-opacity duration-300">
                <h3 className="text-lg font-bold text-center">{feature.title}</h3>
              </div>

              {/* Hover: title top + description */}
              <div className="absolute inset-0 flex flex-col justify-between p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="text-base font-bold text-purple-400">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Prompt Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-20"
        >
          <h2 className="text-2xl font-black mb-2 text-center">
            How to Write a <span className="text-purple-400">Good Prompt</span>
          </h2>
          <p className="text-center text-white/30 text-sm mb-8">
            Better prompts = better results. Here&apos;s what actually works.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              {
                label: "Be specific",
                bad: "cool character",
                good: "armored knight, dark forest, moonlight",
              },
              {
                label: "Character + Place + Mood",
                tip: "The best prompts include all three. Example: [character], [location], [lighting/atmosphere]",
              },
              {
                label: "Use Vibes, keep it short",
                tip: "If you select Anime vibe, just write 'anime girl' — the system handles the rest.",
              },
              {
                label: "Looking too realistic?",
                tip: "Select the Anime vibe and add '2d anime, illustration' to your prompt.",
              },
              {
                label: "Too dark / pure black output?",
                tip: "Avoid 'dark night, black'. Use 'moonlight', 'dusk' or 'dramatic' instead.",
              },
              {
                label: "Cars",
                tip: "Select Cars vibe. Brand + location + weather is enough. Example: black BMW, rainy Tokyo street, neon reflections",
              },
              {
                label: "Unwanted flames or energy?",
                tip: "Avoid words like flames, fire, energy, glowing, aura in your prompt.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-purple-500/15 bg-zinc-900/60 px-5 py-4"
              >
                <p className="text-sm font-bold text-purple-400 mb-2">{item.label}</p>
                {"bad" in item ? (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-red-400/70">✗ {item.bad}</span>
                    <span className="text-green-400/70">✓ {item.good}</span>
                  </div>
                ) : (
                  <p className="text-white/50 text-sm leading-relaxed">{item.tip}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <h2 className="text-2xl font-black mb-2 text-center">
            Common <span className="text-purple-400">Questions</span>
          </h2>
          <p className="text-center text-white/30 text-sm mb-8">
            Everything you might be wondering — answered.
          </p>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`rounded-xl border bg-zinc-900/60 overflow-hidden transition-colors duration-200 ${
                  openIndex === i
                    ? "border-purple-500/40"
                    : "border-white/8 hover:border-purple-500/20"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold hover:text-purple-400 transition-colors"
                >
                  {faq.question}
                  <motion.span
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="ml-4 shrink-0 text-white/40"
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {openIndex === i && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-white/50 leading-relaxed border-l-2 border-purple-500/40 ml-5">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
