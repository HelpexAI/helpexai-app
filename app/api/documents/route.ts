import { getDocumentRequestContext, fileTypeFromFile, safeStorageFilename } from "@/lib/documents/server";
import { MAX_FILES_PER_UPLOAD, MAX_FILE_SIZE } from "@/lib/validations/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { validateReadableDocument, DocumentReadabilityError } from "@/lib/documents/readability";
import { logEvent, reportError } from "@/lib/monitoring";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { normalizeDocumentRelations } from "@/lib/documents/metadata";

export const runtime = "nodejs";

export async function GET() {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: documents, error } = await context.service
    .from("documents")
    .select("*, collection:collections(id, name, description, ai_context, icon), document_tag_assignments(tag:tags(id, name, description, ai_context, color))")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    documents: (documents ?? []).map(normalizeDocumentRelations),
    category: context.category,
    plan: context.plan,
    storageUsed: context.documentLimit.used,
    storageLimit: context.documentLimit.limit,
    requiresResolution: context.documentLimit.requiresResolution,
  });
}

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`documents-upload:${context.user.id}:${context.category}`, 10, 60);
  if (limited) return limited;

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  const collectionId = String(formData.get("collection_id") ?? "");
  const tagIds = Array.from(new Set(formData.getAll("tag_ids").map(String).filter(Boolean)));

  const [{ data: collection }, { data: selectedTags }] = await Promise.all([
    context.service.from("collections").select("id, name").eq("id", collectionId).eq("category_slug", context.category).eq("is_active", true).maybeSingle(),
    tagIds.length
      ? context.service.from("tags").select("id, name").in("id", tagIds).eq("category_slug", context.category).eq("is_active", true)
      : Promise.resolve({ data: [] }),
  ]);
  if (!collection) {
    return NextResponse.json({ error: "Choose a valid document collection." }, { status: 400 });
  }
  if ((selectedTags?.length ?? 0) !== tagIds.length) {
    return NextResponse.json({ error: "One or more selected tags are invalid." }, { status: 400 });
  }

  if (files.length === 0 || files.length > MAX_FILES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Upload between 1 and ${MAX_FILES_PER_UPLOAD} files.` },
      { status: 400 },
    );
  }

  const invalid = files.find((file) => !fileTypeFromFile(file) || file.size > MAX_FILE_SIZE);
  if (invalid) {
    return NextResponse.json(
      { error: `${invalid.name} must be PDF, DOCX, or TXT and no larger than 10MB.` },
      { status: 400 },
    );
  }

  const preparedFiles = [];
  for (const file of files) {
    const fileType = fileTypeFromFile(file)!;
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      const readability = await validateReadableDocument(Buffer.from(bytes), fileType);
      preparedFiles.push({ file, fileType, bytes });
      await logEvent("document_validated", {
        userId: context.user.id,
        userEmail: context.user.email,
        category: context.category,
        documentName: file.name,
        fileType,
        fileSize: file.size,
        readableCharacters: readability.readableCharacters,
      });
    } catch (error) {
      await reportError(error, {
        area: "document-validation",
        userId: context.user.id,
        userEmail: context.user.email,
        category: context.category,
        documentName: file.name,
      });
      const message = error instanceof DocumentReadabilityError
        ? error.message
        : `Could not read ${file.name}. Upload a valid text-based document.`;
      return NextResponse.json(
        { error: message, code: error instanceof DocumentReadabilityError ? error.code : "DOCUMENT_VALIDATION_FAILED" },
        { status: 422 },
      );
    }
  }

  const { error: bucketError } = await context.service.storage.getBucket("documents");
  if (bucketError) {
    const { error: createBucketError } = await context.service.storage.createBucket("documents", {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ],
    });

    if (createBucketError && !createBucketError.message.toLowerCase().includes("already exists")) {
      return NextResponse.json({ error: createBucketError.message }, { status: 500 });
    }
  }

  const reserved = preparedFiles.map(({ file, fileType, bytes }) => {
    const id = crypto.randomUUID();
    return {
      id,
      file,
      fileType,
      bytes,
      storagePath: `${context.user.id}/${context.category}/${id}/${safeStorageFilename(file.name)}`,
    };
  });
  const { data: reservation, error: reservationError } = await context.service.rpc("reserve_document_uploads", {
    p_user_id: context.user.id,
    p_category_slug: context.category,
    p_documents: reserved.map((item) => ({
      id: item.id,
      name: item.file.name,
      file_path: item.storagePath,
      file_size: item.file.size,
      file_type: item.fileType,
      collection_id: collectionId,
    })),
  });
  if (reservationError) {
    return NextResponse.json({ error: "Document collection protection is unavailable. Apply migration 010." }, { status: 503 });
  }
  const quota = reservation?.[0];
  if (!quota?.allowed) {
    return NextResponse.json(
      {
        error: `Your ${context.plan} plan storage limit has been reached.`,
        code: "DOCUMENT_LIMIT_REACHED",
        used: quota?.used ?? 0,
        limit: quota?.quota_limit ?? 30 * 1024 * 1024,
      },
      { status: 403 },
    );
  }

  const uploaded = [];

  for (const { id, file, storagePath, bytes } of reserved) {
    const { error: storageError } = await context.service.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: file.type || undefined, upsert: false });

    if (storageError) {
      await context.service.storage.from("documents").remove(reserved.map((item) => item.storagePath));
      await context.service.from("documents").delete().in("id", reserved.map((item) => item.id));
      return NextResponse.json(
        { error: `Storage upload failed: ${storageError.message}` },
        { status: 500 },
      );
    }

    const { data: document, error: recordError } = await context.service
      .from("documents")
      .update({ status: "processing" })
      .eq("id", id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .select()
      .single();

    if (recordError) {
      await context.service.storage.from("documents").remove(reserved.map((item) => item.storagePath));
      await context.service.from("documents").delete().in("id", reserved.map((item) => item.id));
      return NextResponse.json(
        { error: `Document record failed: ${recordError.message}` },
        { status: 500 },
      );
    }

    uploaded.push(document);
    if (tagIds.length) {
      const { error: tagError } = await context.service.from("document_tag_assignments").insert(
        tagIds.map((tagId) => ({ document_id: id, tag_id: tagId })),
      );
      if (tagError) {
        await context.service.storage.from("documents").remove([storagePath]);
        await context.service.from("documents").delete().eq("id", id);
        return NextResponse.json({ error: `Could not assign document tags: ${tagError.message}` }, { status: 500 });
      }
    }
    await context.service.from("usage_logs").insert({
      user_id: context.user.id,
      category_slug: context.category,
      action: "document_upload",
    });
    await logEvent("document_uploaded", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      documentId: id,
      documentName: file.name,
      storagePath,
      collection: collection.name,
      tags: selectedTags?.map((tag) => tag.name) ?? [],
    });
  }

  revalidateWorkspacePaths();
  return NextResponse.json({ documents: uploaded }, { status: 201 });
}
