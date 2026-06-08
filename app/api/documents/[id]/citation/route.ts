import { citationPreviewFromFile } from "@/lib/documents/citations";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const excerpt = url.searchParams.get("excerpt")?.trim().slice(0, 2000) ?? "";
  const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "", 10);
  if (!excerpt) return NextResponse.json({ error: "Citation excerpt is required." }, { status: 400 });

  const { data: document } = await context.service
    .from("documents")
    .select("id, name, file_path, file_type")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const { data: file, error } = await context.service.storage.from("documents").download(document.file_path);
  if (!file || error) return NextResponse.json({ error: "Could not load cited document." }, { status: 500 });

  try {
    const preview = await citationPreviewFromFile(
      Buffer.from(await file.arrayBuffer()),
      document.file_type,
      excerpt,
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : null,
    );
    return NextResponse.json({ document: { id: document.id, name: document.name, fileType: document.file_type }, ...preview });
  } catch (previewError) {
    console.error("Citation preview failed:", previewError);
    return NextResponse.json({ error: "Could not prepare citation preview." }, { status: 500 });
  }
}
