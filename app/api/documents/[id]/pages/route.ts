import { getDocumentAccessContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentAccessContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: document } = await context.service
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .eq("file_type", "pdf")
    .maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: file, error } = await context.service.storage.from("documents").download(document.file_path);
  if (!file || error) return NextResponse.json({ error: "Could not load document" }, { status: 500 });

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
  try {
    const info = await parser.getInfo();
    return NextResponse.json(
      { pageCount: info.total },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } finally {
    await parser.destroy();
  }
}
