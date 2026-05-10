import Header from "@/components/Header";

export const metadata = { title: "Privacy Policy — VibeProfileit" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-20 px-6" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: May 10, 2026</p>

        <Section title="1. Who We Are">
          VibeProfileit (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is an online service that lets Steam users generate and download AI-powered profile artwork. We are operated as an independent project.
        </Section>

        <Section title="2. Data We Collect">
          When you sign in via Steam, we receive and store the following information from Steam&apos;s OpenID service:
          <ul className="list-disc pl-5 mt-3 space-y-1 text-white/70">
            <li>SteamID (your unique Steam identifier)</li>
            <li>Display name and avatar URL (public Steam profile data)</li>
            <li>A placeholder email address derived from your SteamID (e.g. <em>76561198XXXXX@steam.placeholder</em>)</li>
          </ul>
          <p className="mt-3">We also collect:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-white/70">
            <li>IP address (for rate-limiting and abuse prevention)</li>
            <li>Token balance and transaction history (purchases and usage)</li>
            <li>AI-generated images you create (stored in Cloudflare R2)</li>
            <li>Prompts submitted for AI generation</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-1 text-white/70">
            <li>To authenticate you and maintain your session</li>
            <li>To manage your token balance and purchase history</li>
            <li>To generate and deliver AI artwork</li>
            <li>To detect and prevent abuse, fraud, or ToS violations</li>
          </ul>
          We do not sell your data to third parties. We do not use your data for advertising.
        </Section>

        <Section title="4. Third-Party Services">
          We share limited data with the following services to operate VibeProfileit:
          <ul className="list-disc pl-5 mt-3 space-y-2 text-white/70">
            <li><strong className="text-white">Steam / Valve</strong> — Authentication via OpenID. Governed by the <a href="https://store.steampowered.com/privacy_agreement/" className="underline text-indigo-400">Steam Privacy Policy</a>.</li>
            <li><strong className="text-white">Lemon Squeezy</strong> — Payment processing. They handle card data; we never receive your card details. Governed by the <a href="https://www.lemonsqueezy.com/privacy" className="underline text-indigo-400">Lemon Squeezy Privacy Policy</a>.</li>
            <li><strong className="text-white">fal.ai</strong> — AI image generation. Your prompt is sent to their API to produce images.</li>
            <li><strong className="text-white">Cloudflare R2</strong> — Image storage.</li>
            <li><strong className="text-white">Supabase</strong> — Database hosting (PostgreSQL).</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          We retain your account data for as long as your account is active. If you wish to have your data deleted, contact us at <a href="mailto:vibeprofileit@gmail.com" className="underline text-indigo-400">vibeprofileit@gmail.com</a> and we will process your request within 30 days.
        </Section>

        <Section title="6. Cookies & Sessions">
          We use a single session cookie (<code className="text-white/60 bg-white/5 px-1 rounded">next-auth.session-token</code>) to keep you logged in. No third-party tracking cookies are set.
        </Section>

        <Section title="7. Children">
          VibeProfileit is not directed at children under 13. We do not knowingly collect data from children.
        </Section>

        <Section title="8. Changes to This Policy">
          We may update this policy periodically. Continued use of the service after changes constitutes acceptance. The &ldquo;Last updated&rdquo; date at the top reflects the most recent revision.
        </Section>

        <Section title="9. Contact">
          Questions about this policy? Email us at <a href="mailto:vibeprofileit@gmail.com" className="underline text-indigo-400">vibeprofileit@gmail.com</a>.
        </Section>
      </main>
      <LegalFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold mb-3 text-white">{title}</h2>
      <div className="text-white/60 leading-relaxed text-sm space-y-2">{children}</div>
    </section>
  );
}

function LegalFooter() {
  return (
    <footer className="border-t border-white/5 py-8 text-center text-white/20 text-sm">
      <div className="flex justify-center gap-6 mb-3 text-white/30 text-xs">
        <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
        <a href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</a>
        <a href="/refund" className="hover:text-white/60 transition-colors">Refund Policy</a>
        <a href="/contact" className="hover:text-white/60 transition-colors">Contact Us</a>
      </div>
      © 2026 VibeProfileit — All rights reserved.
    </footer>
  );
}
