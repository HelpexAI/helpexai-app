import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function cleanup(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { count, error } = await createServiceClient()
    .from("public_tool_sessions")
    .delete({ count: "exact" })
    .lt("expires_at", new Date().toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: count ?? 0 });
}

export const GET = cleanup;
export const POST = cleanup;
