# NASJ — The First Thread

A standalone Next.js 16 pre-launch microsite for NASJ. The page is inspired by the original NASJ visual identity: deep forest green, warm linen, terracotta, thread gold, craft photography and a woven-thread motif.

## Implemented

- Desktop **scroll-controlled embroidered fabric**: real preprocessed transparent frames awaken, lift and fill the hero; the animation ends at the approved close-up and releases normal page scrolling into the platform tour. A scoped GSAP timeline controls the textile, separate UI layers and golden SVG thread; mobile, tablet and reduced-motion layouts use the optimized poster and normal document flow.
- **Explore NASJ** entrance: shared viewport-level real-textile wipe, with duplicate-click protection, cleanup and stalled-navigation recovery. The fabric itself is an accessible portal link. The destination remains the configured main NASJ URL or the local illustrative `/platform` tour.
- NASJ platform showcase: catalog, gift-request journey and artisan/association coordination, explicitly marked as illustrative concept screens. No invented production metrics.
- **The First Thread** private alpha application, with role, organization, location, testing interests and consent.
- **Open craft-community intake** at `/community` for independent artisans, cooperatives, associations, workshops and craft businesses, with craft types, work description, location and separate optional collaboration preference.
- Neon PostgreSQL HTTP driver, server-side Zod validation, individual form tables, SQL migration, duplicate handling, request throttling, bot honeypot, draft privacy notice.
- Branded first-thread emblem as a reusable vector SVG at `/first-thread-badge.svg`.

## Run locally

Requirements: Node.js 22+, pnpm 11.3.0 (pinned in `packageManager`), and a Neon database.

```bash
corepack enable
pnpm install
cp .env.example .env.local
```

1. In Neon, create a project and open **SQL Editor**.
2. Execute `db/001_init.sql` against your chosen database.
3. Set `DATABASE_URL` in `.env.local` to the **server-side Neon connection string**. NEVER prefix it with `NEXT_PUBLIC_`.
4. Generate a secret with `openssl rand -hex 32` and set `IP_HASH_SECRET`.
5. To send portal visitors directly to the main NASJ app, set `NEXT_PUBLIC_NASJ_PLATFORM_URL=https://<your-real-app-domain>`; otherwise the portal opens `/platform`, the included concept-only tour.
6. Start the app:

```bash
pnpm dev
```

### Vercel domain

1. Import `ASHEN-IX/nasj-first-thread` into Vercel using the Next.js framework preset. Use Node.js 22 or newer and the committed pnpm lockfile.
2. In the project's **Settings → Environment Variables**, set `DATABASE_URL` and `IP_HASH_SECRET` for Production. Transfer the values securely from your local environment; never commit them or prefix them with `NEXT_PUBLIC_`. Configure Preview separately if preview submissions are needed.
3. Leave `NEXT_PUBLIC_NASJ_PLATFORM_URL` unset to use the included `/platform` tour. Only set it when a separate NASJ application exists; pointing it at this landing page's domain sends visitors back to the landing page.
4. Deploy, then add `nasj-platform.ddns.net` in **Settings → Domains**. In No-IP, configure the exact DNS records Vercel displays for that domain. Do not assume a fixed IP address; the project's assigned records are authoritative. Disable any dynamic-IP updater that would overwrite this hostname.
5. Wait for Vercel to confirm valid DNS and issue the HTTPS certificate. Redeploy after environment-variable changes, then test both registration forms on the custom domain.

See [Vercel's domain configuration instructions](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

Open `http://localhost:3000`.

## Validate

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The database is required for successful submissions. Without a configured database, the API responds with a temporary-unavailable error; it never pretends a registration has been saved.

### Manual verification checklist

- Desktop: scroll slowly through hero, confirm four animation stages and that the last stage exposes real platform cards and the Explore NASJ CTA.
- Mobile viewport: the content and platform tour remain visible without pinned scrolling.
- Enable reduced motion in OS/browser: content stays navigable and portal links use direct navigation.
- Alpha: required fields, invalid email, missing consent, duplicate email, success, rate limit, database-down behavior.
- Craft: required craft selection, required details, optional collaboration preference and safe handling of duplicates.
- Keyboard navigation, screen reader labels, tab order, and focus handling after form submission.

## Architecture

```
app/
  page.tsx                  Landing page
  community/page.tsx        Open craft-community registration
  platform/page.tsx         Demo platform tour (fallback only)
  privacy/page.tsx          Draft information notice
  api/early-access/route.ts
  api/craft-community/route.ts
components/
  HeroExperience.tsx        GSAP scrubbed textile portal
  PlatformUI.tsx            Actual HTML product preview cards
  PortalLink.tsx            Exit transition + destination
  AlphaForm.tsx, CraftForm.tsx
lib/
  db.ts, validation.ts, submission.ts
public/
  first-thread-badge.svg
  images/
    # Photography / textile crop drawn from user-provided NASJ concept reference
```

### Security and operations notes

- `IP_HASH_SECRET` must be long, random, and persistent across deployments. `submission_rate_limits` tracks a 10-minute window with 5 attempts per form, per fingerprint. Production deployment MUST use a trusted proxy that sets the real client IP (typically the hosting platform); untrusted X-Forwarded-For headers can be spoofed on an unmanaged origin.
- Email values are normalized to lowercase, have a uniqueness constraint, and duplicates receive the same generic confirmation response. There is no public applicant export or admin route.
- No password/account creation, automated invitations, outbound email, or real alpha authorization has been implemented. Those require the actual NASJ backend and onboarding/approval policy.
- The current privacy notice is a **draft, not legal sign-off**. Add the operator's legal name and contact, lawful basis, detailed retention and deletion schedule, and privacy rights process before public deployment; confirm applicable Tunisian data-protection obligations with appropriate counsel.
- Add observability, email verification or transactional delivery, retention/deletion jobs and administrative review screens before broad promotion. An edge/WAF-level limit and CAPTCHA/Turnstile can complement the DB-backed limiter if abuse appears.
- Use least-privilege DB credentials for runtime and a separate migration role if the platform grows. Rotate secrets if exposed.
- `DATABASE_URL` and `IP_HASH_SECRET` are never used by client components.

## Prior baseline verification (before the cinematic upgrade)

Local verification on November 5, 2026: `pnpm typecheck` and `pnpm build` passed; both production-server API routes returned HTTP 200 and persisted synthetic submissions in Neon. The synthetic submissions and their rate-limit counters were removed afterward. A scan of `.next/static` found none of the configured database URL, database password, or IP hashing secret.

Deployment status and production environment variables must be verified in the connected Vercel project; local `.env.local` values are not automatically copied to Vercel.

## Cinematic fabric pipeline

See [docs/FABRIC.md](docs/FABRIC.md) for source inspection, reproducible offline Python processing, cut timestamps, matting limitations, responsive rendering, portal recovery and transfer budgets. [docs/FABRIC-AUDIT.md](docs/FABRIC-AUDIT.md) records the baseline implementation and existing defects before this upgrade. [docs/FABRIC-VERIFICATION.md](docs/FABRIC-VERIFICATION.md) records this delivery's checks.

The original video remains unchanged in `assets/source/`. Public WebP assets total 2.50 MB, with a 28 KB mobile hero poster; the large video is never requested by the page. Catalog, request and production tabs are illustrative concepts. No registrations, migrations or production data changes were performed to implement or test this upgrade.

The header's existing simplified vector logo is retained; an independently approved logo/reference was not supplied with this task.

## Reviewing signups

No administrator dashboard or email notification is included in this first delivery. Authorized project owners can review entries in the Neon SQL editor:

```sql
SELECT id, full_name, email, participant_role, organization, testing_interest, status, created_at
FROM early_access_applications ORDER BY created_at DESC;

SELECT id, contact_name, email, participant_type, region, craft_types,
       open_to_collaboration, status, created_at
FROM craft_community_submissions ORDER BY created_at DESC;
```

The local static visual design QA snapshot lives in `design/design-preview.html`. It is not connected to the backend or GSAP. The production experience is the Next.js application at `app/page.tsx`.

Keep the committed `pnpm-lock.yaml` updated when changing dependencies so deployment builds remain reproducible.
