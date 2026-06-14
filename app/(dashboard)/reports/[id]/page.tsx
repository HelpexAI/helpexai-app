import { DeleteReportButton } from "@/components/reports/delete-report-button";
import { getDocumentRequestContext } from "@/lib/documents/server";
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ReportRecord = {
  id: string;
  title: string;
  content: string | null;
  status: "draft" | "generating" | "completed" | "finalized" | "failed";
  template_slug: string | null;
  generated_document_id: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
};

type SourceRecord = {
  id: string;
  document_id: string;
  created_at: string;
  document:
    | {
        id: string;
        name: string;
        file_type: string;
        status: string;
        created_at: string;
      }
    | {
        id: string;
        name: string;
        file_type: string;
        status: string;
        created_at: string;
      }[]
    | null;
};

function formatDate(value: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalizeTemplateName(slug: string | null) {
  if (!slug) return "Custom report";

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getSourceDocument(source: SourceRecord) {
  if (!source.document) return null;
  return Array.isArray(source.document) ? source.document[0] : source.document;
}

function StatusBadge({ status }: { status: ReportRecord["status"] }) {
  const styles: Record<ReportRecord["status"], string> = {
    draft:
      "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    generating:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    completed:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    finalized:
      "border-theme-border bg-theme-soft text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark",
    failed:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function ReportMarkdownPreview({ content }: { content: string }) {
  return (
    <div className="report-paper-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-6 border-b border-zinc-200 pb-4 text-3xl font-extrabold tracking-tight text-zinc-950 dark:border-zinc-800 dark:text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 text-xl font-bold text-zinc-950 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-5 list-disc space-y-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-5 list-decimal space-y-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 marker:text-theme-primary">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-zinc-950 dark:text-white">
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-5 rounded-xl border-l-4 border-theme-primary bg-theme-soft px-4 py-3 text-sm text-zinc-700 dark:bg-theme-soft-dark dark:text-zinc-300">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-zinc-200 px-4 py-3 text-xs font-bold uppercase tracking-wide dark:border-zinc-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-zinc-100 px-4 py-3 align-top text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-5 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
              {children}
            </pre>
          ),
          hr: () => (
            <hr className="my-8 border-zinc-200 dark:border-zinc-800" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default async function ReportViewPage({ params }: PageProps) {
  const { id } = await params;

  const context = await getDocumentRequestContext();

  if (!context) {
    redirect("/login");
  }

  const { data: report, error: reportError } = await context.service
    .from("reports")
    .select(
      [
        "id",
        "title",
        "content",
        "status",
        "template_slug",
        "generated_document_id",
        "generated_at",
        "created_at",
        "updated_at",
        "metadata",
      ].join(", "),
    )
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (reportError || !report) {
    notFound();
  }

  const typedReport = report as unknown as ReportRecord;

  const { data: sources } = await context.service
    .from("report_sources")
    .select(
      [
        "id",
        "document_id",
        "created_at",
        "document:documents(id, name, file_type, status, created_at)",
      ].join(", "),
    )
    .eq("report_id", typedReport.id)
    .order("created_at", { ascending: true });

  const reportSources = ((sources ?? []) as unknown as SourceRecord[])
    .map(getSourceDocument)
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    file_type: string;
    status: string;
    created_at: string;
  }>;

  const content =
    typedReport.content?.trim() ||
    "This report does not have saved content yet.";

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-theme-primary dark:text-zinc-400"
          >
            <ArrowLeft className="size-4" />
            Back to reports
          </Link>

          <div className="mt-4 flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
              <FileText className="size-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                  {typedReport.title}
                </h1>

                <StatusBadge status={typedReport.status} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span>{normalizeTemplateName(typedReport.template_slug)}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-4" />
                  {formatDate(
                    typedReport.generated_at ?? typedReport.created_at,
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/reports/${typedReport.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white transition hover:bg-theme-primary-hover"
          >
            <Download className="size-4" />
            Download PDF
          </a>
          <DeleteReportButton
            reportId={typedReport.id}
            reportTitle={typedReport.title}
          />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Template
          </div>
          <div className="mt-2 font-bold text-zinc-950 dark:text-white">
            {normalizeTemplateName(typedReport.template_slug)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Sources
          </div>
          <div className="mt-2 font-bold text-zinc-950 dark:text-white">
            {reportSources.length} document
            {reportSources.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Knowledge base
          </div>
          <div className="mt-2 font-bold text-zinc-950 dark:text-white">
            {typedReport.generated_document_id ? "Added" : "Not linked"}
          </div>
        </div>
      </section>

      {reportSources.length ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-theme-primary" />
            <h2 className="font-bold text-zinc-950 dark:text-white">
              Source documents
            </h2>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reportSources.map((document) => (
              <Link
                key={document.id}
                href={`/documents/${document.id}`}
                className="flex items-start gap-3 rounded-xl border border-zinc-200 p-4 transition hover:border-theme-border hover:bg-theme-soft/50 dark:border-zinc-800 dark:hover:border-theme-border-dark dark:hover:bg-theme-soft-dark"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
                  <FileText className="size-4" />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-zinc-950 dark:text-white">
                    {document.name}
                  </div>
                  <div className="mt-1 text-xs uppercase text-zinc-400">
                    {document.file_type}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-bold text-zinc-950 dark:text-white">
            Report preview
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Markdown is stored internally, but shown here as a professional
            report preview.
          </p>
        </div>

        <div className="bg-zinc-100 p-4 dark:bg-zinc-950 sm:p-8">
          <article className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-10">
            <ReportMarkdownPreview content={content} />
          </article>
        </div>
      </section>
    </div>
  );
}
