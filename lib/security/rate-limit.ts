import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const service = createServiceClient();
  const { data, error } = await service.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Rate limit check failed:", error);
    return NextResponse.json({ error: "Request protection is temporarily unavailable." }, { status: 503 });
  }

  const result = data?.[0];
  if (!result?.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(result?.retry_after ?? windowSeconds) } },
    );
  }

  return null;
}
