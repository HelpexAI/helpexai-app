import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { deleteOwnedDocument } from "@/lib/documents/delete";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { logEvent } from "@/lib/monitoring";
import { sanitizeTextForStorage } from "@/lib/text/sanitize";
import { deleteKnowledgeItemVectors } from "@/lib/ai/pipeline/ingest";
import { deleteKnowledgeEntity } from "@/lib/knowledge/service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error: reportError } = await context.service
    .from("reports")
    .select(
      [
        "id",
        "user_id",
        "account_id",
        "category_slug",
        "title",
        "prompt",
        "template_id",
        "template_slug",
        "template_snapshot",
        "content",
        "content_format",
        "status",
        "source_type",
        "collection_id",
        "generated_document_id",
        "knowledge_source_id",
        "knowledge_item_id",
        "model",
        "error_message",
        "metadata",
        "generated_at",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const { data: sources, error: sourcesError } = await context.service
    .from("report_sources")
    .select(
      [
        "id",
        "document_id",
        "created_at",
        "document:documents(id, name, file_type, status, created_at)",
      ].join(", "),
    )
    .eq("report_id", id)
    .order("created_at", { ascending: true });

  if (sourcesError) {
    return NextResponse.json({ error: sourcesError.message }, { status: 500 });
  }

  const typedReport = report as unknown as {
    generated_document_id: string | null;
  };
  let generatedDocument = null;
  let generatedDocumentUrl: string | null = null;

  if (typedReport.generated_document_id) {
    const { data: document } = await context.service
      .from("documents")
      .select("id, name, file_path, file_type, status, created_at")
      .eq("id", typedReport.generated_document_id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .maybeSingle();

    generatedDocument = document ?? null;

    if (document?.file_path) {
      const { data: signed } = await context.service.storage
        .from("documents")
        .createSignedUrl(document.file_path, 60 * 60, {
          download: document.name,
        });

      generatedDocumentUrl = signed?.signedUrl ?? null;
    }
  }

  return NextResponse.json({
    report,
    sources: sources ?? [],
    generatedDocument,
    generatedDocumentUrl,
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: report, error: reportErrorResult } = await context.service
      .from("reports")
      .select("id, title, status, generated_document_id, knowledge_item_id")
      .eq("id", id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .maybeSingle();

    if (reportErrorResult) {
      throw reportErrorResult;
    }

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    if (report.generated_document_id) {
      const { data: generatedDocument, error: documentError } =
        await context.service
          .from("documents")
          .select("id, file_path")
          .eq("id", report.generated_document_id)
          .eq("user_id", context.user.id)
          .eq("category_slug", context.category)
          .maybeSingle();

      if (documentError) {
        throw documentError;
      }

      if (generatedDocument?.file_path) {
        await deleteOwnedDocument(
          context.service,
          context.user.id,
          context.category,
          {
            id: generatedDocument.id,
            file_path: generatedDocument.file_path,
          },
        );
      }
    }

    if (report.knowledge_item_id) {
      await deleteKnowledgeItemVectors(
        context.user.id,
        context.category,
        report.knowledge_item_id,
      ).catch(() => undefined);
    }
    await deleteKnowledgeEntity(context.service, {
      userId: context.user.id,
      categorySlug: context.category,
      sourceType: "report",
      originId: report.id,
    });

    const { error: deleteReportError } = await context.service
      .from("reports")
      .delete()
      .eq("id", report.id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category);

    if (deleteReportError) {
      throw deleteReportError;
    }

    await logEvent("report_deleted", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      reportId: report.id,
      title: report.title,
      generatedDocumentId: report.generated_document_id,
      knowledgeItemId: report.knowledge_item_id,
    });

    revalidateWorkspacePaths();

    return NextResponse.json({
      ok: true,
      deletedReportId: report.id,
      deletedDocumentId: report.generated_document_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete report.";

    return NextResponse.json(
      {
        error: message,
        code: "REPORT_DELETE_FAILED",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
  } | null;

  const title = sanitizeTextForStorage(
    typeof body?.title === "string" ? body.title.trim() : "",
  ).slice(0, 160);

  if (!title) {
    return NextResponse.json(
      { error: "Report title is required." },
      { status: 400 },
    );
  }

  try {
    const { data: existingReport, error: existingError } = await context.service
      .from("reports")
      .select("id, title, status, generated_document_id")
      .eq("id", id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    if (existingReport.status === "finalized") {
      return NextResponse.json(
        { error: "Finalized reports cannot be edited." },
        { status: 409 },
      );
    }

    const { data: report, error: updateError } = await context.service
      .from("reports")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingReport.id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .select(
        "id, title, status, generated_document_id, generated_at, created_at, updated_at",
      )
      .single();

    if (updateError) throw updateError;

    if (existingReport.generated_document_id) {
      await context.service
        .from("documents")
        .update({
          name: `${title}.txt`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReport.generated_document_id)
        .eq("user_id", context.user.id)
        .eq("category_slug", context.category);
    }

    await logEvent("report_renamed", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      reportId: existingReport.id,
      oldTitle: existingReport.title,
      newTitle: title,
    });

    revalidateWorkspacePaths();

    return NextResponse.json({ report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not rename report.";

    return NextResponse.json(
      {
        error: message,
        code: "REPORT_RENAME_FAILED",
      },
      { status: 500 },
    );
  }
}
