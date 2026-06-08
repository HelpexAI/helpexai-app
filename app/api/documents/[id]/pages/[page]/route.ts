import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; page: string }> },
) {
  const { id, page: pageParam } = await params;
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = Number.parseInt(pageParam, 10);
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  const { data: document } = await context.service
    .from("documents")
    .select("file_path, file_type")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .eq("file_type", "pdf")
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: file, error: downloadError } = await context.service.storage
    .from("documents")
    .download(document.file_path);

  if (!file || downloadError) {
    return NextResponse.json(
      { error: downloadError?.message ?? "Could not load document" },
      { status: 500 },
    );
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });

  try {
    const result = await parser.getScreenshot({
      partial: [page],
      desiredWidth: 1200,
      imageDataUrl: false,
      imageBuffer: true,
    });
    const screenshot = result.pages[0];

    if (!screenshot) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const png = new Uint8Array(screenshot.data).buffer;
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("PDF page render failed:", error);
    return NextResponse.json({ error: "Could not render PDF page" }, { status: 500 });
  } finally {
    await parser.destroy();
  }
}
