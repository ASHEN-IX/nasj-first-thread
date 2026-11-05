# Platform preview content

The pre-launch mockups retain their layout and are rendered as HTML, with selected images and wording sourced from `wie-challenge/website`.

Source evidence:

- `scripts/seed-market.ts`: Wool kilim rug, Woven gift basket, Hand-painted mug; craft categories and descriptions. That seed explicitly uses fictional organizations and demonstration records. These are project examples, not verified live inventory. Prices, stock, production capacity and deadlines are not copied as live facts.
- `apps/web/src/components/market/buyer.tsx`: catalog, cart, custom requests, orders, reference-photo upload, quantity and needed-by date. The quotation is reviewed before production.
- `apps/web/src/components/market/market-ui.tsx`: request/approval, production, receipt at NASJ, quality check, shipping and delivery stages.
- `apps/web/src/components/production-offers.tsx` and the platform landing page: participation and artisan acceptance; associations/cooperatives coordinate the work and NASJ follows quality and delivery.
- `apps/web/public/marketplace/`: actual project images selected after visual inspection. The misleading `embroidered-cushion.jpg` image depicts a rug and is not used as a cushion photograph.

`lib/platform-content.ts` is the shared preview-product dataset. `public/platform/provenance.json` records each selected source file, source SHA-256, optimized output and byte count. No live API or database is queried to render the preview. The platform repository itself is not modified.

Regenerate copied assets (Pillow is available in the fabric-processing Python environment):

```sh
python scripts/platform/sync_assets.py --platform-root /path/to/wie-challenge/website
```

The originals remain in the platform project; responsive preview derivatives are exported as WebP. Interface labels identify project examples and explain that availability and quotations are confirmed in the platform. These previews are not screenshots of authenticated production accounts.

## Official identity and First Thread artwork

Typography follows the platform's `apps/web/src/app/layout.tsx` and font stacks in its global stylesheet: Manrope for display headings (200–800), Inter for body copy (100–900), and Tajawal for Arabic (400, 500, 700). Exact WOFF2 subsets from the platform's compiled build are served locally via `app/platform-fonts.css`; no Google Fonts browser request or build-time download is needed. Original Unicode ranges and weights are preserved.

The native `nasj-logo.png`, `nasj-logo-white.png` and `nasj-mark.png` are copied byte-for-byte from the platform. Official wordmarks replace the earlier drawn symbol/text in the header, footer, catalog mockup, request mockup and click portal; the mark supplies the favicon.

The user-supplied `First Thread Mascot Badge.png` remains intact at the repository root. An optimized transparent WebP is used in the hero and program section, replacing the placeholder spool icon. The badge and wordmark are separate assets.

Regenerate identity assets after building the platform:

```sh
python scripts/platform/sync_brand.py --platform-root /path/to/wie-challenge/website
```

`public/brand/provenance.json` records source names, outputs and hashes. Font sources are copied from the existing platform build, without changing that repository.
