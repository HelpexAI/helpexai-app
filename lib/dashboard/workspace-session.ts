import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/dashboard/active-workspace";
import type { CategorySlug } from "@/types";
import type { NextResponse } from "next/server";

export function setActiveWorkspaceCookie(
  response: NextResponse,
  category: CategorySlug,
) {
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, category, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

