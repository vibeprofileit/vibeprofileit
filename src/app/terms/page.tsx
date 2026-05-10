import Header from "@/components/Header";

export const metadata = { title: "Terms of Service — VibeProfileit" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-20 px-6" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <h1 className="text-4xl font-black mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: May 10, 2026</p>

        <Section title="1. Acceptance">
          By accessing or using VibeProfileit you agree to be bound by these Terms. If you do not agree, do not use the service.
        </Section>

        <Section title="2. Eligibility">
          You must be at least 13 years old to use VibeProfileit. By using the service you represent that you meet this requirement.
        </Section>

        <Section title="3. Account">
          You sign in through your Steam account via Steam OpenID. You are responsible for all activity that occurs under your account. Do not share your session with others.
        </Section>

        <Section title="4. Tokens">
          <ul className="list-disc pl-5 space-y-1 text-white/70">
            <li>Tokens are a virtual credit used to unlock premium artwork and generate AI images on VibeProfileit.</li>
            <li>Tokens have no monetary value and cannot be transferred between accounts.</li>
            <li>Tokens do not expire.</li>
            <li>Token prices and costs are subject to change with reasonable notice.</li>
          </ul>
        </Section>

        <Section title="5. Acceptable Use">
          You agree not to use VibeProfileit to:
          <ul className="list-disc pl-5 mt-3 space-y-1 text-white/70">
            <li>Generate, upload, or distribute illegal, obscene, or NSFW content</li>
            <li>Infringe on the intellectual property rights of others</li>
            <li>Harass, threaten, or harm other users</li>
            <li>Attempt to reverse-engineer, scrape, or abuse the service</li>
            <li>Use automated tools or bots to interact with the service without our written consent</li>
            <li>Circumvent rate limits or other technical restrictions</li>
          </ul>
        </Section>

        <Section title="6. AI-Generated Content">
          Images generated through VibeProfileit are produced by third-party AI models (fal.ai). You are solely responsible for the prompts you submit. We reserve the right to block prompts that violate these Terms or applicable law. We do not guarantee the accuracy, quality, or fitness of AI-generated images for any purpose.
        </Section>

        <Section title="7. Intellectual Property">
          The VibeProfileit name, logo, and interface design are our property. AI-generated images are provided to you for personal, non-commercial use. We make no ownership claims over your generated images.
        </Section>

        <Section title="8. Termination">
          We reserve the right to suspend or terminate accounts that violate these Terms, at our sole discretion, without prior notice. Unused tokens are forfeited upon termination for cause.
        </Section>

        <Section title="9. Disclaimers">
          VibeProfileit is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee uninterrupted or error-free operation of the service.
        </Section>

        <Section title="10. Limitation of Liability">
          To the maximum extent permitted by law, VibeProfileit shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
        </Section>

        <Section title="11. Changes to Terms">
          We may update these Terms at any time. Continued use after changes constitutes acceptance. We will update the &ldquo;Last updated&rdquo; date above when changes are made.
        </Section>

        <Section title="12. Contact">
          For questions about these Terms, contact us at <a href="mailto:vibeprofileit@gmail.com" className="underline text-indigo-400">vibeprofileit@gmail.com</a>.
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
