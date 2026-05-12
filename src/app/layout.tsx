import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper"
import FeedbackButton from "@/components/FeedbackButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeProfileit",
  description: "Transform your Steam profile into art with AI",
  other: {
    "darkreader-lock": "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      style={{ colorScheme: "dark" }}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var o=new MutationObserver(function(ms){ms.forEach(function(m){if(m.type!=='attributes')return;var n=m.attributeName;if(/^data-darkreader/.test(n)){m.target.removeAttribute(n);}else if(n==='style'){var s=m.target.style,ps=[];for(var i=0;i<s.length;i++)if(/--darkreader/.test(s[i]))ps.push(s[i]);ps.forEach(function(p){s.removeProperty(p);});}});});o.observe(document.documentElement,{attributes:true,subtree:true});})();` }} />
      </head>
      <body className="min-h-full flex flex-col">
          <AuthWrapper>{children}</AuthWrapper>
          <FeedbackButton />
        </body>
    </html>
  );
}
