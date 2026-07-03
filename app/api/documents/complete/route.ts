import { getDocumentRequestContext } from "@/lib/documents/server";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { logEvent, reportError } from "@/lib/monitoring";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const documentIds = Array.from(
    new Set(
      ((body as { document_ids?: unknown } | null)?.document_ids as unknown[] | undefined)
        ?.map(String)
        .filter(Boolean) ?? [],
    ),
  );
  const tagIds = Array.from(
    new Set(
      ((body as { tag_ids?: unknown } | null)?.tag_ids as unknown[] | undefined)
        ?.map(String)
        .filter(Boolean) ?? [],
    ),
  );

  if (!documentIds.length) {
    return NextResponse.json({ error: "No uploaded documents were provided." }, { status: 400 });
  }

  await logEvent("document_upload_complete_started", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    documentIds,
  });

  const [{ data: documents, error: documentsError }, { data: selectedTags }] =
    await Promise.all([
      context.service
        .from("documents")
        .select("*, collection:collections(id, name)")
        .eq("user_id", context.user.id)
        .eq("category_slug", context.category)
        .in("id", documentIds),
      tagIds.length
        ? context.service
            .from("tags")
            .select("id, name")
            .in("id", tagIds)
            .eq("category_slug", context.category)
            .eq("is_active", true)
        : Promise.resolve({ data: [] }),
    ]);

  if (documentsError) {
    await reportError(documentsError, {
      area: "document-upload-complete",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
    });
    return NextResponse.json({ error: documentsError.message }, { status: 500 });
  }
  if ((documents?.length ?? 0) !== documentIds.length) {
    return NextResponse.json({ error: "One or more uploaded documents were not found." }, { status: 404 });
  }
  if ((selectedTags?.length ?? 0) !== tagIds.length) {
    return NextResponse.json({ error: "One or more selected tags are invalid." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await context.service
    .from("documents")
    .update({ status: "processing" })
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .in("id", documentIds)
    .select();

  if (updateError) {
    await reportError(updateError, {
      area: "document-upload-complete",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
    });
    return NextResponse.json({ error: `Document record failed: ${updateError.message}` }, { status: 500 });
  }

  if (tagIds.length) {
    const { error: tagError } = await context.service
      .from("document_tag_assignments")
      .insert(
        documentIds.flatMap((documentId) =>
          tagIds.map((tagId) => ({ document_id: documentId, tag_id: tagId })),
        ),
      );

    if (tagError) {
      await reportError(tagError, {
        area: "document-upload-complete",
        userId: context.user.id,
        userEmail: context.user.email,
        category: context.category,
      });
      return NextResponse.json({ error: `Could not assign document tags: ${tagError.message}` }, { status: 500 });
    }
  }

  const { error: usageError } = await context.service.from("usage_logs").insert(
    documentIds.map(() => ({
      user_id: context.user.id,
      category_slug: context.category,
      action: "document_upload",
    })),
  );
  if (usageError) {
    await reportError(usageError, {
      area: "document-upload-complete",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
    });
  }

  const byId = new Map((documents ?? []).map((document) => [document.id, document]));
  for (const document of updated ?? []) {
    const original = byId.get(document.id);
    await logEvent("document_uploaded", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      documentId: document.id,
      documentName: document.name,
      storagePath: document.file_path,
      collection: Array.isArray(original?.collection)
        ? original.collection[0]?.name
        : original?.collection?.name,
      tags: selectedTags?.map((tag) => tag.name) ?? [],
    });
  }

  await logEvent("document_upload_completed", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    documentIds,
  });

  revalidateWorkspacePaths();
  return NextResponse.json({ documents: updated ?? [] }, { status: 200 });
}
