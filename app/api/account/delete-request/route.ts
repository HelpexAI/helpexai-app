import { getDocumentRequestContext } from "@/lib/documents/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`account-delete:${context.user.id}`, 3, 3600);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 });
  }

  const { error } = await context.service
    .from("accounts")
    .update({
      deletion_requested_at: new Date().toISOString(),
      plan: "free",
      subscription_status: "cancelled",
    })
    .eq("user_id", context.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
