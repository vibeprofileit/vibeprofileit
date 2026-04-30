import Image from "next/image"

// 1x1 transparent PNG — the "ghost" image users download on right-click
const GHOST =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

interface ProtectedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
}

export default function ProtectedImage({
  src,
  alt,
  className,
  width,
  height,
  fill,
}: ProtectedImageProps) {
  return (
    <div className={`relative select-none ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        {...(fill ? { fill: true } : { width: width ?? 800, height: height ?? 600 })}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Shield layer — sits on top, serves the ghost image on right-click save */}
      <div
        className="absolute inset-0 z-10"
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          src={GHOST}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-full h-full opacity-0 cursor-default"
        />
      </div>
    </div>
  )
}
