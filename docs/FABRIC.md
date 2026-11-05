# NASJ cinematic textile

The existing Next.js App Router, brand, copy, registration components, API handlers and Neon adapter are retained. GSAP owns scene transforms; Motion continues to own the separate below-hero sections. No 3D engine or runtime image-processing dependency is added.

## Regenerate assets

Run from the repository root using Python 3.11+ (this run used 3.14), FFmpeg and ffprobe:

```sh
python -m venv .venv-fabric
.venv-fabric/bin/pip install -r scripts/fabric/requirements.txt
.venv-fabric/bin/python scripts/fabric/process.py
```

The script discovers a single MP4 in `assets/source/`, including the supplied `nasj-video.mp4`. If several videos exist, select one explicitly:

```sh
.venv-fabric/bin/python scripts/fabric/process.py \
  --source assets/source/nasj-video.mp4 \
  --scroll-end 5.6 --portal-start 6.0 --portal-end 8.5 \
  --width 960 --scroll-frames 30 --portal-frames 18 --quality 82
```

The `fabric:process` package script uses whichever `python` is active; activate the environment first. The dependencies are offline development tools only. Never invoke this process from an API handler, browser or normal page request.

The source is H.264/yuv420p, 1280×720, 24fps, 240 frames, 10 seconds of video, with AAC audio and **no alpha**. The original 8,458,465-byte MP4 remains the source-preserving motion master. Its SHA-256 is recorded in the output manifest and checked by `pnpm test`. No source file is overwritten. The separate full-resolution, lossless, matted still master is `assets/processed/nasj-fabric-master.png`.

`assets/previews/source-probe.json` contains the complete ffprobe result. `assets/previews/matte-contact.jpg` compares six representative moments on forest green and cream, and six transparent preview stills are saved alongside it. These development artifacts and the original footage are not served by Next.js.

## Matte and cuts

This footage has a near-neutral white/gray studio background with tan, green and terracotta textile colors. The matte finds near-neutral bright pixels **connected to the outside border**, preserves significant foreground islands, feathers a one-pixel edge, and propagates nearby interior yarn colors into edge pixels to remove white contamination. Optical-flow alignment smooths only compatible, uncertain edges; this avoids averaging silhouettes across large motion and leaving trails. Textile interiors are not recolored.

The method is deliberately specific to the inspected source, not a universal green/white key. Newly supplied footage must be inspected with ffprobe and a contact sheet. The script rejects an unreviewed pixel format. It does not silently claim success for arbitrary backgrounds, alpha videos, or baked-in interface mockups. For a source whose colors overlap the background, use a reviewed subject matte (for example manually corrected tracked masks), or retain the optimized poster/2.5D fallback. Do not key embroidery colors away.

Actual source motion determines the cuts: 0–1.5s awakening, 1.5–3.5s lifting, 3.5–5.6s departure; 6–8.5s is the separate approaching close-up. Playback is scroll-scrubbed, not elapsed-time autoplay. Samples are chosen by measured image/silhouette change and rendered by their recorded timestamps, including reverse scroll. Slow portions still receive samples. Public filenames remain stable; regenerated obsolete frames are removed only from generated sequence folders.

## Rendering and budget

Transparent **static WebP frame sequences** are used instead of seeking an alpha video. The input has no alpha; H.264 cannot supply the missing matte. Alpha-video codec combinations were not selected because browser support and frame-accurate seeking differ. AVIF encoding was not selected: these small sequences meet the budget with WebP, without introducing a more expensive encoder/decoder. This is a format selection based on the measured WebP result, not an unperformed cross-codec benchmark.

Budget ceilings are enforced by the Python script and the asset tests:

- Mobile poster: 60,000 bytes; actual 28,426 bytes.
- Scroll sequence: 2,400,000 bytes; actual 1,417,800 bytes, 30 RGBA frames at 960×540.
- Portal sequence: 1,100,000 bytes; actual 951,048 bytes, 18 frames at 640×360.
- All public textile images: 4,000,000 bytes; actual 2,498,278 bytes, including posters and the opaque close-up cover.

The desktop poster is 48,368 bytes; the portal poster is 6,614 bytes; the real-textile opaque cover is 46,022 bytes. These are encoded asset sizes, not total page transfer. The JSON manifest is additional small metadata. Browser image decode uses three concurrent requests; desktop decoded frames need approximately 59.3 MiB and portal frames 15.8 MiB, plus browser/canvas overhead.

`FabricSequence.tsx` loads frames only near the visible hero, at >=1024px width and >=700px height, with no reduced-motion preference, no Save-Data/2G indication, >=4 logical CPU cores and >=4GB reported memory (if memory is exposed). Otherwise it keeps the small responsive poster. Browser feature/decode errors also retain the poster. It frees decoded bitmaps and aborts outstanding fetches on breakpoint changes/unmount. No audio or large video is downloaded by the page. Eligible desktop scroll scenes also load the 18 close-up frames to perform the full-screen scroll wipe. The click portal prepares its own decoded frames on link hover/focus (the browser can reuse the same cached image responses); a click before loading completes uses the poster with the same guaranteed-cover wipe. Small screens use a shorter transition.

## Scroll and portal

`HeroExperience.tsx` has a single scoped GSAP match-media timeline. It pins only eligible desktop scenes, seeks the dedicated fabric renderer, animates independent interface cards and SVG thread paths, then lets the cloth fill the viewport, hold coverage, and sweep to the right to reveal `PlatformJourney.tsx` before the pin ends. Both the original departure and separate approaching-close-up footage cuts are scrubbed by the same scroll timeline. The static normal-flow showcase is the default for tablets, mobiles, reduced motion, constrained hardware and JavaScript-free rendering. Invisible scene controls are inert during the animated handoff. Reversing scroll restores the initial scene; scrolling never navigates.

`PlatformJourney.tsx` offers keyboard-accessible tabs for catalog, gift request and production coordination. All are explicitly illustrative concepts; it does not create live quotes/orders or claim deployed capabilities.

`PortalProvider.tsx` owns one overlay rendered with React `createPortal` directly under `body`. It escapes the pinned hero's transforms, filters and stacking contexts. Every `PortalLink.tsx`, including the fabric's accessible link, shares a synchronous duplicate-click guard. Normal modifier/middle clicks and reduced-motion links retain ordinary anchor behavior. The transition resets its texture, timeline and frame index on each entrance. An opaque crop of the real final textile fills the viewport before navigation, including portrait screens where transparent footage alone would leave gaps. That final close-up is a deliberate coverage layer, not a claim that every source frame has a full-screen silhouette.

Set `NEXT_PUBLIC_NASJ_PLATFORM_URL` only to the verified actual app URL. Valid HTTP(S) URLs are accepted; missing/invalid settings use `/platform`. Local transitions use App Router navigation. The overlay resets on pathname change, pageshow/back-forward restoration and after a four-second stalled-navigation watchdog, with an ordinary retry link. Timeline, timers, listeners and decoded resources are cleaned up on unmount. Never modify database environment variables to configure navigation.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

ESLint tooling and configuration are development-only additions. Node's built-in test runner executes actual registration routes, Zod schemas, preflight logic and DB adapter in isolated VMs with Neon replaced before execution. It never loads `.env.local` or contacts a database. Tests cover separate tables/consent, normalized email and generic duplicates, honeypot/invalid payload rejection, origins/content types, rate limiting and database-down behavior, as well as asset provenance/budgets and reversible adaptive frame selection. Node prints an expected experimental VM modules warning.

The pre-existing registration backend is unchanged. Its malformed JSON/oversize path currently returns a generic 503, and validation follows a DB-backed rate-limit write; see `FABRIC-AUDIT.md`. Real persistence, trusted production proxy behavior and live external navigation require separate environment validation. No migrations or production data writes are part of this upgrade.

Use the final implementation report for actual browser results and remaining limits. Browser playback has been verified only in the available Chromium environment, not in Safari/Firefox or on physical low-end devices.

### Repeat browser QA locally

Install/use Playwright CLI and its Chromium browser separately; it is not a production dependency. Run a local-only build with the destination overridden to avoid exercising the configured external platform:

```sh
NEXT_PUBLIC_NASJ_PLATFORM_URL= pnpm build
NEXT_PUBLIC_NASJ_PLATFORM_URL= pnpm start --hostname 127.0.0.1 --port 3100
```

In another terminal, from this repository:

```sh
mkdir -p test-results
playwright-cli -s=nasj open http://127.0.0.1:3100/
playwright-cli -s=nasj run-code --filename=tests/browser/browser-qa.js
playwright-cli -s=nasj run-code --filename=tests/browser/portal-recovery-qa.js
playwright-cli -s=nasj run-code --filename=tests/browser/final-captures.js
playwright-cli -s=nasj close
```

The scripts intercept all registration submissions they initiate. The recovery script deliberately delays the local `/platform` response and checks that the watchdog removes the covering layer. Screenshots go into ignored `test-results/`. Stop the test server, then run `pnpm build` without the override to restore your real build-time target before deployment. Never replace your saved environment file for this test.

### Final scroll endpoint

The approved opening uses the original departure and approaching-close-up cuts. Playback ends once the close-up fills the hero, matching the reference recording near second 4. The pin spans 200% of the viewport height with no hold at its end. Further scrolling immediately moves the whole hero upward. The platform tour is a sibling in normal document flow, outside the pinned scene. The later sideways/re-entry animation and experimental single-surface camera path have been removed.

The final opaque fill uses the same last close-up frame as the canvas, on the same scaled surface, so its textile pattern does not jump to another crop. Upward scroll can revisit the opening. Mobile, reduced-motion, registration forms and explicit click portal retain their previous behavior.
