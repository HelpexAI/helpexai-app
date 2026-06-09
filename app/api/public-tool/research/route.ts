import { hashPublicValue, publicSessionToken } from "@/lib/public-tool/session";
import { enforceRateLimit, requestIp } from "@/lib/security/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ externalResearchEnabled: z.boolean() });

export async function PUT(request: Request) {
  const token = await publicSessionToken();
  if (!token) return NextResponse.json({ error: "Upload a document first." }, { status: 401 });
  const limited = await enforceRateLimit(`public-tool-research:${hashPublicValue(requestIp(request))}`, 20, 3600);
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose whether External Research is enabled." }, { status: 400 });

  const { data, error } = await createServiceClient()
    .from("public_tool_sessions")
    .update({
      external_research_enabled: parsed.data.externalResearchEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("token_hash", hashPublicValue(token))
    .eq("email_captured", true)
    .gt("expires_at", new Date().toISOString())
    .select("external_research_enabled")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update External Research." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Activate the free tool first." }, { status: 403 });
  return NextResponse.json({ externalResearchEnabled: data.external_research_enabled });
}
