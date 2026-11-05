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
  private client: Resend | null = null;
  private defaultFrom: string;
  private isConfigured: boolean;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || "NASJ Alpha <onboarding@resend.dev>";
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

    // If no real Resend key is provided (or in test environment), simulate successful delivery with deterministic ID
    if (!this.client) {
      const simulatedId = `msg_sim_${Buffer.from(idempotencyKey).toString("hex").slice(0, 24)}`;
      console.info(
        JSON.stringify({
          event: "email_dispatched_simulated",
          recipient: maskEmail(to),
          messageId: simulatedId,
          note: "RESEND_API_KEY not configured or simulated",
        })
      );
      return { success: true, messageId: simulatedId };
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
          attachments: options.attachments as any,
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
}

let globalEmailService: EmailService | null = null;
export function getEmailService(): EmailService {
  if (!globalEmailService) {
    globalEmailService = new EmailService();
  }
  return globalEmailService;
}
