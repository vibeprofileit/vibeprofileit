"use client"

interface ProtectedImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
}

export default function ProtectedImage({ src, alt, className, style }: ProtectedImageProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      style={{ backgroundImage: `url(${src})`, ...style }}
      className={`bg-cover bg-center bg-no-repeat select-none ${className ?? ""}`}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    />
  )
}
