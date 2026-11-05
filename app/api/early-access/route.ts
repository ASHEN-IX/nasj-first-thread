import { NextRequest } from "next/server";
import { getDatabase } from "@/lib/db";
import { earlyAccessSchema } from "@/lib/validation";
import { errorResponse, parseJson, preflight, successResponse } from "@/lib/submission";
import { enqueueOutboxItem, dispatchOutboxItem } from "@/lib/outbox";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const blocked = await preflight(request, "early_access");
    if (blocked) return blocked;
    const parsed = earlyAccessSchema.safeParse(await parseJson(request));
    if (!parsed.success) return errorResponse("Please check the required fields and try again.", 400);
    const data = parsed.data;
    const sql = getDatabase();

    const rows = await sql`
      INSERT INTO early_access_applications
        (full_name, email, participant_role, organization, location, testing_interest, contact_consent_at)
      VALUES (${data.fullName}, ${data.email}, ${data.role}, ${data.organization || null},
              ${data.location || null}, ${data.testingInterest}, now())
      ON CONFLICT (email) DO NOTHING
      RETURNING id, full_name, email, participant_role
    `;

    // Recover an existing application so a previously unsent confirmation can be
    // retried. The same outbox key preserves one accepted email per application.
    const applicant = rows?.[0] || (await sql`
      SELECT id, full_name, email, participant_role
      FROM early_access_applications WHERE email = ${data.email}
    `)[0];
    if (applicant) {
      const idempotencyKey = `ea_confirm_${applicant.id}`;
      try {
        const outbox = await enqueueOutboxItem({
          recipientEmail: applicant.email as string,
          templateType: "early_access_confirmation",
          payload: {
            fullName: applicant.full_name as string,
            email: applicant.email as string,
            role: applicant.participant_role as string,
          },
          idempotencyKey,
        });

        // Finish dispatch before responding; failed sends remain in the outbox
        if (outbox.status === "pending") {
          await dispatchOutboxItem(outbox.id).catch((err) => {
            console.error("Early access confirmation dispatch deferred:", err instanceof Error ? err.name : "unknown");
          });
        }
      } catch (queueErr) {
        console.error("Outbox enqueue failure for early access:", queueErr instanceof Error ? queueErr.name : "unknown");
      }
    }

    return successResponse();
  } catch (error) {
    console.error("early access submission failed", error instanceof Error ? error.name : "unknown");
    return errorResponse("We could not save your request. Please try again later.", 503);
  }
}
