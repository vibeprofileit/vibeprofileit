"use client"

import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

const LogoIcon = () => (
  <svg
    width="34" height="34" viewBox="0 0 40 40" fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: "drop-shadow(0 0 7px rgba(139,92,246,0.9))" }}
  >
    <defs>
      <linearGradient id="vpx_frame" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#C084FC"/>
        <stop offset="55%"  stopColor="#8B5CF6"/>
        <stop offset="100%" stopColor="#4C1D95" stopOpacity="0.75"/>
      </linearGradient>
      <linearGradient id="vpx_mono" x1="8" y1="10" x2="34" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#F0ABFC"/>
        <stop offset="50%"  stopColor="#A855F7"/>
        <stop offset="100%" stopColor="#DDD6FE"/>
      </linearGradient>
      <filter id="vpx_glow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="1.1" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    {/* Chamfered outer frame — octagonal cut corners */}
    <path d="M8 2 L32 2 L38 8 L38 32 L32 38 L8 38 L2 32 L2 8 Z"
          stroke="url(#vpx_frame)" strokeWidth="1.4" fill="none"/>

    {/* Inner secondary ring — subtle depth layer */}
    <path d="M10 4.5 L30 4.5 L35.5 10 L35.5 30 L30 35.5 L10 35.5 L4.5 30 L4.5 10 Z"
          stroke="rgba(139,92,246,0.20)" strokeWidth="0.55" fill="none"/>

    {/* Subtle internal grid lines */}
    <line x1="2"  y1="20" x2="38" y2="20" stroke="rgba(139,92,246,0.10)" strokeWidth="0.5"/>
    <line x1="14" y1="2"  x2="14" y2="38" stroke="rgba(139,92,246,0.08)" strokeWidth="0.5"/>

    {/* Top-left L-bracket — primary accent */}
    <path d="M2 12 L2 4 L12 4" stroke="#A855F7" strokeWidth="2.2" strokeLinecap="square" fill="none"/>
    {/* Top-right L-bracket */}
    <path d="M38 12 L38 4 L28 4" stroke="#A855F7" strokeWidth="2.2" strokeLinecap="square" fill="none"/>
    {/* Bottom corners — dimmer */}
    <path d="M2 28 L2 36 L12 36" stroke="#7C3AED" strokeWidth="0.9" strokeLinecap="square" fill="none" opacity="0.45"/>
    <path d="M38 28 L38 36 L28 36" stroke="#7C3AED" strokeWidth="0.9" strokeLinecap="square" fill="none" opacity="0.45"/>

    {/* Diagonal energy slash — top-right corner accent */}
    <line x1="30" y1="3.5" x2="36.5" y2="10" stroke="#C084FC" strokeWidth="0.9" opacity="0.55"/>

    {/* Pixel dot accents */}
    <rect x="3.5" y="3.5" width="1.8" height="1.8" fill="#A855F7" opacity="0.80"/>
    <rect x="34.7" y="3.5" width="1.8" height="1.8" fill="#A855F7" opacity="0.80"/>
    <rect x="3.5" y="34.7" width="1.8" height="1.8" fill="#6D28D9" opacity="0.40"/>
    <rect x="34.7" y="34.7" width="1.8" height="1.8" fill="#6D28D9" opacity="0.40"/>

    {/* VP interlocked monogram with glow filter */}
    <g filter="url(#vpx_glow)">
      {/* V — left arm */}
      <path d="M8 11 L15.5 28" stroke="url(#vpx_mono)" strokeWidth="2.3" strokeLinecap="round"/>
      {/* V — right arm (top shares point with P stem) */}
      <path d="M23 11 L15.5 28" stroke="url(#vpx_mono)" strokeWidth="2.3" strokeLinecap="round"/>

      {/* Segment tick marks across V arms */}
      <line x1="10.2" y1="17.5" x2="13.0" y2="15.3" stroke="rgba(192,132,252,0.50)" strokeWidth="0.9"/>
      <line x1="18.8" y1="17.5" x2="21.6" y2="15.3" stroke="rgba(192,132,252,0.50)" strokeWidth="0.9"/>

      {/* P — vertical stem */}
      <path d="M23 11 L23 29" stroke="url(#vpx_mono)" strokeWidth="2.3" strokeLinecap="round"/>
      {/* P — angular bowl (geometric segments, not arc) */}
      <path d="M23 11 L30 11 L33 14.5 L33 18.5 L30 22 L23 22"
            stroke="url(#vpx_mono)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* P inner bowl secondary highlight */}
      <path d="M24.8 14 L29 14 L31 16 L31 17.5 L29 19.5 L24.8 19.5"
            stroke="rgba(192,132,252,0.28)" strokeWidth="0.75" fill="none"/>
    </g>
  </svg>
)

export default function Header() {
  const { data: session, status } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#0a0a0f]/60 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <LogoIcon />
          <span className="font-semibold text-[1.34rem] tracking-tight text-white">
            vibeProfileit
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link
            href="/gallery"
            className="text-slate-200 transition-all duration-200"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = "linear-gradient(to right, #a855f7, #d8b4fe)";
              el.style.WebkitBackgroundClip = "text";
              el.style.backgroundClip = "text";
              el.style.WebkitTextFillColor = "transparent";
              el.style.color = "transparent";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = "";
              el.style.WebkitBackgroundClip = "";
              el.style.backgroundClip = "";
              el.style.WebkitTextFillColor = "";
              el.style.color = "";
            }}
          >
            View Gallery
          </Link>
          <Link
            href="/features"
            className="text-slate-200 transition-all duration-200"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = "linear-gradient(to right, #a855f7, #d8b4fe)";
              el.style.WebkitBackgroundClip = "text";
              el.style.backgroundClip = "text";
              el.style.WebkitTextFillColor = "transparent";
              el.style.color = "transparent";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = "";
              el.style.WebkitBackgroundClip = "";
              el.style.backgroundClip = "";
              el.style.WebkitTextFillColor = "";
              el.style.color = "";
            }}
          >
            Features
          </Link>
          <Link
            href="/how-to-use"
            className="text-slate-200 transition-all duration-200"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = "linear-gradient(to right, #a855f7, #d8b4fe)";
              el.style.WebkitBackgroundClip = "text";
              el.style.backgroundClip = "text";
              el.style.WebkitTextFillColor = "transparent";
              el.style.color = "transparent";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = "";
              el.style.WebkitBackgroundClip = "";
              el.style.backgroundClip = "";
              el.style.WebkitTextFillColor = "";
              el.style.color = "";
            }}
          >
            How to Use
          </Link>
          <a
            href="#"
            className="text-slate-200 transition-all duration-200"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = "linear-gradient(to right, #a855f7, #d8b4fe)";
              el.style.WebkitBackgroundClip = "text";
              el.style.backgroundClip = "text";
              el.style.WebkitTextFillColor = "transparent";
              el.style.color = "transparent";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.backgroundImage = "";
              el.style.WebkitBackgroundClip = "";
              el.style.backgroundClip = "";
              el.style.WebkitTextFillColor = "";
              el.style.color = "";
            }}
          >
            Pricing
          </a>
        </nav>

        {/* Auth */}
        {status === "loading" ? (
          <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
        ) : session?.user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              {session.user.avatarFull || session.user.image ? (
                <Image
                  src={(session.user.avatarFull ?? session.user.image)!}
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
              {/* Caret */}
              <svg
                className={`w-3 h-3 text-white/40 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-[#0f0f1a]/95 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/5">
                  <p className="text-xs text-white/30 uppercase tracking-wider">Steam Hesabı</p>
                  <p className="text-sm font-semibold text-white/80 truncate mt-0.5">
                    {session.user.personaName ?? session.user.name}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => { window.location.href = "/api/steam/login" }}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/40 transition-all"
          >
            {/* Steam logo */}
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
