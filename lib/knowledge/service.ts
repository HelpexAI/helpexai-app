import type { CategorySlug, KnowledgeChunkInput, KnowledgeEntity } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EnsureKnowledgeEntityInput = {
  userId: string;
  categorySlug: CategorySlug;
  sourceType: "document" | "report";
  itemType: "document" | "report";
  originId: string;
  title: string;
  status: "pending" | "processing" | "ready" | "failed" | "archived";
  contentPreview?: string;
  collectionId?: string | null;
  metadata?: Record<string, unknown>;
  tagIds?: string[];
};

async function getWorkspaceAccountId(
  service: SupabaseClient,
  userId: string,
  categorySlug: CategorySlug,
) {
  const { data, error } = await service
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("category_slug", categorySlug)
    .single();
  if (error || !data) throw error ?? new Error("Workspace account was not found.");
  return data.id as string;
}

export async function ensureKnowledgeEntity(
  service: SupabaseClient,
  input: EnsureKnowledgeEntityInput,
): Promise<KnowledgeEntity> {
  const accountId = await getWorkspaceAccountId(service, input.userId, input.categorySlug);
  const common = {
    account_id: accountId,
    user_id: input.userId,
    category_slug: input.categorySlug,
    origin_ref: input.originId,
    status: input.status,
    metadata: input.metadata ?? {},
  };
  const { data: source, error: sourceError } = await service
    .from("knowledge_sources")
    .upsert(
      { ...common, type: input.sourceType, name: input.title },
      { onConflict: "account_id,type,origin_ref" },
    )
    .select("id")
    .single();
  if (sourceError || !source) throw sourceError ?? new Error("Could not create knowledge source.");

  const { data: item, error: itemError } = await service
    .from("knowledge_items")
    .upsert(
      {
        ...common,
        source_id: source.id,
        type: input.itemType,
        title: input.title,
        content_preview: input.contentPreview?.slice(0, 1000) ?? "",
        collection_id: input.collectionId ?? null,
      },
      { onConflict: "source_id,origin_ref" },
    )
    .select("id")
    .single();
  if (itemError || !item) throw itemError ?? new Error("Could not create knowledge item.");

  if (input.tagIds) {
    await service.from("knowledge_item_tag_assignments").delete().eq("item_id", item.id);
    if (input.tagIds.length) {
      const { error } = await service.from("knowledge_item_tag_assignments").insert(
        input.tagIds.map((tagId) => ({ item_id: item.id, tag_id: tagId })),
      );
      if (error) throw error;
    }
  }

  return { accountId, sourceId: source.id, itemId: item.id };
}

export async function replaceKnowledgeChunks(
  service: SupabaseClient,
  entity: KnowledgeEntity,
  input: Pick<EnsureKnowledgeEntityInput, "userId" | "categorySlug">,
  chunks: KnowledgeChunkInput[],
) {
  const { error: deleteError } = await service
    .from("knowledge_chunks")
    .delete()
    .eq("item_id", entity.itemId);
  if (deleteError) throw deleteError;
  if (!chunks.length) return;
  const { error } = await service.from("knowledge_chunks").insert(
    chunks.map((chunk) => ({
      account_id: entity.accountId,
      user_id: input.userId,
      category_slug: input.categorySlug,
      source_id: entity.sourceId,
      item_id: entity.itemId,
      content: chunk.content,
      chunk_index: chunk.chunkIndex,
      token_count: chunk.tokenCount,
      metadata: chunk.metadata,
      embedding_id: chunk.embeddingId,
    })),
  );
  if (error) throw error;
}

export async function updateKnowledgeStatus(
  service: SupabaseClient,
  entity: Pick<KnowledgeEntity, "sourceId" | "itemId">,
  status: EnsureKnowledgeEntityInput["status"],
  metadata?: Record<string, unknown>,
) {
  const patch = metadata ? { status, metadata } : { status };
  const [{ error: sourceError }, { error: itemError }] = await Promise.all([
    service.from("knowledge_sources").update(patch).eq("id", entity.sourceId),
    service.from("knowledge_items").update(patch).eq("id", entity.itemId),
  ]);
  if (sourceError || itemError) throw sourceError ?? itemError;
}

export async function deleteKnowledgeEntity(
  service: SupabaseClient,
  input: Pick<EnsureKnowledgeEntityInput, "userId" | "categorySlug" | "sourceType" | "originId">,
) {
  const { error } = await service
    .from("knowledge_sources")
    .delete()
    .eq("user_id", input.userId)
    .eq("category_slug", input.categorySlug)
    .eq("type", input.sourceType)
    .eq("origin_ref", input.originId);
  if (error) throw error;
}
