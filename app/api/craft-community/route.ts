import { NextRequest } from "next/server";
import { getDatabase } from "@/lib/db";
import { craftCommunitySchema } from "@/lib/validation";
import { errorResponse, parseJson, preflight, successResponse } from "@/lib/submission";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const blocked = await preflight(request, "craft_community");
    if (blocked) return blocked;
    const parsed = craftCommunitySchema.safeParse(await parseJson(request));
    if (!parsed.success) return errorResponse("Please check the required fields and try again.", 400);
    const data = parsed.data;
    const sql = getDatabase();
    await sql`
      INSERT INTO craft_community_submissions
        (contact_name, email, phone, organization_name, participant_type, region,
         craft_types, about_work, website_url, open_to_collaboration, contact_consent_at)
      VALUES (${data.contactName}, ${data.email}, ${data.phone || null}, ${data.organizationName || null},
              ${data.participantType}, ${data.region}, string_to_array(${data.craftTypes.join(',')}, ','), ${data.aboutWork},
              ${data.websiteUrl || null}, ${data.openToCollaboration}, now())
      ON CONFLICT (email) DO NOTHING
    `;
    return successResponse();
  } catch (error) {
    console.error("craft community submission failed", error instanceof Error ? error.name : "unknown");
    return errorResponse("We could not save your details. Please try again later.", 503);
  }
}
