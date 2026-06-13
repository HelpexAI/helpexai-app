import { getDocumentRequestContext } from "@/lib/documents/server";
import { creemRequest } from "@/lib/creem/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CreemPortalResponse = {
  customer_portal_link: string;
};

export async function POST() {
  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: account } = await context.service
    .from("accounts")
    .select("creem_customer_id")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!account?.creem_customer_id) {
    return NextResponse.json(
      { error: "Creem customer was not found." },
      { status: 404 },
    );
  }

  const portal = await creemRequest<CreemPortalResponse>("/customers/billing", {
    method: "POST",
    body: JSON.stringify({
      customer_id: account.creem_customer_id,
    }),
  });

  return NextResponse.json({ url: portal.customer_portal_link });
}
