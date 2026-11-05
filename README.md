# NASJ — The First Thread

A standalone Next.js 16 pre-launch microsite for NASJ. The page is inspired by the original NASJ visual identity: deep forest green, warm linen, terracotta, thread gold, craft photography and a woven-thread motif.

## Implemented

- Desktop **four-stage scroll portal**: textile lifts → approaches the viewer → covers the stage → reveals a live HTML-based platform tour. GSAP ScrollTrigger pins the hero and scrubs through the sequence. On smaller screens and for reduced-motion users, the tour is presented directly without scroll hijacking.
- **Explore NASJ** entrance: a fabric-patterned full-screen wipe before navigating to the main NASJ URL or a local illustrative `/platform` tour.
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

Open `http://localhost:3000`.

## Validate

```bash
pnpm typecheck
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

## Current verification status

The source was generated and inspected, but dependency installation and Next.js build could not be executed in the generation environment because the npm registry was unreachable. Run `pnpm install`, `pnpm typecheck`, and `pnpm build` in your development/CI environment before deployment.

## Creative notes

The hero cloth is a transparent textile cutout prepared from the NASJ art reference. GSAP animates it in 2.5D with subtle skew/fold deformation, camera approach and a full-page woven texture overlay. This is intentionally not a cloth physics simulation. A future React Three Fiber shader or pre-rendered cloth sequence can upgrade its folds if needed; evaluate accessibility and GPU cost first.

The header includes a simplified hand-drawn NASJ vector symbol for the prototype. Replace it with the approved official logo asset before launch.

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

After installing dependencies, generate and commit `pnpm-lock.yaml` to make deployment builds reproducible.
