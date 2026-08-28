import Navbar from '@/components/Navbar'
import Background3D from '@/components/Background3D'
import { getSession } from '@/lib/auth'

export const metadata = {
  title: 'Security Architecture & Compliance — DropLync',
  description: 'Technical overview of DropLync cryptographic safeguards, chunk isolation, and infrastructure security.'
}

export default async function SecurityPage() {
  const user = await getSession()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <Background3D />
      <Navbar user={user} />

      <main className="section-container" style={{ maxWidth: 860, padding: '32px 24px 60px', position: 'relative', zIndex: 1 }}>
        {/* Document Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Technical Whitepaper · Infrastructure Security
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 6 }}>
            Security Architecture & Compliance
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>
            System Specification · Revision 3.2 · TLS 1.3 & AES-256 Verified
          </p>
        </div>

        {/* Technical Architecture Body */}
        <div className="glass-panel" style={{ padding: '32px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              1. Cryptographic Transport & At-Rest Standards
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              All client-to-server and server-to-recipient communication channels mandate Transport Layer Security (TLS 1.3) with forward secrecy (ECDHE key exchange). At rest, stored file blocks are safeguarded with hardware-accelerated AES-256 block encryption. Unsigned read requests without valid high-entropy cryptographic session tokens are denied at the gateway level.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              2. Direct-Offset Chunk Streaming Architecture
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68, marginBottom: 8 }}>
              DropLync utilizes an asynchronous chunk streaming pipeline designed for zero server-memory bottlenecks:
            </p>
            <ul style={{ paddingLeft: 20, color: 'var(--text-2)', fontSize: '0.86rem', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Positional Chunk Ingestion:</strong> Inbound 5 MB payload segments write directly to target byte offsets via native file descriptors without intermediate server buffering.</li>
              <li><strong>Concurrent Multi-Part Integrity:</strong> Chunks are validated individually; in the event of packet loss or network degradation, only the failing segment is requested for retransmission.</li>
              <li><strong>Instantaneous Completion:</strong> Links activate immediately upon ingestion of the final chunk without requiring multi-gigabyte reassembly phases.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              3. Password Protection & Rate-Limited Access Shielding
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              Sender-configured passwords are encrypted using adaptive bcrypt algorithms with strong salt complexity. Password verification routes are isolated behind token-bucket rate limiters that automatically throttle unauthorized brute-force attempts and mitigate automated credential-stuffing traffic.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              4. Automated Expiration & Secure Block Destruction
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              Transfer validity is enforced via cryptographically signed time stamps. Upon expiration or max download threshold fulfillment, background daemon routines unlink filesystem inodes and execute secure block release, ensuring complete, irrecoverable data sanitization.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              5. Vulnerability Coordination & Responsible Disclosure
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.68 }}>
              Security researchers and system auditors are encouraged to report potential vulnerabilities to our dedicated security engineering team at <a href="mailto:security@droplync.com" style={{ color: 'var(--brand)', fontWeight: 700 }}>security@droplync.com</a>. We adhere to coordinated vulnerability disclosure timelines with response SLAs within 24 hours.
            </p>
          </section>

        </div>

        {/* Minimal Document Nav */}
        <div style={{ marginTop: 24, display: 'flex', gap: 20, justifyContent: 'center' }}>
          <a href="/privacy" style={{ color: 'var(--text-3)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
          <span style={{ color: 'var(--border)' }}>·</span>
          <a href="/terms" style={{ color: 'var(--text-3)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
          <span style={{ color: 'var(--border)' }}>·</span>
          <a href="/pricing" style={{ color: 'var(--brand)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700 }}>Pricing & Plans</a>
        </div>
      </main>
    </div>
  )
}
