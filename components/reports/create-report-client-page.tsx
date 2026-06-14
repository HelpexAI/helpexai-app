"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { fetchJson, queryKeys } from "@/lib/client/query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Check,
  FileText,
  FolderOpen,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
type PlanSlug = "free" | "pro" | "premium";

type ReportTemplateDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  goal: string;
  required_sections: string[] | null;
  writing_style: Record<string, unknown> | null;
  min_plan: PlanSlug;
};

type GeneratedReportPreview = {
  title: string;
  content: string;
  prompt: string;
  template: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    goal: string;
    system_prompt: string;
    user_prompt_template: string;
    required_sections: string[];
    writing_style: Record<string, unknown>;
  };
  template_snapshot: Record<string, unknown>;
  source_type: SourceMode;
  source_document_ids: string[];
  collection_id: string | null;
  tokensUsed: number;
};

type ReportDocumentOption = {
  id: string;
  name: string;
  summary: string | null;
  file_type: string;
  created_at: string;
  collection_id: string | null;
};

type ReportCollectionOption = {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
};

type CreateReportData = {
  template: ReportTemplateDetail;
  documents: ReportDocumentOption[];
  collections: ReportCollectionOption[];
  plan: PlanSlug;
};

type SaveReportResponse = {
  report: {
    id: string;
    title: string;
    status: string;
    generated_document_id: string | null;
    generated_at: string | null;
    created_at: string;
    updated_at: string;
  };
  document: {
    id: string;
    name: string;
    file_path: string;
    status: string;
    chunk_count: number;
    error_message: string | null;
  };
  embedded: boolean;
  warning: string | null;
};

type SourceMode = "documents" | "collection";

async function generateReportPreview(input: {
  templateId: string;
  sourceType: SourceMode;
  documentIds: string[];
  collectionId: string | null;
  customInstructions: string;
}) {
  const response = await fetch("/api/reports/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: input.templateId,
      source_type: input.sourceType,
      document_ids: input.documentIds,
      collection_id: input.collectionId,
      custom_instructions: input.customInstructions,
    }),
  });

  const result = (await response.json()) as
    | GeneratedReportPreview
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in result && result.error
        ? result.error
        : "Could not generate report.",
    );
  }

  return result as GeneratedReportPreview;
}
async function saveGeneratedReport(input: GeneratedReportPreview) {
  const response = await fetch("/api/reports/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      prompt: input.prompt,

      template_id: input.template.id === "custom" ? null : input.template.id,
      template_slug: input.template.slug,
      template_snapshot: input.template_snapshot,

      source_type: input.source_type,
      source_document_ids: input.source_document_ids,
      collection_id: input.collection_id,

      tokens_used: input.tokensUsed,
    }),
  });

  const result = (await response.json()) as
    | SaveReportResponse
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in result && result.error
        ? result.error
        : "Could not save report.",
    );
  }

  return result as SaveReportResponse;
}

function formatDate(value: string) {
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

function DocumentCard({
  document,
  selected,
  onToggle,
}: {
  document: ReportDocumentOption;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-theme-border bg-theme-soft dark:border-theme-border-dark dark:bg-theme-soft-dark"
          : "border-zinc-200 bg-white hover:border-theme-border hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-theme-border-dark dark:hover:bg-zinc-950"
      }`}
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          selected
            ? "bg-theme-primary text-white"
            : "bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"
        }`}
      >
        {selected ? (
          <Check className="size-5" />
        ) : (
          <FileText className="size-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-sm font-bold text-zinc-950 dark:text-white">
            {document.name}
          </h3>

          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {document.file_type}
          </span>
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {document.summary || "No summary available."}
        </p>

        <p className="mt-2 text-[11px] text-zinc-400">
          Added {formatDate(document.created_at)}
        </p>
      </div>
    </button>
  );
}

function CollectionCard({
  collection,
  selected,
  onSelect,
}: {
  collection: ReportCollectionOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-theme-border bg-theme-soft dark:border-theme-border-dark dark:bg-theme-soft-dark"
          : "border-zinc-200 bg-white hover:border-theme-border hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-theme-border-dark dark:hover:bg-zinc-950"
      }`}
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          selected
            ? "bg-theme-primary text-white"
            : "bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"
        }`}
      >
        {selected ? (
          <Check className="size-5" />
        ) : (
          <FolderOpen className="size-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-zinc-950 dark:text-white">
          {collection.name}
        </h3>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {collection.description ||
            "Use all ready documents in this collection."}
        </p>

        <p className="mt-2 text-[11px] text-zinc-400">
          {collection.document_count} ready document
          {collection.document_count === 1 ? "" : "s"}
        </p>
      </div>
    </button>
  );
}

function CreateReportSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="h-10 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="h-96 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-96 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

function MarkdownPaperContent({ content }: { content: string }) {
  return (
    <div className="space-y-5 text-zinc-800 dark:text-zinc-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-5 border-b border-zinc-200 pb-4 text-3xl font-extrabold tracking-tight text-zinc-950 dark:border-zinc-800 dark:text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 text-xl font-bold text-zinc-950 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-5 list-decimal space-y-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => (
            <strong className="font-bold text-zinc-950 dark:text-white">
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="rounded-xl border-l-4 border-theme-primary bg-theme-soft px-4 py-3 text-sm text-zinc-700 dark:bg-theme-soft-dark dark:text-zinc-300">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full border-collapse text-sm">
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
            <th className="border-b border-zinc-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide dark:border-zinc-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-zinc-100 px-4 py-3 text-zinc-700 last:border-b-0 dark:border-zinc-800 dark:text-zinc-300">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function buildPromptPreview({
  template,
  sourceMode,
  selectedDocumentNames,
  selectedCollectionName,
  customInstructions,
}: {
  template: ReportTemplate;
  sourceMode: SourceMode;
  selectedDocumentNames: string[];
  selectedCollectionName: string | null;
  customInstructions: string;
}) {
  const sourceSummary =
    sourceMode === "documents"
      ? selectedDocumentNames.length
        ? selectedDocumentNames.map((name) => `- ${name}`).join("\n")
        : "No documents selected yet."
      : selectedCollectionName
        ? `Collection: ${selectedCollectionName}`
        : "No collection selected yet.";

  const requiredSections = template.required_sections?.length
    ? template.required_sections.map((section) => `- ${section}`).join("\n")
    : "Use the best structure for the user's request.";

  const userPrompt = template.user_prompt_template
    .replaceAll(
      "{{custom_instructions}}",
      customInstructions.trim() || "No extra instructions provided yet.",
    )
    .replaceAll("{{required_sections}}", requiredSections)
    .replaceAll("{{source_summary}}", sourceSummary)
    .replaceAll("{{report_goal}}", template.goal);

  return [
    "SYSTEM MESSAGE:",
    template.system_prompt,
    "",
    "USER MESSAGE:",
    userPrompt,
    "",
    "SELECTED SOURCES:",
    sourceSummary,
    "",
    "SOURCE CONTEXT:",
    "The extracted document text will be inserted here by the backend when you click Generate.",
  ].join("\n");
}

export function CreateReportClientPage() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sourceMode, setSourceMode] = useState<SourceMode>("documents");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedReport, setGeneratedReport] =
    useState<GeneratedReportPreview | null>(null);

  const generateMutation = useMutation({
    mutationFn: generateReportPreview,
    onSuccess: (result) => {
      setGeneratedReport(result);
      scrollToPreviewSection();
    },
  });
  const saveMutation = useMutation({
    mutationFn: saveGeneratedReport,
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reports });

      queryClient.removeQueries({ queryKey: queryKeys.reports });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reportTemplates }),
      ]);

      router.push("/reports");

      window.setTimeout(() => {
        router.refresh();
      }, 50);
    },
  });

  const previewSectionRef = useRef<HTMLDivElement | null>(null);

  function scrollToPreviewSection() {
    window.setTimeout(() => {
      previewSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: [...queryKeys.reportTemplates, "new", templateId],
    queryFn: () =>
      fetchJson<CreateReportData>(
        `/api/reports/new?template=${encodeURIComponent(templateId ?? "")}`,
      ),
    enabled: Boolean(templateId),
  });

  useEffect(() => {
    if (generateMutation.isPending) {
      scrollToPreviewSection();
    }
  }, [generateMutation.isPending]);

  const selectedCount = useMemo(() => {
    if (sourceMode === "collection") {
      const collection = data?.collections.find(
        (item) => item.id === selectedCollectionId,
      );

      return collection?.document_count ?? 0;
    }

    return selectedDocumentIds.length;
  }, [
    data?.collections,
    selectedCollectionId,
    selectedDocumentIds.length,
    sourceMode,
  ]);

  const isCustomTemplate = data?.template.slug === "custom";

  const selectedDocumentNames = useMemo(() => {
    if (!data) return [];

    return data.documents
      .filter((document) => selectedDocumentIds.includes(document.id))
      .map((document) => document.name);
  }, [data, selectedDocumentIds]);

  const selectedCollectionName = useMemo(() => {
    if (!data || !selectedCollectionId) return null;

    return (
      data.collections.find(
        (collection) => collection.id === selectedCollectionId,
      )?.name ?? null
    );
  }, [data, selectedCollectionId]);

  const promptPreview = useMemo(() => {
    if (!data) return "";

    return buildPromptPreview({
      template: data.template,
      sourceMode,
      selectedDocumentNames,
      selectedCollectionName,
      customInstructions,
    });
  }, [
    data,
    sourceMode,
    selectedDocumentNames,
    selectedCollectionName,
    customInstructions,
  ]);

  const hasSelectedSource =
    sourceMode === "documents"
      ? selectedDocumentIds.length > 0
      : Boolean(selectedCollectionId);

  const hasCustomPrompt = customInstructions.trim().length >= 10;

  const canGenerate =
    hasSelectedSource && (!isCustomTemplate || hasCustomPrompt);

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
  }

  if (!templateId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <ClientPageError
          message="No report template was selected."
          onRetry={() => undefined}
        />
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <ClientPageError
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (error) {
    return (
      <ClientPageError
        message="Could not load report creation data."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!data) return <CreateReportSkeleton />;

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
        </div>

        {isFetching && (
          <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <Loader2 className="size-3.5 animate-spin" />
            Loading
          </div>
        )}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-theme-primary">
              Selected template
            </div>

            <h2 className="mt-2 text-xl font-bold text-zinc-950 dark:text-white">
              {data.template.name}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {data.template.description ?? data.template.goal}
            </p>
          </div>

          <span className="w-fit rounded-full border border-theme-border bg-theme-soft px-3 py-1 text-xs font-bold uppercase text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark">
            {data.template.min_plan}
          </span>
        </div>

        {data.template.required_sections?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {data.template.required_sections.map((section) => (
              <span
                key={section}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {section}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.75fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="font-bold text-zinc-950 dark:text-white">
              Select report source
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Select individual documents or use a full collection.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setSourceMode("documents")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  sourceMode === "documents"
                    ? "bg-white text-theme-primary shadow-sm dark:bg-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                Documents
              </button>

              <button
                type="button"
                onClick={() => setSourceMode("collection")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  sourceMode === "collection"
                    ? "bg-white text-theme-primary shadow-sm dark:bg-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                Collection
              </button>
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto p-5">
            {sourceMode === "documents" ? (
              data.documents.length ? (
                <div className="grid gap-3">
                  {data.documents.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      selected={selectedDocumentIds.includes(document.id)}
                      onToggle={() => toggleDocument(document.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  No ready documents found. Upload and process documents first.
                </div>
              )
            ) : data.collections.length ? (
              <div className="grid gap-3">
                {data.collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    selected={selectedCollectionId === collection.id}
                    onSelect={() => setSelectedCollectionId(collection.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                No collections with ready documents found.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-bold text-zinc-950 dark:text-white">
              {isCustomTemplate
                ? "Write your custom report prompt"
                : "Additional instructions"}
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {isCustomTemplate
                ? "Describe exactly what report you want HelpexAI to generate from the selected source."
                : "Optional instructions to guide the report generation."}
            </p>

            <textarea
              value={customInstructions}
              onChange={(event) => setCustomInstructions(event.target.value)}
              rows={8}
              placeholder={
                isCustomTemplate
                  ? "Example: Create a detailed business proposal with executive summary, key findings, risks, recommendations, and next steps..."
                  : "Example: Focus on risks, summarize in simple language, include recommendations..."
              }
              className="mt-4 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
              <h2 className="font-bold text-zinc-950 dark:text-white">
                Prompt preview
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                This is the instruction HelpexAI will use when you click
                Generate. Source text is inserted securely by the backend.
              </p>
            </div>

            <div className="p-5">
              <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                {promptPreview}
              </pre>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-bold text-zinc-950 dark:text-white">
              Generation summary
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500 dark:text-zinc-400">Source</span>
                <strong className="capitalize text-zinc-950 dark:text-white">
                  {sourceMode}
                </strong>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Selected documents
                </span>
                <strong className="text-zinc-950 dark:text-white">
                  {selectedCount}
                </strong>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Template
                </span>
                <strong className="truncate text-zinc-950 dark:text-white">
                  {data.template.name}
                </strong>
              </div>
            </div>

            <button
              type="button"
              disabled={!canGenerate || generateMutation.isPending}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-theme-primary px-4 text-sm font-bold text-white transition hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                setGeneratedReport(null);

                generateMutation.mutate({
                  templateId: data.template.id,
                  sourceType: sourceMode,
                  documentIds:
                    sourceMode === "documents" ? selectedDocumentIds : [],
                  collectionId:
                    sourceMode === "collection" ? selectedCollectionId : null,
                  customInstructions,
                });

                scrollToPreviewSection();
              }}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  Generate report
                </>
              )}
            </button>
            {generateMutation.error instanceof Error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {generateMutation.error.message}
              </p>
            )}

            {!canGenerate && (
              <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Select at least one document or collection before generating.
              </p>
            )}
          </section>
        </aside>
      </div>
      <div ref={previewSectionRef} className="scroll-mt-24 space-y-6">
        {generateMutation.isPending && (
          <section className="overflow-hidden rounded-2xl border border-theme-border bg-theme-soft shadow-sm dark:border-theme-border-dark dark:bg-theme-soft-dark">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-theme-primary text-white">
                  <Loader2 className="size-6 animate-spin" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                    Generating your report
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    HelpexAI is reading the selected knowledge, applying the
                    selected template, and preparing a professional markdown
                    report preview.
                  </p>

                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-xl bg-white/80 p-4 dark:bg-zinc-950/50">
                      <strong className="block text-zinc-950 dark:text-white">
                        1. Reading sources
                      </strong>
                      <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        Extracting relevant document context
                      </span>
                    </div>

                    <div className="rounded-xl bg-white/80 p-4 dark:bg-zinc-950/50">
                      <strong className="block text-zinc-950 dark:text-white">
                        2. Applying template
                      </strong>
                      <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        Structuring the report professionally
                      </span>
                    </div>

                    <div className="rounded-xl bg-white/80 p-4 dark:bg-zinc-950/50">
                      <strong className="block text-zinc-950 dark:text-white">
                        3. Preparing preview
                      </strong>
                      <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        Creating editable report content
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {generatedReport && (
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-theme-primary">
                  Generated preview
                </div>

                <h2 className="mt-1 text-xl font-bold text-zinc-950 dark:text-white">
                  {generatedReport.title}
                </h2>

                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Review the report before saving it to your knowledge base.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGeneratedReport(null)}
                  className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-950"
                >
                  Discard
                </button>

                <button
                  type="button"
                  disabled={saveMutation.isPending}
                  onClick={() => {
                    if (!generatedReport) return;
                    saveMutation.mutate(generatedReport);
                  }}
                  className="flex h-10 items-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white transition hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save report"
                  )}
                </button>
              </div>
            </div>
            {saveMutation.error instanceof Error && (
              <div className="mx-5 mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {saveMutation.error.message}
              </div>
            )}

            <div className="bg-zinc-100 p-4 dark:bg-zinc-950 sm:p-8">
              <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-10">
                <MarkdownPaperContent content={generatedReport.content} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
