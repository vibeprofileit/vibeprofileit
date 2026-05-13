import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Refund Policy — VibeProfileit" };

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-20 px-6" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <h1 className="text-4xl font-black mb-2">Refund Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: May 10, 2026</p>

        <Section title="Overview">
          VibeProfileit sells digital tokens that are consumed instantly upon use. Because of the nature of digital goods, all sales are generally final. However, we believe in fair treatment and offer limited refunds under the conditions below.
        </Section>

        <Section title="Eligibility for a Refund">
          You may request a full refund if <strong className="text-white">all of the following conditions are met</strong>:
          <ul className="list-disc pl-5 mt-3 space-y-2 text-white/70">
            <li>You have used <strong className="text-white">zero (0) tokens</strong> from your purchased package.</li>
            <li>Your request is submitted within <strong className="text-white">7 days</strong> of the purchase date.</li>
            <li>The request is sent from the email address associated with your Steam account.</li>
          </ul>
          <div className="mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-300/80 text-sm">
            <strong className="text-amber-300">Important:</strong> Once even a single token has been spent — on a premium photo download or an AI generation — the purchase is considered fully consumed and no refund will be issued.
          </div>
        </Section>

        <Section title="Non-Refundable Cases">
          <ul className="list-disc pl-5 space-y-1 text-white/70">
            <li>Any purchase where one or more tokens have been used</li>
            <li>Requests submitted more than 7 days after purchase</li>
            <li>Accounts suspended or terminated for Terms of Service violations</li>
            <li>Dissatisfaction with AI-generated image quality — AI generation is a best-effort service and results may vary. The model may occasionally produce unexpected or imperfect outputs, which is inherent to the nature of AI technology and does not qualify as a service failure.</li>
          </ul>
        </Section>

        <Section title="Technical Issues">
          If you were charged but did not receive your tokens, please contact us immediately at <a href="mailto:vibeprofileit@gmail.com" className="underline text-indigo-400">vibeprofileit@gmail.com</a> with your order confirmation. We will investigate and credit your account or issue a refund within 3 business days.
        </Section>

        <Section title="How to Request a Refund">
          Send an email to <a href="mailto:vibeprofileit@gmail.com" className="underline text-indigo-400">vibeprofileit@gmail.com</a> with the subject line <strong className="text-white">Refund Request</strong> and include:
          <ul className="list-disc pl-5 mt-3 space-y-1 text-white/70">
            <li>Your Steam display name or SteamID</li>
            <li>Your Lemon Squeezy order number</li>
            <li>The reason for your request</li>
          </ul>
          We will respond within 72 business hours.
        </Section>

        <Section title="Processing">
          Approved refunds are processed through Lemon Squeezy and typically appear on your original payment method within 5–10 business days, depending on your bank.
        </Section>

        <Section title="Contact">
          Questions? Reach us at <a href="mailto:vibeprofileit@gmail.com" className="underline text-indigo-400">vibeprofileit@gmail.com</a>.
        </Section>
      </main>
      <Footer />
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
