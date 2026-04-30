"use client"

import { useState } from "react"
import { MessageCircle, X } from "lucide-react"

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log("Feedback submitted:", { email, message })
    setEmail("")
    setMessage("")
    setOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Popover Form */}
      <div
        className={`w-80 rounded-2xl border border-white/10 bg-[#0d0d12] backdrop-blur-md shadow-2xl shadow-black/60 overflow-hidden transition-all duration-300 origin-bottom-right ${
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white">Feedback &amp; Support</h2>
            <p className="text-xs text-white/40 mt-0.5">We read every message.</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/30 hover:text-white/70 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Your Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Your Message
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#6600ff] to-[#7c3aed] py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Send Feedback
          </button>
        </form>
      </div>

      {/* Trigger Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-[#6600ff] to-[#7c3aed] text-white text-sm font-semibold shadow-lg shadow-violet-900/40 hover:opacity-90 transition-opacity"
        aria-label="Help & Feedback"
      >
        <MessageCircle className="w-4 h-4" />
        Help &amp; Feedback
      </button>
    </div>
  )
}
