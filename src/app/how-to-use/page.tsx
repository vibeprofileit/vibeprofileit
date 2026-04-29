"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import Header from "@/components/Header";

const MAGIC_CODE = `$J('#image_width').val('1000'); $J('#image_height').val('1');`;

export default function HowToUsePage() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(MAGIC_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Header />

      <main className="pt-32 pb-24 max-w-[960px] mx-auto px-6 w-full">

        <Link
          href="/"
          className="inline-block mb-12 text-lg font-semibold text-white hover:text-white/70 transition-colors"
        >
          ← Back to Home
        </Link>

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-violet-400 mb-4 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10">
            User Guide
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">How to Use</h1>
          <p className="text-white/40 text-base max-w-lg mx-auto">
            Follow these five mandatory steps to apply your seamless design to your Steam profile.
          </p>
        </motion.div>

        {/* Avatar Setting Panel */}
        <div className="group mb-8 cursor-default">
          <div className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl border border-blue-400/30 bg-[#0d1220]/80 shadow-[0_0_32px_rgba(96,165,250,0.08)] hover:shadow-[0_0_40px_rgba(96,165,250,0.18)] hover:border-blue-400/50 transition-all duration-300">
            <span className="text-2xl flex-shrink-0">👤</span>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-widest uppercase text-blue-300">Avatar Setting</span>
            </div>
            <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full border border-blue-400/40 bg-blue-500/10 flex items-center justify-center">
              <span className="text-[10px] text-blue-300 font-black">i</span>
            </div>
          </div>
          {/* Tooltip — expands in normal flow, pushes content down */}
          <div className="overflow-hidden max-h-0 group-hover:max-h-40 transition-all duration-300">
            <div className="mt-2 px-5 py-3.5 rounded-xl bg-[#0d1220] border border-blue-400/25 text-white/60 text-sm leading-relaxed shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-blue-300 font-semibold">NOTE:</span> These steps are <span className="text-white/90 font-semibold">NOT required</span> for Avatars. Upload them normally through Steam Settings.
            </div>
          </div>
        </div>

        {/* Critical Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-16 flex items-start gap-4 bg-red-500/10 border border-red-500/40 rounded-2xl px-6 py-5"
        >
          <span className="text-red-400 text-2xl mt-0.5 flex-shrink-0">⚠</span>
          <p className="text-red-300 text-sm leading-relaxed font-medium">
            <span className="font-black text-red-400 uppercase tracking-wide">REQUIRED:</span>{" "}
            THIS PROCESS MUST BE DONE VIA A WEB BROWSER. THE STEAM DESKTOP APP DOES NOT SUPPORT CONSOLE COMMANDS.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="flex flex-col gap-12">

          {/* Step 1 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-cyan-500/10 p-6 flex flex-col items-center justify-center min-h-[180px]">
              <div className="flex gap-2 mb-4">
                <div className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-[10px] font-mono">bg_left.png</div>
                <div className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-[10px] font-mono">bg_middle.png</div>
                <div className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-[10px] font-mono">bg_right.png</div>
              </div>
              <span className="text-xs text-blue-300/60 font-mono italic">assets_ready_to_upload.zip</span>
            </div>
            <div>
              <span className="text-5xl font-black text-white/8 select-none">01</span>
              <h2 className="text-2xl font-black mt-1 mb-2">Extract the Assets</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Download and extract your ZIP file. You will find three pieces: <span className="text-white/80">bg_left</span>, <span className="text-white/80">bg_middle</span>, and <span className="text-white/80">bg_right</span>. Since Steam limits uploads to <span className="text-blue-300 font-semibold">one file at a time</span>, you must process these individually.
              </p>
            </div>
          </motion.div>

          <div className="border-t border-white/5" />

          {/* Step 2 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-600/10 to-blue-500/10 p-4 min-h-[180px] flex items-center justify-center">
              <a 
                href="https://steamcommunity.com/sharedfiles/edititem/767/3/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 bg-cyan-500/20 border border-cyan-400/40 rounded-xl text-cyan-300 font-black text-xs hover:bg-cyan-500/30 transition-all tracking-widest"
              >
                OPEN STEAM UPLOAD PAGE
              </a>
            </div>
            <div>
              <span className="text-5xl font-black text-white/8 select-none">02</span>
              <h2 className="text-2xl font-black mt-1 mb-2">Open the Direct Link</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Use a <span className="text-cyan-300 font-semibold">web browser</span> to log into Steam. Go directly to the official upload page: <span className="text-white/80 break-all underline decoration-cyan-500/30">https://steamcommunity.com/sharedfiles/edititem/767/3/</span>. You will need to return to this link for every piece.
              </p>
            </div>
          </motion.div>

          <div className="border-t border-white/5" />

          {/* Step 3 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-purple-500/10 p-5 min-h-[180px]">
              <div className="rounded-xl border border-white/8 bg-[#16202d] p-4">
                <div className="w-full h-2 bg-white/5 rounded-full mb-4 overflow-hidden">
                  <div className="w-1/3 h-full bg-violet-500" />
                </div>
                <div className="text-[10px] text-white/40 font-mono">Uploading: bg_left.png (1/3)</div>
              </div>
            </div>
            <div>
              <span className="text-5xl font-black text-white/8 select-none">03</span>
              <h2 className="text-2xl font-black mt-1 mb-2">Select Your File</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Click <span className="text-violet-300 font-semibold">'Choose File'</span> and select one asset (Start with <span className="text-white/80">bg_left.png</span>). Provide a title. <span className="text-red-400 font-bold">DO NOT</span> click 'Save and Continue' yet; the bypass code must be executed first.
              </p>
            </div>
          </motion.div>

          <div className="border-t border-white/5" />

          {/* Step 4 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-600/10 to-orange-500/10 p-4 min-h-[180px]">
               <div className="bg-[#1e1e1e] rounded-xl border border-white/10 p-4 font-mono">
                  <div className="flex gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className="text-[10px] text-amber-400 animate-pulse">{'>'} Waiting for Magic Code...</div>
               </div>
            </div>
            <div>
              <span className="text-5xl font-black text-white/8 select-none">04</span>
              <h2 className="text-2xl font-black mt-1 mb-2">Access the Console</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                On the upload page, right-click and select <span className="text-white/80 font-semibold">'Inspect'</span> or press <span className="text-amber-400 font-black border border-amber-500/40 rounded px-1.5 py-0.5 bg-amber-500/10">F12</span>. Switch to the <span className="text-amber-300 font-semibold">Console</span> tab. This is required to bypass Steam's image scaling.
              </p>
            </div>
          </motion.div>

          <div className="border-t border-white/5" />

          {/* Step 5 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-600/10 to-emerald-500/10 p-5 min-h-[180px] flex flex-col gap-4">
              <button
                onClick={handleCopy}
                className={`w-full py-4 rounded-xl font-black text-sm tracking-widest transition-all duration-300 border ${
                  copied
                    ? "bg-green-500/30 border-green-400/60 text-green-300 shadow-[0_0_24px_rgba(34,197,94,0.25)]"
                    : "bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30 hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] shadow-[0_0_12px_rgba(34,197,94,0.1)]"
                }`}
              >
                {copied ? "✓ COPIED!" : "COPY MAGIC CODE"}
              </button>
              <div className="text-center text-[10px] text-green-400/50 font-black tracking-widest uppercase">Repeat for all 3 files</div>
            </div>
            <div>
              <span className="text-5xl font-black text-white/8 select-none">05</span>
              <h2 className="text-2xl font-black mt-1 mb-2">Execute & Repeat <span className="text-green-400">(3X)</span></h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Click <span className="text-green-400 font-semibold">COPY MAGIC CODE</span>, paste it into the Console, and hit <span className="text-white/80 font-bold underline">ENTER</span>. Click 'Save' on Steam. <span className="text-white/90 font-bold italic underline">Repeat this entire process</span> for <span className="text-white/80">bg_middle.png</span> and <span className="text-white/80">bg_right.png</span>.
              </p>
            </div>
          </motion.div>

          {/* Tip Note */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-start gap-3 rounded-2xl px-6 py-4 border border-amber-500/25 bg-amber-500/5"
          >
            <span className="text-amber-400 text-base mt-0.5 flex-shrink-0">📌</span>
            <p className="text-amber-300/80 text-sm leading-relaxed">
              <span className="font-black text-amber-400">Tip:</span> Your artwork will show up as a thin line during selection. This is proof the code worked — just click it!
            </p>
          </motion.div>

        </div>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-white/20 text-sm">
        © 2026 vibeProfileit — Made by SirHacktan for the Steam Community with ❤️. All rights reserved.
      </footer>
    </div>
  );
}