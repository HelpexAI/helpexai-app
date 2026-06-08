import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const service = createServiceClient();
  const { error } = await service.from("plans").select("id").limit(1);
  return NextResponse.json(
    { status: error ? "degraded" : "ok", timestamp: new Date().toISOString() },
    { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
