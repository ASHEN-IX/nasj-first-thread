# Cinematic textile verification — 2026-11-05

## Current behavior: opening, close-up, normal scrolling

The approved opening motion is restored through the fabric close-up matching the reference recording around second 4. The animation ends at that pose and the hero immediately unpins. Further scrolling moves the cloth/hero upward with the document and reveals the platform tour in normal page flow. There is no subsequent sideways wipe, return pass, or pinned hold. The two registration forms and click-triggered platform link remain unchanged. This replaces the earlier wipe experiments described below.

Baseline: `5edeff5`; implementation is in the existing checkout, with no production deployment performed.

## Automated checks

- `pnpm lint`: pass, zero warnings/errors (new ESLint 10 + typescript-eslint development tooling).
- `pnpm typecheck`: pass, strict TypeScript.
- `pnpm test`: 11 tests pass. Actual API handlers, preflight, schemas and Neon adapter are executed in isolated VMs; Neon is replaced before execution, with no environment-file loading or database network calls. Asset provenance/transfer budgets and timestamp-based reversible selection also pass. The expected Node experimental-VM warning is documented.
- `pnpm build`: pass with the existing environment configuration. A separate build-only `NEXT_PUBLIC_NASJ_PLATFORM_URL=` override was used to isolate browser navigation to `/platform`; saved environment files were never changed. The final build restores the existing configured platform destination.
- `git diff --exit-code -- components/AlphaForm.tsx components/CraftForm.tsx lib/db.ts lib/validation.ts lib/submission.ts app/api db`: pass. Form components, validation, database implementation, route handlers and schema are unchanged.
- Python pipeline run twice: generated sequence bytes and source SHA-256 agree. ffprobe inspection and green/cream contact sheets are retained in `assets/previews/`.

## Real browser checks

Playwright CLI with installed Chromium 157, local production server. Browser navigation uses the local showcase override. No production database submissions or migrations were made.

- 1440×1000 desktop: isolated RGBA textile, independent catalog/mobile DOM mockups, thread SVG, exactly one pinned scene and viewport overlay directly under `body`. No horizontal overflow.
- Scroll positions 400 → 1000 → 1800 → 2190 → 1000 → 0 produce frames 4 → 12 → 27 → 29 → 12 → 0. URL unchanged throughout. The platform tour fits inside the viewport.
- Discover/Request/Coordinate tabs work by click and arrow keys. Concepts remain labeled illustrative.
- Double-triggered portal click reaches an opaque full viewport (1440×1000, opacity 1) before navigation. The overlay resets after route change. Both the preloaded portal canvas and the immediate-click poster fallback were exercised.
- A deliberately delayed destination triggers the four-second watchdog: overlay becomes hidden, body stays scrollable and a direct retry link appears. Navigation can subsequently complete.
- Three desktop/tablet cycles: one desktop pin and zero tablet pins. Three home/community/home cycles: no scene pin survives unmount and tracked media-query listener totals stay constant at 6 → 6 → 6 → 6. This checks accumulation across visits; it is not a heap-profiler proof about every library-internal object.
- Alpha and craft forms: actual controls filled and submitted through intercepted, synthetic responses. Correct distinct routes/payloads and success feedback; craft selection validation and separate optional collaboration=false confirmed. No live POSTs. Server-side failure/validation/rate-limit cases covered by the isolated automated tests.
- Widths 320, 375, 390, 768 and 900: zero horizontal overflow, no scroll pinning and mobile mockups remain within the viewport. Percentage grids that previously added their gaps outside the available width were changed to fractional tracks.
- 390×844 mobile: optimized poster, zero scroll-frame requests, zero pins. Fabric click transition reaches the local tour and resets.
- Desktop reduced motion: no pins or scroll-frame requests, tour visible in normal flow, ordinary direct-link navigation without the long wipe.
- Constrained desktop and failed-frame loading use the optimized poster fallback; see raw browser-results.json for returned assertions.
- No JavaScript runtime errors in the main browser suite. Fresh-page sampled CLS (one observer per page): desktop 0.00048, mobile 0.00214. These are local Chromium samples, not field Core Web Vitals. The final normal build transferred 1,520,084 encoded textile bytes on desktop (including manifest) and 81,062 on mobile (poster/portal stills); these exclude the rest of the page.

## Measured asset footprint

All public textile image assets: 2,498,278 bytes against an enforced 4,000,000-byte ceiling. Scroll: 1,417,800 bytes / 30 frames / 960×540. Portal: 951,048 bytes / 18 frames / 640×360. Mobile poster: 28,426 bytes; desktop poster: 48,368 bytes. Manifest metadata is additional and compresses to about 1.3 KB in the sampled production response.

No source MP4 or audio is requested by the page. Mobile and reduced-motion visitors do not fetch the desktop scroll frames. Portal frames are fetched on hover/focus intent. The all-images size is not an assertion about total site JavaScript, fonts, photography or transfer on every route. No Lighthouse score or hardware FPS benchmark was performed.

## Scope and limitations

- Original high-quality source video is unchanged. No separate original master still or approved external reference was supplied; the new still is derived losslessly from the supplied footage, and the existing NASJ design/copy is retained.
- Source has no alpha; processed alpha is derived using the documented neutral-studio-background method. It requires inspection/adjustment for different footage. Final portal coverage deliberately uses an opaque crop of the actual cloth close-up to avoid gaps on portrait screens.
- Safari, Firefox, physical mobile devices and production external navigation recovery were not independently certified. Poster fallback protects unsupported/decode-failure paths. Screenshots and interaction checks were performed in the available real Chromium browser.
- Real Neon persistence and proxy trust configuration were preserved, not revalidated against production. Existing malformed JSON/oversized-body behavior returns generic 503 and remains outside this visual change. Tests mock persistence intentionally.
- No deployment, migrations, production data changes or secret-file changes. The existing main-platform target remains configured in the user's environment.

See `FABRIC.md` for regeneration, cut changes, architecture and operational behavior. Before/after screenshots and machine-readable browser results accompany the delivered source archive and implementation report.
