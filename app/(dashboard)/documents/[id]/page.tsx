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
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    return info.total;
  } finally {
    await parser.destroy();
  }
}

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    />
  );
}
