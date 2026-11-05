import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { EmailAttachment } from "./email-service";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Returns the raw Buffer for the Nasouj waving sticker.
 * Checks the local workspace brand asset, public directory, and source paths.
 */
export function getNasoujWaveBuffer(): Buffer | null {
  try {
    const candidatePaths = [
      path.join(process.cwd(), "public/brand/nasouj-wave.png"),
      path.join(process.cwd(), "public/brand/wave.png"),
      "/home/ashenix/Projects/wie-challenge/website/apps/web/public/nasouj/poses/wave.png",
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(/* turbopackIgnore: true */ p)) {
        return fs.readFileSync(/* turbopackIgnore: true */ p);
      }
    }
  } catch {
    // Graceful fallback if fs is constrained
  }
  return null;
}

/**
 * Returns an inline data: URI for the Nasouj waving sticker.
 * Useful for standalone HTML previews and offline rendering.
 */
export function getNasoujWaveDataUri(): string {
  const buf = getNasoujWaveBuffer();
  if (buf) {
    return `data:image/png;base64,${buf.toString("base64")}`;
  }
  const defaultPlatformUrl = process.env.NEXT_PUBLIC_NASJ_PLATFORM_URL || "https://nasj-platform.ddns.net";
  return `${defaultPlatformUrl}/brand/nasouj-wave.png`;
}

export type TemplateType =
  | "welcome_email"
  | "early_access_confirmation"
  | "craft_community_acknowledgment"
  | "alpha_invitation";

export interface WelcomeEmailPayload {
  fullName: string;
  email: string;
  role?: string;
  stickerUrl?: string;
}

export type EarlyAccessConfirmationPayload = WelcomeEmailPayload;

export interface CraftCommunityAcknowledgmentPayload {
  contactName: string;
  email: string;
  participantType: string;
  region: string;
  stickerUrl?: string;
}

export interface AlphaInvitationPayload {
  fullName: string;
  email: string;
  role?: string;
  stickerUrl?: string;
  activationUrl?: string;
  expiresInHours?: number;
}

export interface RenderedEmailResult {
  subject: string;
  html: string;
  text: string;
}

/** Build an actual email with a CID image; browser previews keep their normal URL. */
export function renderEmailForDelivery(
  template: TemplateType,
  payload: Record<string, unknown>
): RenderedEmailResult & { attachments?: EmailAttachment[] } {
  if (typeof payload.stickerUrl === "string" && payload.stickerUrl.trim()) {
    return renderEmailTemplate(template, payload);
  }
  const sticker = getNasoujWaveBuffer();
  if (!sticker) throw new Error("Nasouj email sticker asset is missing from the server bundle");
  const contentId = "nasouj-wave@nasj";
  return {
    ...renderEmailTemplate(template, { ...payload, stickerUrl: `cid:${contentId}` }),
    attachments: [{ content: sticker, filename: "nasouj-wave.png", contentType: "image/png", contentId }],
  };
}

function resolvePlatformUrl(): string {
  const url = process.env.NEXT_PUBLIC_NASJ_PLATFORM_URL || "https://nasj-platform.ddns.net";
  return url.replace(/\/+$/, "");
}

function resolveStickerUrl(explicitUrl?: string): string {
  if (explicitUrl && explicitUrl.trim().length > 0) {
    return explicitUrl.trim();
  }
  const platformUrl = resolvePlatformUrl();
  return `${platformUrl}/brand/nasouj-wave.png`;
}

/**
 * Common branded email layout frame following the NASJ visual identity:
 * - Tunisian Deep Forest: #103e30
 * - Sand / Cream: #f7f1e8
 * - Warm Ivory: #fffaf2
 * - Artisan Gold Ribbon: #c19a5b -> #e4bc7b
 * - High contrast dark ink: #19372d
 */
function baseBrandedLayout(content: {
  preheader: string;
  headline: string;
  badgeLabel?: string;
  badgeArabic?: string;
  stickerHtml?: string;
  bodyHtml: string;
  noteHtml?: string;
}): string {
  const platformUrl = resolvePlatformUrl();
  const badge = content.badgeLabel || "The First Thread";
  const badgeAr = content.badgeArabic || "الخيط الأوّل";

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(content.headline)}</title>
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-card {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .email-header-pad {
        padding: 20px 22px !important;
      }
      .email-body-pad {
        padding: 24px 20px !important;
      }
      .email-footer-pad {
        padding: 20px 20px !important;
      }
      .sticker-box {
        margin: 20px 16px 12px 16px !important;
        padding: 20px 14px 18px 14px !important;
      }
      .sticker-img {
        width: 124px !important;
      }
      .headline-title {
        font-size: 21px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f7f1e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#19372d;-webkit-font-smoothing:antialiased;">
  <!-- Hidden preheader preview text -->
  <div style="display:none;font-size:1px;color:#f7f1e8;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(content.preheader)}
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f1e8;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Center Card Container -->
        <table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(16,62,48,0.08);border:1px solid #dfd4c4;">
          
          <!-- Brand Header Banner -->
          <tr>
            <td class="email-header-pad" style="background-color:#103e30;padding:24px 32px 22px 32px;color:#fff8e9;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <div style="font-size:22px;font-weight:800;letter-spacing:1px;color:#fff8e9;line-height:1.1;">
                      NASJ <span style="font-size:18px;font-weight:400;color:#e4bc7b;">| نَسْج</span>
                    </div>
                    <div style="font-size:11px;color:#c9d5cb;letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;font-weight:600;">
                      Weaving Connections. Creating Impact.
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <div style="display:inline-block;padding:5px 12px;border:1px solid rgba(228,188,123,0.5);border-radius:999px;background-color:rgba(228,188,123,0.1);color:#e4bc7b;font-size:11px;font-weight:700;letter-spacing:0.08em;white-space:nowrap;">
                      ${escapeHtml(badge)} <span style="font-size:11px;letter-spacing:0;margin-left:3px;" dir="rtl" lang="ar">${escapeHtml(badgeAr)}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold Artisan Accent Line -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg, #c19a5b 0%, #e4bc7b 50%, #c19a5b 100%);line-height:3px;font-size:0;">&nbsp;</td>
          </tr>

          ${
            content.stickerHtml
              ? `<!-- Sticker Mascot Feature -->
          <tr>
            <td align="center" style="padding:0;">
              ${content.stickerHtml}
            </td>
          </tr>`
              : ""
          }

          <!-- Main Body Content -->
          <tr>
            <td class="email-body-pad" style="padding:28px 32px 24px 32px;">
              <h1 class="headline-title" style="margin:0 0 6px 0;font-size:23px;line-height:1.3;color:#103e30;font-weight:800;letter-spacing:-0.03em;text-align:center;">
                ${escapeHtml(content.headline)}
              </h1>
              <div style="text-align:center;color:#c19a5b;font-weight:700;font-size:13px;letter-spacing:0.04em;margin-bottom:24px;" dir="rtl" lang="ar">
                نَسْج — مِن الحِرفَة إلى العالَم
              </div>

              <div style="font-size:15px;line-height:1.75;color:#222925;">
                ${content.bodyHtml}
              </div>

              ${
                content.noteHtml
                  ? `<div style="margin-top:24px;">
                      ${content.noteHtml}
                    </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Branded Footer -->
          <tr>
            <td class="email-footer-pad" style="padding:22px 32px;background-color:#f9f6f0;border-top:1px solid #ede4d5;font-size:12px;line-height:1.6;color:#66766c;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-weight:700;color:#103e30;font-size:12px;">
                      NASJ • نَسْج
                    </div>
                    <div style="margin-top:2px;color:#819a84;">
                      Tunisian Artisanal Heritage &amp; Modern Digital Platform
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <a href="${escapeHtml(platformUrl)}" target="_blank" rel="noopener noreferrer" style="color:#c19a5b;text-decoration:none;font-weight:700;font-size:12px;">
                      Explore NASJ &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:14px;border-top:1px solid #eee5d7;margin-top:14px;font-size:11px;color:#8a938d;">
                    You received this welcoming message because you registered for early access to NASJ: The First Thread. No credentials or passwords are required.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the Welcoming Email with the Nasouj waving sticker,
 * launch announcement, first-to-try promise, and thank-you message.
 * NEVER sends credentials, passwords, or activation URLs.
 */
function renderWelcomeEmail(payload: WelcomeEmailPayload): RenderedEmailResult {
  const stickerUrl = resolveStickerUrl(payload.stickerUrl);
  const fullName = payload.fullName?.trim() || "Friend & Maker";
  const email = payload.email?.trim() || "";

  const subject = "Welcome to NASJ — The First Thread is Launching Soon! 🌿";
  const preheader = "Thank you for joining NASJ! The platform will launch soon, and you will be among the very first to try it.";

  const stickerHtml = `
    <div class="sticker-box" style="margin:26px 28px 4px 28px;background-color:#fcf9f4;border:1px solid #ede4d5;border-radius:14px;padding:24px 20px 20px 20px;text-align:center;">
      <img class="sticker-img" src="${escapeHtml(stickerUrl)}" alt="Nasouj waving sticker" width="146" height="196" style="display:block;margin:0 auto;width:146px;max-width:146px;height:auto;border:0;outline:none;" />
      <div style="margin-top:14px;">
        <span style="display:inline-block;background-color:#103e30;color:#fff8e9;padding:6px 18px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.05em;">
          👋 مرحباً بك • Welcome to NASJ
        </span>
      </div>
    </div>
  `;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#103e30;">
      Dear ${escapeHtml(fullName)},
    </p>

    <p style="margin:0 0 16px 0;">
      Thank you so much for joining us! We are thrilled to welcome you to <strong>NASJ (نسج)</strong> and our founding circle, <strong>The First Thread</strong>.
    </p>

    <p style="margin:0 0 20px 0;">
      We created NASJ with a singular passion: to celebrate authentic Tunisian craftsmanship, elevate master artisans, and build an ethical, modern digital bridge between timeless makers and lovers of conscious design.
    </p>

    <!-- Launching Soon Callout Card -->
    <div style="background-color:#f6f1e8;border:1px solid #e7ded0;border-left:4px solid #103e30;border-radius:10px;padding:18px 22px;margin:24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <div style="font-size:16px;font-weight:800;color:#103e30;margin-bottom:4px;">
              🚀 The Platform Will Launch Soon
            </div>
            <div style="font-size:13px;color:#c19a5b;font-weight:700;margin-bottom:10px;" dir="rtl" lang="ar">
              ستكون من الأوائل الذين يكتشفون ويجربون المنصة
            </div>
            <p style="font-size:14px;line-height:1.7;color:#28352e;margin:0 0 10px 0;">
              Our team and artisan cooperatives are adding the final handcrafted touches. Because you took the first step with us, <strong>you will be among the very first to try the platform</strong> before the general public release.
            </p>
            <p style="font-size:13px;line-height:1.6;color:#55625b;margin:0;">
              Keep an eye on your inbox — we will notify you the very moment early access opens!
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Highlights Grid -->
    <div style="margin:24px 0 20px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#103e30;margin-bottom:14px;">
        What awaits you in NASJ:
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="30" valign="top" style="font-size:18px;line-height:1;padding-top:2px;">🧶</td>
          <td style="font-size:14px;line-height:1.65;color:#292d29;padding-left:10px;padding-bottom:12px;">
            <strong>Authentic Masterpieces:</strong> Handwoven kilims, ceramics, pottery, and olive wood crafts with certified maker provenance.
          </td>
        </tr>
        <tr>
          <td width="30" valign="top" style="font-size:18px;line-height:1;padding-top:2px;">🌿</td>
          <td style="font-size:14px;line-height:1.65;color:#292d29;padding-left:10px;padding-bottom:12px;">
            <strong>Fair &amp; Direct Impact:</strong> Connecting directly with master makers and family workshops across Tunisia's regions.
          </td>
        </tr>
        <tr>
          <td width="30" valign="top" style="font-size:18px;line-height:1;padding-top:2px;">✨</td>
          <td style="font-size:14px;line-height:1.65;color:#292d29;padding-left:10px;padding-bottom:4px;">
            <strong>Priority First Access:</strong> First pick of limited artisanal batches and intimate creator storytelling.
          </td>
        </tr>
      </table>
    </div>

    <!-- Warm Closing -->
    <div style="margin-top:24px;font-size:15px;line-height:1.75;color:#292d29;">
      Thank you once again for your warmth, trust, and enthusiasm for authentic craft.<br><br>
      With gratitude,<br>
      <strong style="color:#103e30;font-size:16px;">The NASJ Team &amp; Nasouj 🌿</strong><br>
      <span style="font-size:12px;color:#c19a5b;font-weight:700;" dir="rtl" lang="ar">فريق نَسْج ونصوح — تونس</span>
    </div>
  `;

  const noteHtml = `
    <div style="background-color:#ffffff;border:1px dashed #d5cbbe;border-radius:8px;padding:14px 18px;font-size:13px;line-height:1.6;color:#555e58;">
      🔒 <strong>No credentials or password setup required:</strong> Your spot is safely registered under <strong>${escapeHtml(
        email
      )}</strong>. We believe in keeping things simple and secure — you do not need to create or remember any password right now. When the platform is ready, you'll receive your direct pass.
    </div>
  `;

  const text = [
    "==================================================",
    "NASJ | نَسْج — The First Thread",
    "Weaving Connections. Creating Impact.",
    "==================================================",
    "",
    `Dear ${fullName},`,
    "",
    "Thank you so much for joining us! We are thrilled to welcome you to NASJ (نسج) and our founding circle, The First Thread.",
    "",
    "We created NASJ to celebrate authentic Tunisian craftsmanship, elevate master artisans, and build an ethical, modern bridge connecting traditional makers with lovers of conscious design.",
    "",
    "--------------------------------------------------",
    "🚀 THE PLATFORM WILL LAUNCH SOON — AND YOU'RE FIRST TO TRY IT!",
    "--------------------------------------------------",
    "Our team and artisan cooperatives are putting the final handcrafted touches on the platform.",
    "Because you joined early through The First Thread, YOU WILL BE AMONG THE VERY FIRST TO TRY IT before the general public release.",
    "",
    "We will notify you directly the moment the doors open!",
    "",
    "What awaits you:",
    "• Certified Masterpieces: Handwoven kilims, pottery, embroidery, and olive wood crafts.",
    "• Fair & Direct Impact: Supporting master makers and family workshops across Tunisia.",
    "• Priority Access: First pick of limited batches and artisan stories.",
    "",
    "Notice: No credentials or password setup needed.",
    `Your early access is registered under ${email}. No passwords or setup actions are required at this stage.`,
    "",
    "Thank you once again for weaving this journey with us.",
    "",
    "Warmly,",
    "The NASJ Team & Nasouj",
    "NASJ Platform — Tunis",
    "https://nasj-platform.ddns.net",
  ].join("\n");

  return {
    subject,
    html: baseBrandedLayout({
      preheader,
      headline: "Welcome to The First Thread",
      badgeLabel: "The First Thread",
      badgeArabic: "الخيط الأوّل",
      stickerHtml,
      bodyHtml,
      noteHtml,
    }),
    text,
  };
}

/**
 * Renders the craft community acknowledgment email,
 * using the same elevated branding style with the Nasouj sticker.
 */
function renderCraftCommunityEmail(payload: CraftCommunityAcknowledgmentPayload): RenderedEmailResult {
  const stickerUrl = resolveStickerUrl(payload.stickerUrl);
  const contactName = payload.contactName?.trim() || "Artisan & Maker";
  const email = payload.email?.trim() || "";

  const subject = "NASJ — Craft Details Received! Welcome to Our Artisan Circle 🌿";
  const preheader = "Thank you for sharing your craft details with NASJ. The platform will launch soon!";

  const stickerHtml = `
    <div class="sticker-box" style="margin:26px 28px 4px 28px;background-color:#fcf9f4;border:1px solid #ede4d5;border-radius:14px;padding:24px 20px 20px 20px;text-align:center;">
      <img class="sticker-img" src="${escapeHtml(stickerUrl)}" alt="Nasouj waving sticker" width="146" height="196" style="display:block;margin:0 auto;width:146px;max-width:146px;height:auto;border:0;outline:none;" />
      <div style="margin-top:14px;">
        <span style="display:inline-block;background-color:#103e30;color:#fff8e9;padding:6px 18px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.05em;">
          👋 مرحباً بك في مجتمع الحِرَف • Welcome
        </span>
      </div>
    </div>
  `;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#103e30;">
      Dear ${escapeHtml(contactName)},
    </p>

    <p style="margin:0 0 16px 0;">
      Thank you for sharing your craft details with the <strong>NASJ Craft Community</strong>. We have safely registered your details for <strong>${escapeHtml(
        payload.participantType
      )}</strong> based in <strong>${escapeHtml(payload.region)}</strong>.
    </p>

    <p style="margin:0 0 20px 0;">
      Our mission is to celebrate authentic Tunisian artisanal heritage and give master makers the direct recognition, digital visibility, and fair commercial access they deserve.
    </p>

    <div style="background-color:#f6f1e8;border:1px solid #e7ded0;border-left:4px solid #c19a5b;border-radius:10px;padding:18px 22px;margin:24px 0;">
      <div style="font-size:16px;font-weight:800;color:#103e30;margin-bottom:4px;">
        🚀 Platform Launching Soon
      </div>
      <div style="font-size:13px;color:#c19a5b;font-weight:700;margin-bottom:10px;" dir="rtl" lang="ar">
        قريباً انطلاق المنصة لتسليط الضوء على إبداعاتكم
      </div>
      <p style="font-size:14px;line-height:1.7;color:#28352e;margin:0 0 10px 0;">
        The NASJ platform will launch soon, and our artisan liaisons will reach out to you directly as we curate new exhibition cohorts, bespoke sourcing orders, and collaboration features.
      </p>
      <p style="font-size:13px;line-height:1.6;color:#55625b;margin:0;">
        You will be among the very first to showcase your work when the marketplace goes live!
      </p>
    </div>

    <div style="margin-top:24px;font-size:15px;line-height:1.75;color:#292d29;">
      Thank you for keeping Tunisian craft heritage alive and vibrant.<br><br>
      Warm regards,<br>
      <strong style="color:#103e30;font-size:16px;">The NASJ Community Team &amp; Nasouj 🌿</strong><br>
      <span style="font-size:12px;color:#c19a5b;font-weight:700;" dir="rtl" lang="ar">فريق مجتمع نَسْج</span>
    </div>
  `;

  const noteHtml = `
    <div style="background-color:#ffffff;border:1px dashed #d5cbbe;border-radius:8px;padding:14px 18px;font-size:13px;line-height:1.6;color:#555e58;">
      Registered contact email: <strong>${escapeHtml(
        email
      )}</strong>.<br>This is an open community registry and does not require credentials or password setup.
    </div>
  `;

  const text = [
    "==================================================",
    "NASJ — Craft Community Information Received",
    "==================================================",
    "",
    `Dear ${contactName},`,
    "",
    "Thank you for sharing your craft details with the NASJ Craft Community.",
    `Registered details: ${payload.participantType} (${payload.region}).`,
    "",
    "The NASJ platform will launch soon, and our artisan liaisons will reach out directly as collaboration and exhibition opportunities arise.",
    "",
    `Registered email: ${email}`,
    "No passwords or credentials required.",
    "",
    "Warm regards,",
    "The NASJ Community Team & Nasouj",
    "https://nasj-platform.ddns.net",
  ].join("\n");

  return {
    subject,
    html: baseBrandedLayout({
      preheader,
      headline: "Craft Details Received",
      badgeLabel: "Craft Registry",
      badgeArabic: "مجتمع الحِرَف",
      stickerHtml,
      bodyHtml,
      noteHtml,
    }),
    text,
  };
}

/**
 * Universal dispatcher for email templates.
 * Provides overloads for type safety, plus generic fallback.
 */
export function renderEmailTemplate(
  template: "welcome_email",
  payload: WelcomeEmailPayload
): RenderedEmailResult;
export function renderEmailTemplate(
  template: "early_access_confirmation",
  payload: EarlyAccessConfirmationPayload
): RenderedEmailResult;
export function renderEmailTemplate(
  template: "craft_community_acknowledgment",
  payload: CraftCommunityAcknowledgmentPayload
): RenderedEmailResult;
export function renderEmailTemplate(
  template: "alpha_invitation",
  payload: AlphaInvitationPayload
): RenderedEmailResult;
export function renderEmailTemplate(
  template: TemplateType | string,
  payload: Record<string, unknown>
): RenderedEmailResult;
export function renderEmailTemplate(
  template: TemplateType | string,
  payload: unknown
): RenderedEmailResult {
  switch (template) {
    case "welcome_email":
    case "early_access_confirmation": {
      return renderWelcomeEmail(payload as unknown as WelcomeEmailPayload);
    }

    // Both alpha_invitation and early_access_welcome map to the pure welcoming email without credentials!
    case "alpha_invitation": {
      const data = payload as unknown as AlphaInvitationPayload;
      return renderWelcomeEmail({
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        stickerUrl: data.stickerUrl,
      });
    }

    case "craft_community_acknowledgment": {
      return renderCraftCommunityEmail(payload as unknown as CraftCommunityAcknowledgmentPayload);
    }

    default:
      // Graceful fallback for any other template name to the welcoming email
      return renderWelcomeEmail(payload as unknown as WelcomeEmailPayload);
  }
}
