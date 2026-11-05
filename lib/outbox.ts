import "server-only";
import { getDatabase } from "@/lib/db";
import { getEmailService } from "@/lib/email-service";
import { renderEmailTemplate, renderEmailForDelivery, type TemplateType } from "@/lib/email-templates";

export interface EnqueueOutboxOptions {
  recipientEmail: string;
  templateType: TemplateType;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

export interface OutboxRecord {
  id: string;
  recipient_email: string;
  template_type: TemplateType;
  subject: string;
  payload: Record<string, unknown>;
  status: "pending" | "sending" | "sent" | "delivered" | "failed" | "bounced" | "complained";
  idempotency_key: string;
  resend_message_id: string | null;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
}

/**
 * Durably enqueues an email into the database outbox.
 * Idempotent by idempotency_key: if already exists, returns existing row.
 */
export async function enqueueOutboxItem(options: EnqueueOutboxOptions): Promise<{ id: string; status: string; isNew: boolean }> {
  const sql = getDatabase();
  const { recipientEmail, templateType, payload, idempotencyKey } = options;

  // Render template to determine subject
  const rendered = renderEmailTemplate(templateType, payload);

  const rows = await sql`
    INSERT INTO email_outbox
      (recipient_email, template_type, subject, payload, status, idempotency_key, attempts, max_attempts, next_attempt_at)
    VALUES
      (${recipientEmail}, ${templateType}, ${rendered.subject}, ${JSON.stringify(payload)}::jsonb,
       'pending', ${idempotencyKey}, 0, 3, now())
    ON CONFLICT (idempotency_key) DO UPDATE
      SET updated_at = now()
    RETURNING id, status, (xmax = 0) AS is_new
  `;

  if (!rows || rows.length === 0) {
    throw new Error("Failed to enqueue outbox item");
  }

  return {
    id: rows[0].id as string,
    status: rows[0].status as string,
    isNew: Boolean(rows[0].is_new),
  };
}

/**
 * Dispatches an outbox item via the configured email provider.
 * Updates the database state accordingly.
 * Note: Status is updated to 'sent' upon provider acceptance, NEVER 'delivered'.
 * Provider acceptance is not proof of delivery.
 */
export async function dispatchOutboxItem(outboxId: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sql = getDatabase();

  const rows = await sql`
    SELECT id, recipient_email, template_type, subject, payload, status, idempotency_key, attempts, max_attempts
    FROM email_outbox
    WHERE id = ${outboxId}
      AND status = 'pending'
      AND attempts < max_attempts
      AND next_attempt_at <= now()
    FOR UPDATE SKIP LOCKED
  `;

  if (!rows || rows.length === 0) {
    return { success: false, error: "Outbox item not found or locked" };
  }

  const item = rows[0];
  const payload = typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload;
  const attempts = Number(item.attempts) + 1;
  const maxAttempts = Number(item.max_attempts) || 3;

  // Render fresh email contents
  const rendered = renderEmailForDelivery(item.template_type as TemplateType, payload);

  const emailService = getEmailService();
  const result = await emailService.sendEmail({
    to: item.recipient_email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    attachments: rendered.attachments,
    replyTo: process.env.NASJ_SUPPORT_EMAIL || "info.nasj.app@gmail.com",
    idempotencyKey: item.idempotency_key,
    tags: [
      { name: "template", value: item.template_type },
      { name: "outbox_id", value: item.id },
    ],
  });

  if (result.success && result.messageId) {
    await sql`
      UPDATE email_outbox
      SET
        status = 'sent',
        resend_message_id = ${result.messageId},
        attempts = ${attempts},
        last_attempt_at = now(),
        updated_at = now(),
        error_message = null
      WHERE id = ${outboxId}
    `;

    // If it was an alpha invitation, update account_invitations with the messageId
    if (item.template_type === "alpha_invitation") {
      await sql`
        UPDATE account_invitations
        SET resend_message_id = ${result.messageId}, updated_at = now()
        WHERE email = ${item.recipient_email} AND status = 'pending'
      `;
    }

    return { success: true, messageId: result.messageId };
  }

  // Handle failure & bounded retry backoff
  const nextAttemptSeconds = Math.min(30 * 2 ** (attempts - 1), 3600);
  const nextStatus = result.retryable === false || attempts >= maxAttempts ? "failed" : "pending";

  await sql`
    UPDATE email_outbox
    SET
      status = ${nextStatus},
      attempts = ${attempts},
      last_attempt_at = now(),
      next_attempt_at = now() + (${nextAttemptSeconds} || ' seconds')::interval,
      error_message = ${result.error || "Delivery failed"},
      updated_at = now()
    WHERE id = ${outboxId}
  `;

  return { success: false, error: result.error };
}

/**
 * Worker / processor to dispatch pending outbox items that are due for delivery.
 */
export async function processDueOutboxItems(limit = 10): Promise<{ processed: number; successful: number }> {
  const sql = getDatabase();
  const due = await sql`
    SELECT id
    FROM email_outbox
    WHERE status IN ('pending')
      AND attempts < max_attempts
      AND next_attempt_at <= now()
    ORDER BY next_attempt_at ASC
    LIMIT ${limit}
  `;

  let successful = 0;
  for (const row of due) {
    const res = await dispatchOutboxItem(row.id as string);
    if (res.success) successful++;
  }

  return { processed: due.length, successful };
}
