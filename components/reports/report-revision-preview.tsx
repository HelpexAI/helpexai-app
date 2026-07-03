"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { fetchJson, queryKeys } from "@/lib/client/query";
import type { ReportDiffLine } from "@/lib/reports/diff";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MousePointer2,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ReportVersion = {
  id: string;
  report_id: string;
  version_number: number;
  title: string;
  content_markdown: string;
  instruction: string | null;
  selected_text: string | null;
  tone: "simple" | "professional" | "formal" | null;
  length: "short" | "standard" | "detailed" | null;
  diff: ReportDiffLine[] | null;
  change_summary: string | null;
  created_at: string;
};

type PreviewResponse = {
  report: {
    id: string;
    title: string;
    content: string;
    status: "draft" | "generating" | "completed" | "finalized" | "failed";
    template_id: string | null;
    template_slug: string | null;
    current_version_id: string | null;
    generated_document_id: string | null;
  };
  versions: ReportVersion[];
  sources: Array<{ id: string; name?: string }>;
};

type RevisionResponse = {
  reportId: string;
  newVersionId: string;
  versionNumber: number;
  title: string;
  contentMarkdown: string;
  diff: ReportDiffLine[];
  changeSummary: string;
};

function ReportMarkdown({ content }: { content: string }) {
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
            <div className="my-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
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
          hr: () => <hr className="my-8 border-zinc-200 dark:border-zinc-800" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function DiffPreview({ lines }: { lines: ReportDiffLine[] }) {
  const groups = lines.reduce<Array<{ type: ReportDiffLine["type"]; text: string[] }>>(
    (result, line) => {
      const last = result[result.length - 1];
      if (last?.type === line.type) last.text.push(line.text);
      else result.push({ type: line.type, text: [line.text] });
      return result;
    },
    [],
  );

  return (
    <div className="space-y-2">
      {groups.map((group, index) => (
        <div
          key={`${index}-${group.type}`}
          className={
            group.type === "added"
              ? "rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-4 py-1 dark:bg-emerald-950/35"
              : group.type === "removed"
                ? "rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-1 opacity-75 line-through dark:bg-red-950/35"
                : ""
          }
        >
          <ReportMarkdown content={group.text.join("\n")} />
        </div>
      ))}
    </div>
  );
}

async function reviseReport(reportId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/reports/${reportId}/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => null)) as RevisionResponse & { error?: string };
  if (!response.ok) throw new Error(result?.error ?? "Could not improve report.");
  return result;
}

async function finalizeReport(
  reportId: string,
  versionId: string,
  title: string,
) {
  const response = await fetch(`/api/reports/${reportId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionId, title }),
  });
  const result = (await response.json().catch(() => null)) as { error?: string };
  if (!response.ok) throw new Error(result?.error ?? "Could not finalize report.");
  return result;
}

export function ReportRevisionPreview({ reportId }: { reportId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [title, setTitle] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [tone, setTone] = useState<"simple" | "professional" | "formal">("professional");
  const [length, setLength] = useState<"short" | "standard" | "detailed">("standard");
  const [showChanges, setShowChanges] = useState(true);

  const query = useQuery({
    queryKey: [...queryKeys.report(reportId), "preview"],
    queryFn: () => fetchJson<PreviewResponse>(`/api/reports/${reportId}/preview`),
  });

  useEffect(() => {
    if (!query.data) return;
    setSelectedVersionId((current) => current || query.data.report.current_version_id || query.data.versions[0]?.id || "");
    setTitle((current) => current || query.data.report.title);
  }, [query.data]);

  const selectedVersion = useMemo(
    () => query.data?.versions.find((version) => version.id === selectedVersionId) ?? query.data?.versions[0],
    [query.data, selectedVersionId],
  );

  const revision = useMutation({
    mutationFn: () =>
      reviseReport(reportId, {
        currentVersionId: selectedVersion?.id,
        instruction,
        selectedText: selectedText || undefined,
        title,
        tone,
        length,
      }),
    onSuccess: async (result) => {
      setInstruction("");
      setSelectedText("");
      setPanelOpen(false);
      setShowChanges(true);
      setSelectedVersionId(result.newVersionId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
    },
  });

  const finalize = useMutation({
    mutationFn: () =>
      finalizeReport(
        reportId,
        selectedVersion?.id ?? "",
        title.trim(),
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
      router.push(`/reports/${reportId}`);
      router.refresh();
    },
  });

  function captureSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text || !reportRef.current || !selection?.rangeCount) return;
    const container = selection.getRangeAt(0).commonAncestorContainer;
    if (!reportRef.current.contains(container)) return;
    setSelectedText(text.slice(0, 12_000));
  }

  if (query.error instanceof Error) {
    return <ClientPageError message={query.error.message} onRetry={() => void query.refetch()} />;
  }
  if (!query.data || !selectedVersion) {
    return <div className="m-4 h-[70vh] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 sm:m-8" />;
  }

  const finalized = query.data.report.status === "finalized";
  const previousVersion = query.data.versions.find(
    (version) => version.version_number === selectedVersion.version_number - 1,
  );

  return (
    <div className="min-h-full bg-zinc-100 p-4 dark:bg-zinc-950 sm:p-6 lg:p-8">
      <div className={`mx-auto space-y-5 transition-[max-width] ${panelOpen ? "max-w-[1600px]" : "max-w-6xl"}`}>
        <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <Link href={query.data.report.template_id ? `/reports/new?template=${query.data.report.template_id}` : "/reports/templates"} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-theme-primary">
                <ArrowLeft className="size-4" /> Back to prompt
              </Link>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={finalized}
                maxLength={160}
                className="mt-3 block w-full border-0 bg-transparent p-0 text-2xl font-bold tracking-tight text-zinc-950 outline-none disabled:opacity-80 dark:text-white"
                aria-label="Report title"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
                <span className="rounded-full bg-theme-soft px-2.5 py-1 text-theme-primary dark:bg-theme-soft-dark">
                  {query.data.report.template_slug?.replaceAll("-", " ") ?? "Custom report"}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 capitalize dark:bg-zinc-800">{query.data.report.status}</span>
                <span>{query.data.sources.length} source{query.data.sources.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative inline-flex h-10 min-w-36 items-center">
                <span className="sr-only">Report version</span>
                <select
                  value={selectedVersion.id}
                  onChange={(event) => {
                    const version = query.data.versions.find((item) => item.id === event.target.value);
                    setSelectedVersionId(event.target.value);
                    if (version) setTitle(version.title);
                    setShowChanges(true);
                  }}
                  className="h-full w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-sm font-semibold text-zinc-700 shadow-sm outline-none transition hover:border-theme-border focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-theme-border-dark"
                >
                  {query.data.versions.map((version) => (
                    <option key={version.id} value={version.id}>Version {version.version_number}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 size-4 text-zinc-400" />
              </label>
              {!finalized && (
                <button onClick={() => setPanelOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-theme-border bg-theme-soft px-4 text-sm font-semibold text-theme-primary dark:bg-theme-soft-dark">
                  <Wand2 className="size-4" /> Improve Report
                </button>
              )}
              <button
                disabled={finalize.isPending || finalized}
                onClick={() => finalize.mutate()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {finalize.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {finalized ? "Finalized" : "Save & Finalize"}
              </button>
            </div>
          </div>
        </header>

        {selectedText && !panelOpen && !finalized && (
          <div className="flex flex-col gap-3 rounded-xl border border-theme-border bg-theme-soft px-4 py-3 text-sm dark:bg-theme-soft-dark sm:flex-row sm:items-center sm:justify-between">
            <span className="line-clamp-1 font-medium">Selected: “{selectedText}”</span>
            <button onClick={() => setPanelOpen(true)} className="inline-flex items-center gap-1 font-bold text-theme-primary">
              Add to improvement <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {selectedVersion.version_number > 1 && (
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <strong>Version {selectedVersion.version_number}</strong>
              <span className="ml-2 text-zinc-500">{selectedVersion.change_summary}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {previousVersion && (
                <button
                  onClick={() => {
                    setSelectedVersionId(previousVersion.id);
                    setTitle(previousVersion.title);
                    setShowChanges(false);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-zinc-500 hover:text-theme-primary"
                >
                  <RotateCcw className="size-3.5" /> View previous
                </button>
              )}
              {!finalized && (
                <button onClick={() => setPanelOpen(true)} className="font-semibold text-theme-primary">
                  Improve again
                </button>
              )}
              <label className="group inline-flex cursor-pointer select-none items-center gap-2 font-semibold text-zinc-600 transition hover:text-theme-primary dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={showChanges}
                  onChange={(event) => setShowChanges(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="flex size-5 items-center justify-center rounded-md border border-zinc-300 bg-white text-white shadow-sm transition group-hover:border-theme-border peer-checked:border-theme-primary peer-checked:bg-theme-primary peer-focus-visible:ring-2 peer-focus-visible:ring-theme-primary/25 peer-checked:[&>svg]:opacity-100 dark:border-zinc-700 dark:bg-zinc-950 dark:group-hover:border-theme-border-dark">
                  <Check className="size-3.5 opacity-0 transition" />
                </span>
                Show changes
              </label>
            </div>
          </div>
        )}

        {(revision.error instanceof Error || finalize.error instanceof Error) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {(revision.error as Error | null)?.message ?? (finalize.error as Error | null)?.message}
          </div>
        )}

        <div className={`grid items-start gap-5 ${panelOpen ? "xl:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
          <div className="min-w-0">
            {panelOpen && (
              <div className="mb-3 flex items-start gap-3 rounded-xl border border-theme-border bg-theme-soft px-4 py-3 text-sm dark:bg-theme-soft-dark">
                <MousePointer2 className="mt-0.5 size-4 shrink-0 text-theme-primary" />
                <div>
                  <strong className="text-theme-primary">Select any report text to improve it</strong>
                  <p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                    Highlight a sentence or section in the preview. It will be added to the improvement panel while the report stays fully interactive.
                  </p>
                </div>
              </div>
            )}
            <div
              ref={reportRef}
              onMouseUp={captureSelection}
              className="mx-auto min-h-[70vh] max-w-4xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-10"
            >
              {showChanges && selectedVersion.diff?.length ? (
                <DiffPreview lines={selectedVersion.diff} />
              ) : (
                <ReportMarkdown content={selectedVersion.content_markdown} />
              )}
            </div>
          </div>

          {panelOpen && (
            <aside className="sticky top-4 flex max-h-[calc(100vh-2rem)] min-h-[650px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
                <div><h2 className="font-bold">Improve Report</h2><p className="text-sm text-zinc-500">Create a new clean report version.</p></div>
                <button onClick={() => setPanelOpen(false)} disabled={revision.isPending} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="size-4" /></button>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div className="rounded-xl border border-theme-border bg-theme-soft p-3 text-xs leading-5 text-zinc-600 dark:bg-theme-soft-dark dark:text-zinc-300">
                  <div className="flex items-center gap-2 font-bold text-theme-primary"><MousePointer2 className="size-3.5" /> Focus a specific section</div>
                  Select text directly from the report preview on the left. Your selection will appear here automatically.
                </div>
                {selectedText && (
                  <div className="rounded-xl border border-theme-border bg-theme-soft p-3 text-sm dark:bg-theme-soft-dark">
                    <div className="flex justify-between gap-3"><strong className="text-theme-primary">Selected text</strong><button onClick={() => setSelectedText("")}><X className="size-3.5" /></button></div>
                    <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-zinc-600 dark:text-zinc-300">{selectedText}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold">Improvement instruction</label>
                  <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={7} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-theme-primary dark:border-zinc-700 dark:bg-zinc-950" placeholder="Explain what should be clearer, expanded, shortened, or reorganized..." />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Make it clearer", "Add practical recommendations", "Shorten and simplify", "Improve the executive summary"].map((action) => (
                    <button key={action} onClick={() => setInstruction(action)} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold hover:border-theme-border hover:text-theme-primary dark:border-zinc-700">{action}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-semibold">Tone<select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)} className="mt-2 h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-950"><option value="simple">Simple</option><option value="professional">Professional</option><option value="formal">Formal</option></select></label>
                  <label className="text-sm font-semibold">Length<select value={length} onChange={(event) => setLength(event.target.value as typeof length)} className="mt-2 h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-950"><option value="short">Short</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select></label>
                </div>
                {revision.error instanceof Error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{revision.error.message}</p>}
              </div>
              <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
                <button disabled={revision.isPending || instruction.trim().length < 3} onClick={() => revision.mutate()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-theme-primary font-semibold text-white disabled:opacity-60">
                  {revision.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {revision.isPending ? "Improving report..." : "Generate improved version"}
                </button>
                <button onClick={() => { setInstruction(""); setSelectedText(""); }} className="mt-2 inline-flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-zinc-500"><RotateCcw className="size-4" /> Clear changes</button>
              </div>
            </aside>
          )}
        </div>
      </div>

    </div>
  );
}
