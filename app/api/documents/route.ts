import { getDocumentRequestContext, fileTypeFromFile, safeStorageFilename } from "@/lib/documents/server";
import { MAX_FILES_PER_UPLOAD, MAX_FILE_SIZE } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const [{ data: plan }, { count }] = await Promise.all([
    context.service
      .from("plans")
      .select("max_documents")
      .eq("slug", context.plan)
      .eq("category_slug", context.category)
      .maybeSingle(),
    context.service
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category),
  ]);

  const maxDocuments = plan?.max_documents ?? (context.plan === "pro" ? 50 : 1);
  if ((count ?? 0) + files.length > maxDocuments) {
    return NextResponse.json(
      {
        error: `Your ${context.plan} plan allows ${maxDocuments} document${maxDocuments === 1 ? "" : "s"}.`,
        code: "DOCUMENT_LIMIT_REACHED",
        used: count ?? 0,
        limit: maxDocuments,
      },
      { status: 403 },
    );
  }

  const uploaded = [];

  for (const file of files) {
    const id = crypto.randomUUID();
    const fileType = fileTypeFromFile(file)!;
    const storagePath = `${context.user.id}/${context.category}/${id}/${safeStorageFilename(file.name)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: storageError } = await context.service.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: file.type || undefined, upsert: false });

    if (storageError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${storageError.message}` },
        { status: 500 },
      );
    }

    const { data: document, error: recordError } = await context.service
      .from("documents")
      .insert({
        id,
        user_id: context.user.id,
        category_slug: context.category,
        name: file.name,
        file_path: storagePath,
        file_size: file.size,
        file_type: fileType,
        status: "processing",
      })
      .select()
      .single();

    if (recordError) {
      await context.service.storage.from("documents").remove([storagePath]);
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
