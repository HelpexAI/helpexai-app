import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AdminRole = "admin" | "super_admin";

export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: admin } = await service
    .from("platform_admins")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) return null;
  return { user, role: admin.role as AdminRole, service };
}

export async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const service = createServiceClient();
  const { data: admin, error } = await service
    .from("platform_admins")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) redirect("/dashboard?admin=setup-required");
  if (!admin) redirect("/dashboard?admin=unauthorized");

  return { user, role: admin.role as AdminRole, service };
}

export async function requireAdminAction() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized.");
  return admin;
}
