import { NextRequest } from "next/server";
import { getDatabase } from "@/lib/db";
import { earlyAccessSchema } from "@/lib/validation";
import { errorResponse, parseJson, preflight, successResponse } from "@/lib/submission";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const blocked = await preflight(request, "early_access");
    if (blocked) return blocked;
    const parsed = earlyAccessSchema.safeParse(await parseJson(request));
    if (!parsed.success) return errorResponse("Please check the required fields and try again.", 400);
    const data = parsed.data;
    const sql = getDatabase();
    await sql`
      INSERT INTO early_access_applications
        (full_name, email, participant_role, organization, location, testing_interest, contact_consent_at)
      VALUES (${data.fullName}, ${data.email}, ${data.role}, ${data.organization || null},
              ${data.location || null}, ${data.testingInterest}, now())
      ON CONFLICT (email) DO NOTHING
    `;
    return successResponse();
  } catch (error) {
    console.error("early access submission failed", error instanceof Error ? error.name : "unknown");
    return errorResponse("We could not save your request. Please try again later.", 503);
  }
}
