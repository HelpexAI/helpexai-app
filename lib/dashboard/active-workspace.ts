import type { CategorySlug } from "@/types";
import { cookies } from "next/headers";

export const ACTIVE_WORKSPACE_COOKIE = "helpex_active_workspace";

export async function getActiveWorkspaceCategory(): Promise<CategorySlug | null> {
  const value = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  return value === "legal" || value === "business" ? value : null;
}

