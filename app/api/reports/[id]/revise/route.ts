import { stripAiDisclaimer } from "@/lib/ai/disclaimer";
import { getLLMProvider } from "@/lib/ai/factory";
import { extractDocumentPages } from "@/lib/ai/pipeline/ingest";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { reportError, logEvent } from "@/lib/monitoring";
import { createLineDiff } from "@/lib/reports/diff";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sanitizeTextForStorage } from "@/lib/text/sanitize";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_REPORT_CHARACTERS = 250_000;
const MAX_SELECTED_TEXT_CHARACTERS = 12_000;
const MAX_INSTRUCTION_CHARACTERS = 8_000;
const MAX_SOURCE_CONTEXT_CHARACTERS = 30_000;

type RouteContext = { params: Promise<{ id: string }> };
type RevisionBody = {
  currentVersionId?: unknown;
  instruction?: unknown;
  selectedText?: unknown;
  title?: unknown;
  tone?: unknown;
  length?: unknown;
};

function clean(value: unknown) {
  return typeof value === "string" ? sanitizeTextForStorage(value.trim()) : "";
}

async function loadSourceContext(
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>,
  reportId: string,
) {
  const { data, error } = await context.service
    .from("report_sources")
    .select("document:documents(id, name, file_path, file_type)")
    .eq("report_id", reportId);
  if (error) throw error;

  const sections = await Promise.all(
    (data ?? []).map(async (source) => {
      const document = Array.isArray(source.document) ? source.document[0] : source.document;
      if (!document) return "";
      const { data: file, error: downloadError } = await context.service.storage
        .from("documents")
        .download(document.file_path);
      if (downloadError || !file) return `Source: ${document.name}\n[Source text unavailable]`;
      const pages = await extractDocumentPages(
        Buffer.from(await file.arrayBuffer()),
        document.file_type,
      );
      const text = pages.map((page) => page.text).join("\n\n");
      return `Source: ${document.name}\n${text}`;
    }),
  );
  return sections
    .filter(Boolean)
    .join("\n\n---\n\n")
    .slice(0, MAX_SOURCE_CONTEXT_CHARACTERS);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(`report-revise:${context.user.id}:${id}`, 8, 60);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as RevisionBody | null;
  const currentVersionId = clean(body?.currentVersionId);
  const instruction = clean(body?.instruction).slice(0, MAX_INSTRUCTION_CHARACTERS);
  const selectedText = clean(body?.selectedText).slice(0, MAX_SELECTED_TEXT_CHARACTERS);
  const requestedTitle = clean(body?.title).slice(0, 160);
  const tone = body?.tone === "simple" || body?.tone === "formal" ? body.tone : "professional";
  const length = body?.length === "short" || body?.length === "detailed" ? body.length : "standard";

  if (!currentVersionId || instruction.length < 3) {
    return NextResponse.json({ error: "A current version and improvement instruction are required." }, { status: 400 });
  }

  try {
    const { data: report, error: reportLookupError } = await context.service
      .from("reports")
      .select("id, title, status, current_version_id")
      .eq("id", id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .maybeSingle();
    if (reportLookupError) throw reportLookupError;
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (report.status === "finalized") {
      return NextResponse.json({ error: "Finalized reports cannot be revised." }, { status: 409 });
    }

    const { data: version, error: versionError } = await context.service
      .from("report_versions")
      .select("id, title, content_markdown, version_number")
      .eq("id", currentVersionId)
      .eq("report_id", report.id)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version) return NextResponse.json({ error: "Selected report version was not found." }, { status: 404 });
    if (version.content_markdown.length > MAX_REPORT_CHARACTERS) {
      return NextResponse.json({ error: "This report is too large to revise." }, { status: 413 });
    }

    const sourceContext = await loadSourceContext(context, report.id);
    const prompt = [
      "Improve the existing business report using the instruction below.",
      "Return the full updated report in clean Markdown only.",
      "Use only the existing report and supplied source context for facts. Do not invent facts.",
      "Preserve the existing structure unless the instruction asks to change it.",
      "Focus on the selected text when provided.",
      "Do not return HTML, diff symbols, highlights, editing notes, or AI disclaimers.",
      "Mention missing information instead of guessing.",
      `Tone: ${tone}`,
      `Length: ${length}`,
      `Instruction: ${instruction}`,
      selectedText ? `Selected text to focus on:\n${selectedText}` : "No text selection was provided.",
      `Existing report:\n${version.content_markdown}`,
      `Source context:\n${sourceContext || "[Source context unavailable; do not invent facts.]"}`,
    ].join("\n\n");

    const rawContent = await getLLMProvider().complete(
      prompt,
      "You are HelpexAI's report revision editor. Improve business reports faithfully and return only the full clean Markdown report.",
    );
    const contentMarkdown = sanitizeTextForStorage(stripAiDisclaimer(rawContent)).slice(0, MAX_REPORT_CHARACTERS);
    if (!contentMarkdown) throw new Error("The AI returned an empty revised report.");
    const title = requestedTitle || version.title || report.title;
    const diff = createLineDiff(version.content_markdown, contentMarkdown);
    const added = diff.filter((line) => line.type === "added").length;
    const removed = diff.filter((line) => line.type === "removed").length;
    const changeSummary = `${added} line${added === 1 ? "" : "s"} added and ${removed} line${removed === 1 ? "" : "s"} removed.`;

    const { data: latestVersion, error: latestError } = await context.service
      .from("report_versions")
      .select("version_number")
      .eq("report_id", report.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;

    const { data: newVersion, error: insertError } = await context.service
      .from("report_versions")
      .insert({
        report_id: report.id,
        version_number: (latestVersion?.version_number ?? 0) + 1,
        title,
        content_markdown: contentMarkdown,
        instruction,
        selected_text: selectedText || null,
        tone,
        length,
        diff,
        change_summary: changeSummary,
        created_by: context.user.id,
      })
      .select("id, version_number, title, content_markdown, diff, change_summary, created_at")
      .single();
    if (insertError) throw insertError;

    const { error: updateError } = await context.service
      .from("reports")
      .update({
        title,
        content: contentMarkdown,
        current_version_id: newVersion.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category);
    if (updateError) throw updateError;

    await logEvent("report_revised", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      reportId: report.id,
      previousVersionId: version.id,
      newVersionId: newVersion.id,
      versionNumber: newVersion.version_number,
    });

    return NextResponse.json({
      reportId: report.id,
      newVersionId: newVersion.id,
      versionNumber: newVersion.version_number,
      title,
      contentMarkdown,
      diff,
      changeSummary,
    });
  } catch (error) {
    await reportError(error, { area: "report-revision", userId: context.user.id, category: context.category, reportId: id });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not improve report." },
      { status: 500 },
    );
  }
}
