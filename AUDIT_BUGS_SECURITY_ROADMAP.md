# DropLync Comprehensive Codebase Audit: Security, Privacy, Bugs & Pending Roadmap

> **Audit Date:** August 2026  
> **Repository:** DropLync (High-Performance Multi-GB Cloud Transfer Platform)  
> **Tech Stack:** Next.js 14 (App Router), Prisma ORM, SQLite, Nodemailer (Live SMTP), Vanilla CSS Glassmorphism 3D UI

---

## 🚨 PART 1: CRITICAL SECURITY & PRIVACY VULNERABILITIES (P0 - Immediate Priority)

### 1. 🔴 Public Storage Directory Exposure (Direct File Access Bypass)
- **File:** [`lib/storage.ts`](file:///c:/Users/Admin/Documents/droplync/lib/storage.ts), [`.env`](file:///c:/Users/Admin/Documents/droplync/.env)
- **Severity:** `CRITICAL` (CVSS 9.1)
- **Vulnerability:** `UPLOAD_DIR` defaults to `./public/uploads`. In Next.js, all files placed inside the `./public/` directory are statically served over HTTP by default.
- **Exploitation Impact:** Any visitor who knows or enumerates a storage path (`http://localhost:3000/uploads/files/[transferId]/[fileId].ext`) can download private, sensitive, or password-protected files **directly**, completely bypassing:
  - Password authentication (`x-transfer-password` / bcrypt).
  - Transfer expiration date checks.
  - Max download limit restrictions.
  - Download count increments and IP audit logging.
- **Remediation Required:**
  - Change default `UPLOAD_DIR` to a secure directory outside `public`, such as `./storage/uploads` or `./data/uploads`.
  - Ensure all file downloads are exclusively routed through the streaming route handler [`/api/share/[token]/files/[fileId]`](file:///c:/Users/Admin/Documents/droplync/app/api/share/%5Btoken%5D/files/%5BfileId%5D/route.ts).

---

### 2. 🔴 Unauthenticated Admin Console (`/admin` Authorization Bypass)
- **File:** [`app/admin/page.tsx`](file:///c:/Users/Admin/Documents/droplync/app/admin/page.tsx)
- **Severity:** `CRITICAL` (CVSS 8.8)
- **Vulnerability:** `AdminPage` server component executes direct database queries fetching all users (emails, names, roles, account status), transfer histories, and platform statistics without calling `requireAdmin()` or verifying session cookies.
- **Exploitation Impact:** Any anonymous visitor can navigate to `/admin` and view full user registries, download logs, active transfer tokens, and platform metrics.
- **Remediation Required:**
  - Add `const user = await requireAdmin()` at the very start of `app/admin/page.tsx`.
  - If unauthenticated or non-admin, redirect to `/login` or return a `403 Forbidden` response.

---

### 3. 🔴 Unchecked Chunk Injection on Upload Endpoints (IDOR / Session Hijacking)
- **Files:** [`app/api/uploads/[fileId]/chunk/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/uploads/%5BfileId%5D/chunk/route.ts), [`app/api/uploads/[fileId]/complete/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/uploads/%5BfileId%5D/complete/route.ts)
- **Severity:** `HIGH` (CVSS 7.5)
- **Vulnerability:** Chunk upload and completion routes lookup `TransferFile` by `fileId` only. They do not verify if the current authenticated user owns the parent `Transfer` (or matches the session creator).
- **Exploitation Impact:** An attacker who knows or intercepts a `fileId` can overwrite chunks, inject malicious payload bytes into another user's transfer, or prematurely finalize a file with truncated size.
- **Remediation Required:**
  - Verify session or transfer ownership token on chunk reception before writing to disk.

---

### 4. 🔴 Unprotected Cron Endpoint (`/api/cron` Denial of Service)
- **File:** [`app/api/cron/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/cron/route.ts)
- **Severity:** `HIGH` (CVSS 7.2)
- **Vulnerability:** The route only validates `x-cron-secret` if `process.env.CRON_SECRET` is set. When `CRON_SECRET` is undefined in `.env`, the authorization check is skipped entirely.
- **Exploitation Impact:** Any anonymous user can send a `POST /api/cron` request, triggering mass file purges and deleting all inactive transfers and sessions.
- **Remediation Required:**
  - Enforce mandatory `CRON_SECRET` check; return `401 Unauthorized` if the header is missing or does not match.

---

### 5. 🟡 Rate Limiting Missing on Email OTP Generation (SMTP Resource Exhaustion)
- **File:** [`app/api/auth/otp/send/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/auth/otp/send/route.ts)
- **Severity:** `MEDIUM` (CVSS 5.3)
- **Vulnerability:** The `/api/auth/otp/send` route does not rate limit consecutive requests per IP or email.
- **Exploitation Impact:** Attackers can loop API requests to flood recipient inboxes with verification emails, hitting Gmail SMTP daily quotas and causing temporary SMTP account locks.
- **Remediation Required:**
  - Add `checkRateLimit('otp-ip:' + ip, 5, 60000)` (max 5 requests/minute per IP) and `checkRateLimit('otp-email:' + email, 3, 60000)` (max 3/minute per email).

---

### 6. 🟡 Privacy: Unhashed IP Address Storage & Missing Consent
- **File:** [`app/api/share/[token]/download-all/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/share/%5Btoken%5D/download-all/route.ts), [`prisma/schema.prisma`](file:///c:/Users/Admin/Documents/droplync/prisma/schema.prisma)
- **Severity:** `MEDIUM` (GDPR / CCPA Compliance)
- **Vulnerability:** `DownloadLog` records full raw IP addresses in plain text without anonymization (e.g. masking last octet `192.168.1.xxx`) or retention policy.
- **Remediation Required:**
  - Provide IP hashing/masking option for privacy-compliant download logging.
  - Implement a 30-day auto-purge for download telemetry.

---

## 🐛 PART 2: APPLICATION & LOGIC BUGS

### 1. Missing DownloadLog Record on Single File Downloads
- **File:** [`app/api/share/[token]/files/[fileId]/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/share/%5Btoken%5D/files/%5BfileId%5D/route.ts)
- **Issue:** Single file downloads increment `transferFile.downloadCount` and `transfer.downloadCount`, but **never insert a record into `prisma.downloadLog`**. Only the `download-all` route creates `DownloadLog` entries.
- **Result:** The transfer owner's dashboard analytics displays download counts, but the geo/IP/agent activity table remains empty for single file downloads.

### 2. `Transfer.totalSize` Never Recalculated After Chunks Complete
- **File:** [`app/api/transfers/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/transfers/route.ts), [`app/api/uploads/[fileId]/complete/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/uploads/%5BfileId%5D/complete/route.ts)
- **Issue:** Transfer sessions are initialized with `totalSize: 0`. As individual files complete uploading, `TransferFile.size` is updated, but the parent `Transfer.totalSize` aggregate is not updated.
- **Result:** Some database queries and dashboard cards show `0 MB` for completed transfers until manually calculated.

### 3. Missing API Endpoints for Admin Management
- **Directory:** `app/api/admin/`
- **Issue:** The directories `app/api/admin/stats/` and `app/api/admin/transfers/` contain missing or incomplete route handlers for paginated administrative tables.

### 4. Orphaned Chunk Files on Interrupted Uploads
- **File:** [`lib/storage.ts`](file:///c:/Users/Admin/Documents/droplync/lib/storage.ts)
- **Issue:** If a user closes the browser while uploading a 10GB file at 40%, the partial file remains on disk forever unless cleaned up by cron.
- **Fix:** Add an upload session heartbeat or purge unfinalized files older than 24 hours in the cron worker.

### 5. Verification Tokens Retention Cleanup
- **File:** [`app/api/cron/route.ts`](file:///c:/Users/Admin/Documents/droplync/app/api/cron/route.ts)
- **Issue:** Used and expired `VerificationToken` records are not purged in the cron cleanup job, resulting in accumulation of stale OTP records over time.

---

## 📋 PART 3: PENDING ROADMAP & FUNCTIONALITIES TO BUILD

| # | Feature Area | Description | Status |
|---|---|---|---|
| 1 | **Client-Side Zero-Knowledge Encryption (E2EE)** | Implement Web Crypto API (AES-GCM 256-bit) to encrypt file chunks directly in the browser with a user password before transmission, so files are stored encrypted on disk. | `PENDING` |
| 2 | **Payment Gateway & Plan Upgrades** | Stripe / LemonSqueezy integration to allow users to upgrade from Free (10GB) to Pro (50GB - $9/mo), Ultra (200GB - $24/mo), or Enterprise (1TB+). | `PENDING` |
| 3 | **Upload Pause / Resume & Auto-Retry UI** | Visual pause/resume controls in the upload progress drawer with automatic exponential backoff retry for spotty network connections. | `PENDING` |
| 4 | **Folder Upload & Hierarchy Preservation** | Support drag-and-dropping entire folders with nested directories, preserving directory structures during zip generation. | `PENDING` |
| 5 | **Transfer Recipient Email Notification Dispatch** | Allow senders to enter multiple recipient email addresses; system dispatches branded download emails with one-click access links. | `PENDING` |
| 6 | **Custom Branding for Pro/Ultra Users** | Enable Pro/Ultra users to customize their download landing page with custom wallpapers, logos, and custom accent colors. | `PENDING` |
| 7 | **User Account Settings & Security Tab** | User profile page allowing: display name change, password update, active session revocation ("Log out of all devices"), and self-service account deletion (GDPR). | `PENDING` |
| 8 | **Developer API Keys & Webhooks** | API token management in dashboard allowing developers to create transfers via REST API and receive webhook alerts on download events. | `PENDING` |
| 9 | **Virus & Malware Scanning Integration** | ClamAV / VirusTotal scanner integration on incoming file streams before marking files available for download. | `PENDING` |
| 10 | **Custom Vanity URLs / Short Links** | Allow custom slug selection (e.g. `droplync.com/f/client-presentation-2026`) for Pro tiers. | `PENDING` |

---

## 💡 PART 4: RECOMMENDED PROMPT TEMPLATE FOR FUTURE WORK

Use the prompt below in your next session to instruct the assistant on tackling these items:

\`\`\`markdown
Hi Antigravity, please help me implement the following fixes and features for DropLync based on our comprehensive audit file:

1. SECURITY FIRST (P0):
   - Move `UPLOAD_DIR` out of `./public/uploads` to `./storage/uploads` so uploaded files cannot be accessed statically without authentication.
   - Add `requireAdmin()` check to `app/admin/page.tsx` so unauthenticated visitors are redirected to `/login`.
   - Add `checkRateLimit` to `app/api/auth/otp/send/route.ts` to prevent email spam.
   - Enforce mandatory `CRON_SECRET` validation in `app/api/cron/route.ts`.

2. BUG FIXES & DATA INTEGRITY:
   - In `app/api/share/[token]/files/[fileId]/route.ts`, insert a `prisma.downloadLog` record on every single-file download.
   - In `app/api/uploads/[fileId]/complete/route.ts`, recalculate and update `transfer.totalSize` aggregate on the parent transfer.
   - Update `app/api/cron/route.ts` to purge expired `VerificationToken` rows and orphaned unfinalized upload chunks.

3. NEW FUNCTIONALITY:
   - Create User Account Settings page (`/settings`) with profile name update, password changer, and active session manager.
   - Add multi-recipient email sending on the transfer creation widget.

Please run tests to verify that all endpoints build and function cleanly.
\`\`\`
