"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, Coins, Star, LogOut } from "lucide-react"

const MENU_ITEMS = [
  { icon: <Heart size={14} />, label: "Likes",    href: "/account/likes"    },
  { icon: <Coins size={14} />, label: "Tokens",      href: "/account/tokens"   },
  { icon: <Star  size={14} />, label: "My Premiums", href: "/account/premiums" },
]

export default function Header() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const avatar = session?.user?.avatarFull ?? session?.user?.image

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f] border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-vibe-main.png"
              alt="Logo"
              width={36}
              height={36}
              className="h-[36px] w-auto object-contain"
            />
            <span className="text-2xl font-semibold tracking-normal select-none bg-gradient-to-r from-[#6600ff] via-[#6600ff] via-[70%] to-white bg-clip-text text-transparent">
              VibeProfileit
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/gallery"    className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">View Gallery</Link>
          <Link href="/features"   className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Features</Link>
          <Link href="/how-to-use" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">How to Use</Link>
          <Link href="/pricing"    className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Pricing</Link>
        </nav>

        {/* Auth */}
        {status === "loading" ? (
          <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
        ) : session?.user ? (
          <div ref={ref} className="relative">
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              {avatar ? (
                <Image
                  src={avatar}
                  alt={session.user.personaName ?? session.user.name ?? "avatar"}
                  width={24}
                  height={24}
                  className="rounded-full ring-1 ring-violet-500/50"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-500" />
              )}
              <span className="text-sm font-medium text-white/90 max-w-[120px] truncate">
                {session.user.personaName ?? session.user.name}
              </span>
              <svg
                className={`w-3 h-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0f0f1a]/95 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Steam Account</p>
                  <p className="text-sm font-semibold text-white/80 truncate mt-0.5">
                    {session.user.personaName ?? session.user.name}
                  </p>
                </div>

                <div className="py-1 border-b border-white/5">
                  {MENU_ITEMS.map(({ icon, label, href }) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="text-white/40">{icon}</span>
                      <span className="font-medium">{label}</span>
                    </Link>
                  ))}
                </div>

                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => { window.location.href = "/api/steam/login" }}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/40 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
            </svg>
            Login with Steam
          </button>
        )}
      </div>
    </header>
  )
}
