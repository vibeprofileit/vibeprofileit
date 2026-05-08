export default function TokenIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {/* Outer hexagon (darker edge / border effect) */}
      <polygon points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7" fill="#D97706" />
      {/* Inner hexagon (main gold) */}
      <polygon points="12,4 18.93,8 18.93,16 12,20 5.07,16 5.07,8" fill="#FBBF24" />
      {/* Shine highlight */}
      <ellipse cx="10.5" cy="8" rx="2.8" ry="1.6" fill="rgba(255,255,255,0.28)" transform="rotate(-15 10.5 8)" />
      {/* T letter */}
      <rect x="8" y="10.5" width="8" height="1.8" rx="0.6" fill="#78350F" />
      <rect x="10.6" y="10.5" width="2.8" height="4.6" rx="0.6" fill="#78350F" />
    </svg>
  );
}
