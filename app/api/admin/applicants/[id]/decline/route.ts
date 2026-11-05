import { NextRequest } from "next/server";
import { POST as handleReview } from "@/app/api/admin/applicants/route";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let reason: string | undefined;
  try {
    const body = await request.json();
    reason = body?.reason;
  } catch {
    // optional body
  }

  const syntheticReq = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ id, action: "decline", reason }),
  });

  return handleReview(syntheticReq);
}
