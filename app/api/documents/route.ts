import { getDocumentRequestContext, fileTypeFromFile, safeStorageFilename } from "@/lib/documents/server";
import { MAX_FILES_PER_UPLOAD, MAX_FILE_SIZE } from "@/lib/validations/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`documents-upload:${context.user.id}:${context.category}`, 10, 60);
  if (limited) return limited;

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

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

  const reserved = files.map((file) => {
    const id = crypto.randomUUID();
    return {
      id,
      file,
      fileType: fileTypeFromFile(file)!,
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
    })),
  });
  if (reservationError) {
    return NextResponse.json({ error: "Document quota protection is unavailable. Apply the alpha hardening migration." }, { status: 503 });
  }
  const quota = reservation?.[0];
  if (!quota?.allowed) {
    return NextResponse.json(
      {
        error: `Your ${context.plan} plan allows ${quota?.quota_limit ?? 1} document${quota?.quota_limit === 1 ? "" : "s"}.`,
        code: "DOCUMENT_LIMIT_REACHED",
        used: quota?.used ?? 0,
        limit: quota?.quota_limit ?? 1,
      },
      { status: 403 },
    );
  }

  const uploaded = [];

  for (const { id, file, storagePath } of reserved) {
    const bytes = new Uint8Array(await file.arrayBuffer());
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
    await context.service.from("usage_logs").insert({
      user_id: context.user.id,
      category_slug: context.category,
      action: "document_upload",
    });
  }

  return NextResponse.json({ documents: uploaded }, { status: 201 });
}
