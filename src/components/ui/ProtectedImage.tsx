"use client"

import React from "react"

interface ProtectedImageProps {
  src: string
  alt: string
  className?: string
  isBlurred?: boolean
}

const GHOST =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

const block = (e: React.MouseEvent | React.DragEvent) => e.preventDefault()

export default function ProtectedImage({
  src,
  alt,
  className = "",
  isBlurred = false,
}: ProtectedImageProps) {
  return (
    <div
      className={`relative inline-block overflow-hidden select-none ${className}`}
      onContextMenu={block}
      onDragStart={block}
      onDrop={block}
    >
      {/* VISUAL LAYER: Görsel katmanı — pointer-events yok, sürüklenemez, sağ tık çalışmaz */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onContextMenu={block}
        onDragStart={block}
        className={`w-full h-auto block transition-all duration-300 pointer-events-none ${
          isBlurred ? "blur-xl scale-110" : ""
        }`}
      />

      {/* GHOST LAYER: Tüm yüzeyi kaplar. Sağ tık → 1x1 şeffaf PNG indirilir */}
      <img
        src={GHOST}
        alt=""
        aria-hidden="true"
        draggable={false}
        onContextMenu={block}
        onDragStart={block}
        onDrop={block}
        className="absolute inset-0 z-50 w-full h-full cursor-default select-none"
      />
    </div>
  )
}
