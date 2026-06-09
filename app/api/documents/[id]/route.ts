import { deleteOwnedDocument } from "@/lib/documents/delete";
import { getDocumentAccessContext, getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { logEvent } from "@/lib/monitoring";

export const runtime = "nodejs";

async function extractReadableText(buffer: Buffer, fileType: string) {
  if (fileType === "txt") return buffer.toString("utf-8");
  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer })).value;
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentAccessContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: document } = await context.service
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: download } = await context.service.storage
    .from("documents")
    .createSignedUrl(document.file_path, 60 * 60, { download: document.name });
  if (!download?.signedUrl) return NextResponse.json({ error: "Could not open document" }, { status: 500 });

  let extractedText: string | null = null;
  if (document.file_type !== "pdf") {
    const { data: file } = await context.service.storage.from("documents").download(document.file_path);
    if (file) extractedText = await extractReadableText(Buffer.from(await file.arrayBuffer()), document.file_type);
  }

  return NextResponse.json({ document, downloadUrl: download.signedUrl, extractedText });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document } = await context.service
    .from("documents")
    .select("id, file_path")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    await deleteOwnedDocument(context.service, context.user.id, context.category, document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete document." },
      { status: 500 },
    );
  }

  await logEvent("document_deleted", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    documentId: id,
  });
  revalidateWorkspacePaths();
  return NextResponse.json({ success: true });
}
