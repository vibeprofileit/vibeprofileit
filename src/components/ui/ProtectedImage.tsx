"use client"

import React from "react"

interface ProtectedImageProps {
  src: string
  alt: string
  className?: string
  isBlurred?: boolean
  style?: React.CSSProperties
}

const GHOST =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

const block = (e: React.MouseEvent | React.DragEvent) => e.preventDefault()

export default function ProtectedImage({
  src,
  alt,
  className = "",
  isBlurred = false,
  style,
}: ProtectedImageProps) {
  return (
    <div
      className={`relative inline-block w-full overflow-hidden select-none ${className}`}
      onContextMenu={block}
      onDragStart={block}
      onDrop={block}
    >
      {/* ASIL RESİM: DOM'da var ama mouse onu algılamaz */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onContextMenu={block}
        onDragStart={block}
        style={style}
        className={`w-full h-auto block transition-all duration-300 pointer-events-none${
          isBlurred ? " blur-xl scale-110" : ""
        }`}
      />

      {/* GHOST LAYER: Resmin tam üzerinde, tüm mouse olaylarını yakalar */}
      <img
        src={GHOST}
        alt=""
        aria-hidden="true"
        draggable={false}
        onContextMenu={block}
        onDragStart={block}
        onDrop={block}
        className="absolute inset-0 z-10 w-full h-full cursor-default select-none"
      />
    </div>
  )
}
