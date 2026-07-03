import { getDocumentAccessContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function inlineFilename(name: string, fallbackExtension: string) {
  const baseName = name.replace(/\.[^.]+$/, "") || "document";
  return `${baseName}.${fallbackExtension}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function docxHtmlPage(title: string, body: string) {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      background: #f4f6f8;
      color: #18181b;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      line-height: 1.65;
    }
    main {
      box-sizing: border-box;
      width: min(8.5in, calc(100vw - 32px));
      min-height: 11in;
      margin: 24px auto;
      padding: min(0.85in, 8vw);
      background: white;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
    }
    h1, h2, h3, h4, h5, h6 {
      line-height: 1.25;
      margin: 1.4em 0 0.5em;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
    p { margin: 0 0 1em; }
    table { width: 100%; border-collapse: collapse; margin: 1.25em 0; }
    th, td { border: 1px solid #d4d4d8; padding: 8px 10px; vertical-align: top; }
    th { background: #f4f4f5; }
    img { max-width: 100%; height: auto; }
    a { color: #2563eb; }
    @media print {
      body { background: white; }
      main { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <main>${body || "<p>No readable content was found in this document.</p>"}</main>
</body>
</html>`;
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
    .select("id, name, file_path, file_type")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: file, error } = await context.service.storage
    .from("documents")
    .download(document.file_path);
  if (!file || error) {
    return NextResponse.json(
      { error: error?.message ?? "Could not open document" },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (document.file_type === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.convertToHtml({ buffer });
    return new NextResponse(docxHtmlPage(document.name, value), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${inlineFilename(document.name, "html")}"`,
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      },
    });
  }

  const contentType =
    document.file_type === "pdf"
      ? "application/pdf"
      : "text/plain; charset=utf-8";
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${inlineFilename(document.name, document.file_type)}"`,
    },
  });
}
