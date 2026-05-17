import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@prisma/engines/**", "./node_modules/.prisma/**"],
  },
  allowedDevOrigins: ["192.168.1.112", "192.168.1.110"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "avatars.akamai.steamstatic.com" },
      { protocol: "https", hostname: "community.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "community.akamai.steamstatic.com" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      // Cloudflare R2 için eklediğimiz pattern:
      {
        protocol: "https",
        hostname: "pub-a9fa3eb644a643638e6c89784ccb22fa.r2.dev",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.steamstatic.com https://*.akamaihd.net https://steamcommunity.com https://pub-a9fa3eb644a643638e6c89784ccb22fa.r2.dev https://vibe-images.vibeprofileit.workers.dev",
      "connect-src 'self' data: blob: https://aklgrigjeegqhgqcizob.supabase.co wss://aklgrigjeegqhgqcizob.supabase.co https://app.lemonsqueezy.com https://challenges.cloudflare.com",
      "font-src 'self' data:",
      "media-src 'self' blob: https://*.steamstatic.com https://*.akamaihd.net https://steamcommunity.com https://pub-a9fa3eb644a643638e6c89784ccb22fa.r2.dev https://vibe-images.vibeprofileit.workers.dev",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "frame-src https://app.lemonsqueezy.com https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://app.lemonsqueezy.com",
    ].join("; ");

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/ffmpeg/:path*',
        headers: [
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
