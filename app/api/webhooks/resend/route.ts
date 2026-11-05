import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    status?: string;
    bounce?: {
      message?: string;
      sub_type?: string;
      type?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  let event: ResendWebhookPayload;

  if (secret && secret.startsWith("whsec_")) {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ ok: false, message: "Missing Svix verification headers" }, { status: 400 });
    }

    try {
      const wh = new Webhook(secret);
      event = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as unknown as ResendWebhookPayload;
    } catch (err) {
      console.error("Resend webhook signature verification failed:", err instanceof Error ? err.message : "unknown");
      return NextResponse.json({ ok: false, message: "Invalid webhook signature" }, { status: 401 });
    }
  } else {
    // If secret not configured or in development/test bypass mode
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
    }
  }

  const { type, data } = event;
  const messageId = data?.id;
  const recipient = (data?.to && data.to[0]) ? data.to[0].toLowerCase() : "unknown";
  const eventId = svixId || `evt_${messageId}_${type}`;
  const occurredAt = event.created_at ? new Date(event.created_at) : new Date();

  const sql = getDatabase();

  try {
    // 1. Replay protection: Insert into delivery events with unique webhook_event_id
    const inserted = await sql`
      INSERT INTO email_delivery_events
        (resend_message_id, event_type, recipient_email, webhook_event_id, payload, occurred_at)
      VALUES
        (${messageId || "unknown"}, ${type}, ${recipient}, ${eventId}, ${JSON.stringify(event)}::jsonb, ${occurredAt.toISOString()})
      ON CONFLICT (webhook_event_id) DO NOTHING
      RETURNING id
    `;

    // Replay detected: event was already processed
    if (!inserted || inserted.length === 0) {
      return NextResponse.json({ ok: true, message: "Event already processed (replayed)." });
    }

    // 2. Lifecycle state machine transitions
    if (messageId) {
      if (type === "email.delivered") {
        await sql`
          UPDATE email_outbox
          SET status = 'delivered', updated_at = now()
          WHERE resend_message_id = ${messageId}
        `;

        await sql`
          UPDATE account_invitations
          SET status = 'delivered', updated_at = now()
          WHERE resend_message_id = ${messageId} AND status = 'pending'
        `;
      } else if (type === "email.bounced") {
        const reason = data?.bounce?.message || "Email bounced";
        await sql`
          UPDATE email_outbox
          SET status = 'bounced', error_message = ${reason}, updated_at = now()
          WHERE resend_message_id = ${messageId}
        `;
      } else if (type === "email.complained") {
        await sql`
          UPDATE email_outbox
          SET status = 'complained', error_message = 'Recipient marked as spam/complaint', updated_at = now()
          WHERE resend_message_id = ${messageId}
        `;
      }
    }

    return NextResponse.json({ ok: true, processed: true, eventId });
  } catch (err) {
    console.error("Webhook event storage error:", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ ok: false, message: "Failed to persist delivery event" }, { status: 500 });
  }
}
