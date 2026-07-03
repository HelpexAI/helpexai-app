import {
  fileTypeFromMetadata,
  getDocumentRequestContext,
  safeStorageFilename,
} from "@/lib/documents/server";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { logEvent, reportError } from "@/lib/monitoring";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { MAX_FILES_PER_UPLOAD, MAX_FILE_SIZE } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type UploadFileInput = {
  name?: unknown;
  size?: unknown;
  type?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readFiles(value: unknown): UploadFileInput[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

async function ensureDocumentsBucket(context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>) {
  const { error: bucketError } = await context.service.storage.getBucket("documents");
  if (!bucketError) return null;

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
    return createBucketError;
  }

  return null;
}

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(
    `documents-upload:${context.user.id}:${context.category}`,
    10,
    60,
  );
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const files = readFiles((body as { files?: unknown } | null)?.files);
  const collectionId = readString((body as { collection_id?: unknown } | null)?.collection_id);
  const tagIds = Array.from(
    new Set(
      ((body as { tag_ids?: unknown } | null)?.tag_ids as unknown[] | undefined)
        ?.map(String)
        .filter(Boolean) ?? [],
    ),
  );

  await logEvent("document_upload_prepare_started", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + Number(file.size ?? 0), 0),
  });

  const [{ data: collection }, { data: selectedTags }] = await Promise.all([
    context.service
      .from("collections")
      .select("id, name")
      .eq("id", collectionId)
      .eq("category_slug", context.category)
      .eq("is_active", true)
      .maybeSingle(),
    tagIds.length
      ? context.service
          .from("tags")
          .select("id, name")
          .in("id", tagIds)
          .eq("category_slug", context.category)
          .eq("is_active", true)
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

  const prepared = files.map((file) => {
    const name = readString(file.name);
    const size = Number(file.size);
    const mimeType = readString(file.type);
    const fileType = fileTypeFromMetadata(name, mimeType);
    return { name, size, mimeType, fileType };
  });
  const invalid = prepared.find(
    (file) =>
      !file.name ||
      !file.fileType ||
      !Number.isFinite(file.size) ||
      file.size <= 0 ||
      file.size > MAX_FILE_SIZE,
  );
  if (invalid) {
    return NextResponse.json(
      { error: `${invalid?.name || "File"} must be PDF, DOCX, or TXT and no larger than 10MB.` },
      { status: 400 },
    );
  }

  const bucketError = await ensureDocumentsBucket(context);
  if (bucketError) {
    await reportError(bucketError, {
      area: "document-upload-prepare",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
    });
    return NextResponse.json({ error: bucketError.message }, { status: 500 });
  }

  const reserved = prepared.map((file) => {
    const id = crypto.randomUUID();
    return {
      id,
      name: file.name,
      fileType: file.fileType!,
      mimeType: file.mimeType,
      fileSize: file.size,
      storagePath: `${context.user.id}/${context.category}/${id}/${safeStorageFilename(file.name)}`,
    };
  });

  const { data: reservation, error: reservationError } = await context.service.rpc(
    "reserve_document_uploads",
    {
      p_user_id: context.user.id,
      p_category_slug: context.category,
      p_documents: reserved.map((item) => ({
        id: item.id,
        name: item.name,
        file_path: item.storagePath,
        file_size: item.fileSize,
        file_type: item.fileType,
        collection_id: collectionId,
      })),
    },
  );

  if (reservationError) {
    await reportError(reservationError, {
      area: "document-upload-prepare",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
    });
    return NextResponse.json(
      { error: "Document collection protection is unavailable. Apply migration 010." },
      { status: 503 },
    );
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

  const uploads = [];

  for (const item of reserved) {
    const { data, error } = await context.service.storage
      .from("documents")
      .createSignedUploadUrl(item.storagePath, { upsert: false });

    if (error || !data) {
      await context.service.from("documents").delete().in("id", reserved.map((entry) => entry.id));
      await reportError(error ?? new Error("Signed upload URL was not returned."), {
        area: "document-upload-prepare",
        userId: context.user.id,
        userEmail: context.user.email,
        category: context.category,
        documentId: item.id,
        documentName: item.name,
      });
      return NextResponse.json(
        { error: error?.message ?? "Could not create upload URL." },
        { status: 500 },
      );
    }

    uploads.push({
      id: item.id,
      name: item.name,
      path: data.path,
      token: data.token,
      contentType: item.mimeType || undefined,
    });
  }

  await logEvent("document_upload_prepare_completed", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    collection: collection.name,
    tags: selectedTags?.map((tag) => tag.name) ?? [],
    fileCount: uploads.length,
    totalBytes: reserved.reduce((total, item) => total + item.fileSize, 0),
  });

  revalidateWorkspacePaths();
  return NextResponse.json({ uploads }, { status: 201 });
}

export async function DELETE(request: Request) {
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

  if (!documentIds.length) {
    return NextResponse.json({ cleaned: 0 });
  }

  const { data: documents } = await context.service
    .from("documents")
    .select("id, file_path")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .in("id", documentIds);

  const paths = (documents ?? []).map((document) => document.file_path).filter(Boolean);
  if (paths.length) {
    await context.service.storage.from("documents").remove(paths);
  }
  await context.service
    .from("documents")
    .delete()
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .in("id", documentIds);

  await logEvent("document_upload_prepare_cleaned", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    documentIds,
  });

  revalidateWorkspacePaths();
  return NextResponse.json({ cleaned: documentIds.length });
}
