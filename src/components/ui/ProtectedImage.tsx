"use client"

const GHOST = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

interface ProtectedImageProps {
  src: string
  alt: string
  className?: string
  isBlurred?: boolean
}

export default function ProtectedImage({
  src,
  alt,
  className,
  isBlurred = false,
}: ProtectedImageProps) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      {/* Visual layer — background-image so there is no <img> to right-click save */}
      <div
        aria-label={alt}
        role="img"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${src})`,
          ...(isBlurred && { filter: "blur(20px)", transform: "scale(1.1)" }),
        }}
      />

      {/* Shield — transparent 1x1 PNG covers everything; right-click and drag target this instead */}
      <img
        src={GHOST}
        alt=""
        aria-hidden="true"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        className="absolute inset-0 w-full h-full cursor-default select-none"
      />
    </div>
  )
}
