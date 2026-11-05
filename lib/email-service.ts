import "server-only";
import { Resend } from "resend";

export interface EmailAttachment {
  content?: string | Buffer | Uint8Array | ArrayBuffer;
  filename?: string | false;
  path?: string;
  contentType?: string;
  contentId?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

export class EmailService {
  private provider: string;
  private client: Resend | null = null;
  private defaultFrom: string;
  private isConfigured: boolean;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || "resend";
    const apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || "NASJ Alpha <onboarding@resend.dev>";
    if (this.provider === "mailjet") {
      this.isConfigured = Boolean(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY && process.env.MAILJET_FROM_EMAIL);
      return;
    }
    if (this.provider !== "resend") {
      this.isConfigured = false;
      return;
    }
    if (apiKey && apiKey.startsWith("re_")) {
      this.client = new Resend(apiKey);
      this.isConfigured = true;
    } else {
      this.client = null;
      this.isConfigured = false;
    }
  }

  get configured(): boolean {
    return this.isConfigured;
  }

  async sendEmail(options: SendEmailOptions, attempt = 1, maxAttempts = 3): Promise<SendEmailResult> {
    if (!this.configured) {
      return { success: false, error: `Email provider ${this.provider} is not configured`, retryable: false };
    }
    if (this.provider === "mailjet") return this.sendMailjet(options, attempt, maxAttempts);
    const { to, subject, html, text, idempotencyKey, from, tags } = options;
    const sender = from || this.defaultFrom;

    // Redacted structured log entry (never logging token, body with token, or raw api key)
    console.info(
      JSON.stringify({
        event: "email_dispatch_attempt",
        recipient: maskEmail(to),
        subject,
        idempotencyKey,
        attempt,
      })
    );

    if (!this.client) {
      return { success: false, error: "Resend is not configured", retryable: false };
    }

    try {
      const replyTo = options.replyTo || process.env.NASJ_SUPPORT_EMAIL || "info.nasj.app@gmail.com";
      const response = await this.client.emails.send(
        {
          from: sender,
          to: [to],
          subject,
          html,
          text,
          tags,
          replyTo,
          attachments: options.attachments as Parameters<Resend["emails"]["send"]>[0]["attachments"],
        },
        {
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
        }
      );

      if (response.error) {
        const statusCode = (response.error as { statusCode?: number }).statusCode;
        const isRetryable = !statusCode || statusCode >= 500 || statusCode === 429;
        console.error(
          JSON.stringify({
            event: "email_dispatch_error",
            recipient: maskEmail(to),
            errorName: response.error.name,
            errorMessage: response.error.message,
            retryable: isRetryable,
            attempt,
          })
        );

        if (isRetryable && attempt < maxAttempts) {
          const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
          await new Promise((r) => setTimeout(r, delayMs));
          return this.sendEmail(options, attempt + 1, maxAttempts);
        }

        return {
          success: false,
          error: response.error.message,
          retryable: isRetryable,
        };
      }

      const messageId = response.data?.id;
      console.info(
        JSON.stringify({
          event: "email_dispatched_success",
          recipient: maskEmail(to),
          messageId,
          idempotencyKey,
        })
      );

      return {
        success: true,
        messageId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown send error";
      console.error(
        JSON.stringify({
          event: "email_dispatch_exception",
          recipient: maskEmail(to),
          error: message,
          attempt,
        })
      );

      if (attempt < maxAttempts) {
        const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
        await new Promise((r) => setTimeout(r, delayMs));
        return this.sendEmail(options, attempt + 1, maxAttempts);
      }

      return {
        success: false,
        error: message,
        retryable: true,
      };
    }
  }

  private async sendMailjet(options: SendEmailOptions, attempt: number, maxAttempts: number): Promise<SendEmailResult> {
    const parseAddress = (value: string) => {
      const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
      return match ? { Email: match[2].trim(), Name: match[1].trim() } : { Email: value.trim() };
    };
    try {
      const attachments = (options.attachments || []).map((attachment) => {
        if (!attachment.content || attachment.path) throw new Error("Mailjet attachments require content, not a path");
        const content = attachment.content;
        const base64 = typeof content === "string" ? content
          : content instanceof ArrayBuffer ? Buffer.from(content).toString("base64")
          : Buffer.from(content).toString("base64");
        return {
          ContentType: attachment.contentType || "application/octet-stream",
          Filename: attachment.filename || "attachment",
          Base64Content: base64,
          ...(attachment.contentId ? { ContentID: attachment.contentId } : {}),
        };
      });
      const response = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Messages: [{
          From: options.from ? parseAddress(options.from) : {
            Email: process.env.MAILJET_FROM_EMAIL,
            Name: process.env.MAILJET_FROM_NAME || "NASJ First Thread",
          },
          To: [{ Email: options.to }],
          ReplyTo: parseAddress(options.replyTo || process.env.NASJ_SUPPORT_EMAIL || "info.nasj.app@gmail.com"),
          Subject: options.subject,
          HTMLPart: options.html,
          TextPart: options.text,
          CustomID: options.idempotencyKey,
          CustomCampaign: options.idempotencyKey,
          DeduplicateCampaign: true,
          Attachments: attachments.filter((a) => !a.ContentID),
          InlinedAttachments: attachments.filter((a) => a.ContentID),
        }] }),
      });
      const data = await response.json() as {
        ErrorMessage?: string;
        Messages?: { Status?: string; Errors?: { ErrorMessage?: string }[]; To?: { MessageUUID?: string; MessageHref?: string }[] }[];
      };
      const message = data.Messages?.[0];
      const recipient = message?.To?.[0];
      // MessageHref preserves the legacy numeric ID without JavaScript precision loss.
      const messageId = recipient?.MessageHref?.match(/\/message\/(\d+)$/)?.[1] || recipient?.MessageUUID;
      if (response.ok && message?.Status === "success" && messageId) {
        console.info(JSON.stringify({ event: "email_dispatched_success", provider: "mailjet", recipient: maskEmail(options.to), messageId }));
        return { success: true, messageId };
      }
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 8000)));
        return this.sendMailjet(options, attempt + 1, maxAttempts);
      }
      return { success: false, retryable, error: message?.Errors?.[0]?.ErrorMessage || data.ErrorMessage || `Mailjet rejected the message (HTTP ${response.status})` };
    } catch {
      // Network timeouts may occur after acceptance. The outbox can retry with the same deduplicated campaign.
      return { success: false, retryable: true, error: "Mailjet request failed; check provider activity before retrying" };
    }
  }
}

let globalEmailService: EmailService | null = null;
export function getEmailService(): EmailService {
  if (!globalEmailService) {
    globalEmailService = new EmailService();
  }
  return globalEmailService;
}
