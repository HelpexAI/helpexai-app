import { deleteDocumentVectors } from "@/lib/ai/pipeline/ingest";
import type { CategorySlug } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function deleteOwnedDocument(
  service: SupabaseClient,
  userId: string,
  category: CategorySlug,
  document: { id: string; file_path: string },
) {
  try {
    await deleteDocumentVectors(userId, category, document.id);
  } catch (error) {
    console.warn("Vector deletion skipped:", error);
  }

  const { error: storageError } = await service.storage
    .from("documents")
    .remove([document.file_path]);
  if (storageError) throw storageError;

  const { error: deleteError } = await service
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("user_id", userId)
    .eq("category_slug", category);
  if (deleteError) throw deleteError;

  await service.from("usage_logs").insert({
    user_id: userId,
    category_slug: category,
    action: "document_delete",
  });
}
