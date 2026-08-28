import Navbar from '@/components/Navbar'
import Background3D from '@/components/Background3D'
import { getSession } from '@/lib/auth'

export const metadata = {
  title: 'Privacy Policy — DropLync',
  description: 'Official Privacy Policy and Data Protection Framework for DropLync Cloud Services.'
}

export default async function PrivacyPage() {
  const user = await getSession()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <Background3D />
      <Navbar user={user} />

      <main className="section-container" style={{ maxWidth: 860, padding: '32px 24px 60px', position: 'relative', zIndex: 1 }}>
        {/* Document Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Legal Documentation · Privacy & Data Governance
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 6 }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>
            Last Revised: August 27, 2026 · Reference ID: DL-PRIV-2026.4
          </p>
        </div>

        {/* Corporate Legal Body */}
        <div className="glass-panel" style={{ padding: '32px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              1. Overview & Data Processing Principles
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68, marginBottom: 8 }}>
              DropLync (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates a high-throughput, encrypted file transmission infrastructure. We are committed to upholding strict data minimization standards. The platform operates under a non-retention model: files delivered via DropLync are treated as in-transit payload rather than archival storage.
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              We do not monitor, inspect, index, analyze, or commercialize the contents of transmitted files under any circumstances.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              2. Data Classification & Collection Scope
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68, marginBottom: 10 }}>
              The personal and technical data processed by DropLync is limited to the following categories:
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ padding: '12px 14px', background: 'var(--glass-bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-1)', fontSize: '0.86rem' }}>Account & Authentication Data:</strong>
                <span style={{ color: 'var(--text-2)', fontSize: '0.84rem', display: 'block', marginTop: 2 }}>
                  For registered users: full name, verified email address, salted bcrypt cryptographic password hashes, and active subscription tier metadata.
                </span>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--glass-bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-1)', fontSize: '0.86rem' }}>Transmission Metadata:</strong>
                <span style={{ color: 'var(--text-2)', fontSize: '0.84rem', display: 'block', marginTop: 2 }}>
                  Randomly generated alphanumeric session tokens, byte size indicators, MIME content-type headers, and chunk offset indices required to reconstruct payload during recipient streaming.
                </span>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--glass-bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-1)', fontSize: '0.86rem' }}>Operational Telemetry:</strong>
                <span style={{ color: 'var(--text-2)', fontSize: '0.84rem', display: 'block', marginTop: 2 }}>
                  Anonymized request timestamps and client IP addresses stored in volatile cache exclusively for rate-limiting enforcement, volumetric DDoS mitigation, and brute-force prevention.
                </span>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              3. Retention Schedules & Cryptographic Destruction
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68, marginBottom: 8 }}>
              All transfer instances are governed by time-bound or threshold-bound lifecycle limits:
            </p>
            <ul style={{ paddingLeft: 20, color: 'var(--text-2)', fontSize: '0.86rem', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Free 10GB Tier:</strong> Payloads are retained for a maximum duration of 7 days or up to 10 completed downloads, whichever condition is satisfied first.</li>
              <li><strong>Pro & Ultra Tiers:</strong> Retained for 30 to 90 calendar days as defined by the account owner.</li>
              <li><strong>Irreversible Deletion:</strong> Upon link expiration, manual termination, or fulfillment of download limits, the file handle is severed, chunk references are purged from the database, and physical blocks are marked for immediate disk overwrite.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              4. Cookies & Session Management
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              DropLync issues strictly necessary, HTTP-only session cookies to authenticate user sessions and validate CSRF state. We do not use third-party analytics trackers, advertising beacons, or behavioural monitoring networks.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              5. Statutory Rights & Legal Inquiries
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              Pursuant to applicable data protection regulations (including GDPR and CCPA/CPRA), account holders may request access to, rectification of, or complete deletion of their account records. Inquiries should be submitted formally to our compliance department at <a href="mailto:privacy@droplync.com" style={{ color: 'var(--brand)', fontWeight: 700 }}>privacy@droplync.com</a>.
            </p>
          </section>

        </div>

        {/* Minimal Document Nav */}
        <div style={{ marginTop: 24, display: 'flex', gap: 20, justifyContent: 'center' }}>
          <a href="/terms" style={{ color: 'var(--text-3)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
          <span style={{ color: 'var(--border)' }}>·</span>
          <a href="/security" style={{ color: 'var(--text-3)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>Security Architecture</a>
          <span style={{ color: 'var(--border)' }}>·</span>
          <a href="/pricing" style={{ color: 'var(--brand)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700 }}>Pricing & Plans</a>
        </div>
      </main>
    </div>
  )
}
