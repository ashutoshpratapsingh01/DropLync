import Navbar from '@/components/Navbar'
import Background3D from '@/components/Background3D'
import { getSession } from '@/lib/auth'

export const metadata = {
  title: 'Terms of Service — DropLync',
  description: 'Master Services Agreement and Terms of Service governing the DropLync platform.'
}

export default async function TermsPage() {
  const user = await getSession()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <Background3D />
      <Navbar user={user} />

      <main className="section-container" style={{ maxWidth: 860, padding: '32px 24px 60px', position: 'relative', zIndex: 1 }}>
        {/* Document Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Master Services Agreement · Commercial Terms
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 6 }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>
            Effective Date: August 27, 2026 · Reference ID: DL-TOS-2026.4
          </p>
        </div>

        {/* Corporate Legal Body */}
        <div className="glass-panel" style={{ padding: '32px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              1. Binding Agreement & Service Description
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              These Terms of Service constitute a legally binding agreement between you and DropLync. By accessing, uploading, transferring, or receiving files through DropLync, you acknowledge that you have read, understood, and agree to be bound by these terms. DropLync delivers point-to-point chunked file streaming infrastructure subject to storage tier specifications.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              2. Tier Allocation & Technical Boundaries
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68, marginBottom: 8 }}>
              Service capacity is allocated pursuant to your selected tier:
            </p>
            <ul style={{ paddingLeft: 20, color: 'var(--text-2)', fontSize: '0.86rem', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Free Starter Tier:</strong> Strictly bounded to individual transfers of up to 10 GB with standard throughput priority and maximum 10 downloads per generated link.</li>
              <li><strong>Pro & Ultra Subscription Tiers:</strong> Expanded limits of 50 GB to 200 GB per transfer, unlimited downloads, priority bandwidth scheduling, and extended retention lifecycles.</li>
              <li><strong>Payload Integrity:</strong> DropLync enforces automatic server-side rejection (HTTP 403 Forbidden) on payloads that exceed declared tier allocations.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              3. Acceptable Use & Content Restrictions
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68, marginBottom: 8 }}>
              You agree not to utilize DropLync infrastructure to upload, distribute, or facilitate the transfer of:
            </p>
            <ul style={{ paddingLeft: 20, color: 'var(--text-2)', fontSize: '0.86rem', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Malicious software, exploit payloads, worms, or unauthorized penetration utilities.</li>
              <li>Proprietary or copyrighted assets without requisite legal authorization or license.</li>
              <li>Unlawful, non-consensual, or fraudulent materials.</li>
            </ul>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68, marginTop: 8 }}>
              DropLync reserves the right to immediately invalidate links, purge corresponding storage blocks, and terminate accounts found in breach of this policy.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              4. Subscription Billing & Cancellation
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              Upgraded tier subscriptions are billed on a recurring monthly or annual basis. Subscribers may modify or cancel renewals at any time via the customer dashboard. Upon cancellation, enhanced capacity remains active through the end of the prepaid billing cycle, after which the account transitions to the Free 10GB tier.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              5. Disclaimer of Warranties & Limitation of Liability
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              The platform is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of uninterrupted availability or persistent archival. DropLync is an ephemeral transmission conduit; users remain responsible for maintaining independent master backups of all transferred data.
            </p>
          </section>

        </div>

        {/* Minimal Document Nav */}
        <div style={{ marginTop: 24, display: 'flex', gap: 20, justifyContent: 'center' }}>
          <a href="/privacy" style={{ color: 'var(--text-3)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
          <span style={{ color: 'var(--border)' }}>·</span>
          <a href="/security" style={{ color: 'var(--text-3)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>Security Architecture</a>
          <span style={{ color: 'var(--border)' }}>·</span>
          <a href="/pricing" style={{ color: 'var(--brand)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700 }}>Pricing & Plans</a>
        </div>
      </main>
    </div>
  )
}
