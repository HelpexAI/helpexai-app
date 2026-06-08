import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const PUBLIC_TOOL_COOKIE = "helpex_public_tool";
export const PUBLIC_TOOL_LIMIT = 5;
export const PUBLIC_TOOL_TEXT_LIMIT = 120_000;

function secret() {
  return process.env.PUBLIC_TOOL_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "helpex-public-tool";
}

export function hashPublicValue(value: string) {
  return createHash("sha256").update(`${secret()}:${value}`).digest("hex");
}

export function createPublicSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function publicSessionToken() {
  return (await cookies()).get(PUBLIC_TOOL_COOKIE)?.value ?? null;
}

export function publicSessionCookie(token: string) {
  return {
    name: PUBLIC_TOOL_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    },
  };
}
