import { createServiceClient } from "@/lib/supabase/server";
import { getVectorDBProvider } from "@/lib/ai/factory";
import { generateNamespace } from "@/lib/utils";
import { reportError } from "@/lib/monitoring";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function handleDeletionCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: accounts, error } = await service
    .from("accounts")
    .select("user_id, category_slug")
    .not("deletion_requested_at", "is", null)
    .lte("deletion_requested_at", cutoff);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((accounts ?? []).map((account) => account.user_id)));
  const deleted: string[] = [];
  const failed: Array<{ userId: string; error: string }> = [];

  for (const userId of userIds) {
    try {
      const { data: documents } = await service
        .from("documents")
        .select("file_path")
        .eq("user_id", userId);
      const paths = (documents ?? []).map((document) => document.file_path);
      if (paths.length) await service.storage.from("documents").remove(paths);
      const vectorDB = getVectorDBProvider();
      const categories = Array.from(new Set(
        (accounts ?? []).filter((account) => account.user_id === userId).map((account) => account.category_slug),
      ));
      await Promise.all(categories.map((category) => vectorDB.deleteNamespace(generateNamespace(userId, category))));

      const { error: deleteError } = await service.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      deleted.push(userId);
    } catch (deleteError) {
      reportError(deleteError, { area: "account-deletion-cron", userId });
      failed.push({
        userId,
        error: deleteError instanceof Error ? deleteError.message : "Unknown deletion error",
      });
    }
  }

  return NextResponse.json({ deleted, failed });
}

export const GET = handleDeletionCron;
export const POST = handleDeletionCron;
