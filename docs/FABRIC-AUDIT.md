# Fabric upgrade — audit before edits (2026-11-05)

Checkout: `/home/ashenix/Desktop/nasj-first-thread`, baseline `5edeff5`.
The only pre-existing untracked content is `assets/` (the user-supplied video); preserve it.

- Next.js App Router, React 19, strict mode, TypeScript strict; pnpm 11.3.0. Existing GSAP, @gsap/react and Motion dependencies. No ESLint configuration or automated test runner/scripts at baseline.
- `components/HeroExperience.tsx`: pinned GSAP timeline for widths >=761px. `app/globals.css` switches to a static layout at <=850px: mismatched thresholds can pin the tablet static layout. Copy, platform cards and textile share a transformed/perspective scene. The textile uses `/images/fabric-cutout.png`, faux blurred backing and shine; there is no footage playback. The golden orbit is a CSS ellipse rather than a path.
- `components/PortalLink.tsx`: each link owns a fixed overlay inside its React parent, so ancestor transforms/perspective/filter create an incorrect containing/stacking context. The state-only duplicate-click guard is asynchronous. The patterned wipe has no navigation-error or pageshow reset, cleanup, or timeout recovery. Reduced-motion links navigate directly.
- `components/PlatformUI.tsx`: separate HTML catalog, request and production concepts, labeled illustrative. Reveal cards themselves are static. `app/platform/page.tsx` is the safe local concept tour.
- `NEXT_PUBLIC_NASJ_PLATFORM_URL` is the existing public target; unset/invalid => `/platform`. Do not invent a target. Keep secrets out of reports and browser code.
- `AlphaForm.tsx` => `/api/early-access` => `early_access_applications`. `CraftForm.tsx` on `/community` => `/api/craft-community` => `craft_community_submissions`. Independent consent timestamps and craft collaboration preference. Preserve both.
- `lib/validation.ts`: separate Zod schemas, honeypot, limits, role/craft enums and consent. `lib/submission.ts`: same-origin/content-type checks, HMAC IP fingerprint, atomic DB-backed five-per-ten-minute/per-form rate limit. Routes return generic duplicate confirmations and 503 on database failure. Neon HTTP integration in `lib/db.ts`. No DB writes/migrations authorized for this visual upgrade.
- Existing limitation: malformed JSON/oversized input throws into generic 503 rather than 400/413; validation runs after DB-backed preflight and therefore also writes a rate-limit counter. Keep this unrelated behavior unchanged and test APIs with isolated mocks, never by submitting to the configured database.
- Discovered source is `assets/source/nasj-video.mp4`: H.264, yuv420p (no alpha), 1280×720, 24fps, 240 frames, 10s video, AAC audio; 8,458,465 bytes. White/neutral studio background, detailed tan cloth with dark green/terracotta embroidery. At ~4–5s textile exits, at ~6s approaches, 7–10s is a close-up. Analyze cut points accordingly.
- No separate master still or external approved reference attachment found. Existing `design/design-preview.*`, brand tokens, page copy and photography are retained as the available design reference. Original files will not be overwritten.

Before screenshots are captured with the actual Next.js page (not the static design snapshot). Browser tests must avoid live form POSTs.

## Additional defects found during responsive validation

The 580px decorative mobile stage used automatic margins plus scaling; on narrow grid tracks its visual center was displaced to the right, clipping most of the phone. It now uses an explicit centered transform and small-screen scale steps. The platform, join, FAQ and craft-page percentage grids each consumed 100% of the width plus their column gap; fractional tracks now include the gap in the available width. The original public platform target is configured and is preserved; local browser navigation tests use a build-only empty override, not an edit to environment files.
