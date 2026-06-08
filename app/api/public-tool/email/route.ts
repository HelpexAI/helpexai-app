import { hashPublicValue, publicSessionToken } from "@/lib/public-tool/session";
import { enforceRateLimit, requestIp } from "@/lib/security/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(254),
  marketingConsent: z.literal(true),
});

export async function POST(request: Request) {
  const token = await publicSessionToken();
  if (!token) return NextResponse.json({ error: "Upload a document first." }, { status: 401 });
  const ipHash = hashPublicValue(requestIp(request));
  const limited = await enforceRateLimit(`public-tool-email:${ipHash}`, 5, 3600);
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and accept the consent notice." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const { data, error } = await createServiceClient().rpc("activate_public_tool_session", {
    p_token_hash: hashPublicValue(token),
    p_email: email,
    p_email_hash: hashPublicValue(email),
  });
  if (error) return NextResponse.json({ error: "Public tool activation is unavailable. Apply migration 005." }, { status: 503 });
  const result = data?.[0];
  if (!result?.activated) {
    const message = result?.reason === "email_already_used"
      ? "This email has already used the free public tool. Create a free account to continue."
      : "This public tool session has expired. Please try again tomorrow.";
    return NextResponse.json({ error: message, code: result?.reason }, { status: 403 });
  }
  return NextResponse.json({ activated: true });
}
