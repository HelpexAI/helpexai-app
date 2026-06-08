import { DocumentViewer } from "@/components/documents/document-viewer";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { createServiceClient } from "@/lib/supabase/server";
import type { Document as DocumentRecord } from "@/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function extractReadableText(buffer: Buffer, fileType: DocumentRecord["file_type"]) {
  if (fileType === "txt") return buffer.toString("utf-8");
  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return null;
}

async function getPdfPageCount(buffer: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: Uint8Array.from(buffer), disableFontFace: true, isEvalSupported: false, useSystemFonts: false });
  const pdf = await task.promise;
  try {
    return pdf.numPages;
  } finally {
    await pdf.destroy();
  }
}

export default async function DocumentViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; highlight?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const requestedPage = Number.parseInt(query.page ?? "", 10);
  const workspace = await getCurrentWorkspace();
  const service = createServiceClient();
  const { data: document } = await service
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", workspace.userId)
    .eq("category_slug", workspace.category)
    .maybeSingle();

  if (!document) notFound();

  const [{ data: download }, { data: file }] = await Promise.all([
    service.storage
      .from("documents")
      .createSignedUrl(document.file_path, 60 * 60, { download: document.name }),
    service.storage.from("documents").download(document.file_path),
  ]);

  if (!download?.signedUrl) notFound();

  let extractedText: string | null = null;
  let pageCount = 1;
  if (file) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (document.file_type === "pdf") {
        pageCount = await getPdfPageCount(buffer);
      } else {
        extractedText = await extractReadableText(buffer, document.file_type);
      }
    } catch (error) {
      console.warn("Document preview metadata unavailable:", error);
    }
  }

  return (
    <DocumentViewer
      document={document as DocumentRecord}
      downloadUrl={download.signedUrl}
      extractedText={extractedText}
      pageCount={pageCount}
      initialPage={Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1}
      highlightExcerpt={query.highlight?.trim() || null}
    />
  );
}
