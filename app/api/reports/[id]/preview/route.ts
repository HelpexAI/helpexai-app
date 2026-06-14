import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [reportResult, versionsResult, sourcesResult] = await Promise.all([
    context.service
      .from("reports")
      .select("id, title, content, status, template_id, template_slug, current_version_id, generated_document_id, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .maybeSingle(),
    context.service
      .from("report_versions")
      .select("id, report_id, version_number, title, content_markdown, instruction, selected_text, tone, length, diff, change_summary, created_at")
      .eq("report_id", id)
      .order("version_number", { ascending: false }),
    context.service
      .from("report_sources")
      .select("document_id, document:documents(id, name)")
      .eq("report_id", id),
  ]);

  if (reportResult.error) return NextResponse.json({ error: reportResult.error.message }, { status: 500 });
  if (!reportResult.data) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (versionsResult.error) return NextResponse.json({ error: versionsResult.error.message }, { status: 500 });
  if (sourcesResult.error) return NextResponse.json({ error: sourcesResult.error.message }, { status: 500 });

  const typedSources = (sourcesResult.data ?? []) as unknown as Array<{
    document_id: string;
    document: { id: string; name: string } | { id: string; name: string }[] | null;
  }>;

  return NextResponse.json({
    report: reportResult.data,
    versions: versionsResult.data ?? [],
    sources: typedSources.map((source) => ({
      id: source.document_id,
      name: Array.isArray(source.document) ? source.document[0]?.name : source.document?.name,
    })),
  });
}
