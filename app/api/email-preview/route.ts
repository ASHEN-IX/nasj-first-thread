import { NextRequest, NextResponse } from "next/server";
import { renderEmailTemplate, getNasoujWaveDataUri } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fullName = searchParams.get("name") || "Yasmine Ben Salah";
  const email = searchParams.get("email") || "yasmine@example.com";
  const role = searchParams.get("role") || "Artisan & Designer";
  const useDataUri = searchParams.get("embed") === "true";

  const stickerUrl = useDataUri ? getNasoujWaveDataUri() : undefined;

  const rendered = renderEmailTemplate("welcome_email", {
    fullName,
    email,
    role,
    stickerUrl,
  });

  return new NextResponse(rendered.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

