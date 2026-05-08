"use client"

import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Heart, Coins, Star, ChevronDown, User } from "lucide-react"

type UserStats = {
  tokenBalance:  number
  likesCount:    number
  premiumsCount: number
}

export default function AccountWidget() {
  const { data: session, status } = useSession()
  const [open,  setOpen]  = useState(false)
  const [stats, setStats] = useState<UserStats | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session?.user?.userId) return
    fetch("/api/user/me")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [session?.user?.userId])

  // Dışarı tıklanınca kapat
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  if (status === "loading" || !session?.user) return null

  const user = session.user
  const avatar = user.avatarFull ?? user.image

  const items = [
    {
      icon: <Heart size={15} />,
      label: "Likes",
      value: stats?.likesCount ?? "—",
      color: "#ff4d8d",
    },
    {
      icon: <Coins size={15} />,
      label: "Tokens",
      value: stats?.tokenBalance ?? "—",
      color: "#BC13FE",
    },
    {
      icon: <Star size={15} />,
      label: "My Premiums",
      value: stats?.premiumsCount ?? "—",
      color: "#FFD700",
    },
  ]

  return (
    <div
      ref={ref}
      className="fixed z-40"
      style={{ left: 24, top: 88 }}
    >
      {/* Account butonu */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200"
        style={{
          background:   "rgba(10,10,20,0.85)",
          border:       "1px solid rgba(188,19,254,0.35)",
          backdropFilter: "blur(12px)",
          boxShadow:    open
            ? "0 0 20px rgba(188,19,254,0.3), 0 0 0 1px rgba(188,19,254,0.5)"
            : "0 0 10px rgba(188,19,254,0.1)",
        }}
      >
        {avatar ? (
          <Image
            src={avatar}
            alt={user.personaName ?? user.name ?? "avatar"}
            width={28}
            height={28}
            className="rounded-full"
            style={{ border: "1.5px solid rgba(188,19,254,0.6)" }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #BC13FE, #6600ff)" }}
          >
            <User size={14} color="#fff" />
          </div>
        )}
        <span
          className="text-sm font-semibold"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          Account
        </span>
        <ChevronDown
          size={13}
          style={{
            color: "rgba(188,19,254,0.8)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {/* Açılır panel */}
      {open && (
        <div
          className="mt-2 rounded-2xl overflow-hidden"
          style={{
            minWidth: 200,
            background:   "rgba(8,0,18,0.95)",
            border:       "1px solid rgba(188,19,254,0.3)",
            backdropFilter: "blur(16px)",
            boxShadow:    "0 0 30px rgba(188,19,254,0.2), 0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {/* Kullanıcı adı */}
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid rgba(188,19,254,0.1)" }}
          >
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
              Steam Hesabı
            </p>
            <p className="mt-0.5 font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
              {user.personaName ?? user.name}
            </p>
          </div>

          {/* İstatistikler */}
          <div className="py-1">
            {items.map(({ icon, label, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-2.5 transition-colors duration-150 cursor-pointer"
                style={{ color: "rgba(255,255,255,0.7)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(188,19,254,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ color }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                </div>
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: 13, color }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
