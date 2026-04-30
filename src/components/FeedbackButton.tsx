"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { MessageCircle, X } from "lucide-react"

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [errors, setErrors] = useState({ email: "", message: "" })
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  function validate() {
    const next = { email: "", message: "" }
    if (!email.trim()) next.email = "Please fill in this field."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Please enter a valid email address."
    if (!message.trim()) next.message = "Please fill in this field."
    setErrors(next)
    return !next.email && !next.message
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    console.log("Feedback submitted:", { email, message })
    setEmail("")
    setMessage("")
    setErrors({ email: "", message: "" })
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
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Your Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }))
              }}
              placeholder="you@example.com"
              className={`w-full rounded-xl border bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors ${
                errors.email ? "border-rose-500/60" : "border-white/10 focus:border-violet-500/60"
              }`}
            />
            {errors.email && (
              <p className="text-xs text-rose-400">{errors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Your Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (errors.message) setErrors((prev) => ({ ...prev, message: "" }))
              }}
              placeholder="Write for Suggestions, Complaints, and Partnership"
              className={`w-full rounded-xl border bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors resize-none ${
                errors.message ? "border-rose-500/60" : "border-white/10 focus:border-violet-500/60"
              }`}
            />
            {errors.message && (
              <p className="text-xs text-rose-400">{errors.message}</p>
            )}
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
