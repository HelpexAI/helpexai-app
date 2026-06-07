"use client";

import { PlanLimitModal } from "@/components/dashboard/plan-limit-modal";
import { DeleteDocumentModal } from "@/components/documents/delete-document-modal";
import type { CategorySlug, Document as DocumentRecord, DocumentStatus } from "@/types";
import { formatDate, formatFileSize } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileType2,
  Files,
  Loader2,
  MessageSquare,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const filters: Array<{ label: string; value: "all" | DocumentStatus }> = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Processing", value: "processing" },
  { label: "Failed", value: "failed" },
];

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles = {
    ready:
      "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
    processing:
      "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
    uploading:
      "border-blue-200 bg-blue-50 text-[#2b7fff] dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400",
    failed:
      "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function DocumentIcon({ type }: { type: DocumentRecord["file_type"] }) {
  const Icon = type === "docx" ? FileType2 : FileText;
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
        type === "pdf"
          ? "bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400"
          : "bg-blue-50 text-[#2b7fff] dark:bg-blue-950/40 dark:text-blue-400"
      }`}
    >
      <Icon className="size-5" />
    </div>
  );
}

export function DocumentLibrary({
  documents: initialDocuments,
  category,
  maxDocuments,
}: {
  documents: DocumentRecord[];
  category: CategorySlug;
  maxDocuments: number;
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [filter, setFilter] = useState<"all" | DocumentStatus>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentRecord | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [error, setError] = useState("");
  const filtered = useMemo(
    () => documents.filter((document) => filter === "all" || document.status === filter),
    [documents, filter],
  );
  const readyCount = documents.filter((document) => document.status === "ready").length;
  const failedCount = documents.filter((document) => document.status === "failed").length;
  const limitReached = documents.length >= maxDocuments;

  async function deleteDocument(document: DocumentRecord) {
    setDeleting(document.id);
    setError("");

    const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "Could not delete document.");
      setDeleting(null);
      return;
    }

    setDocuments((current) => current.filter((item) => item.id !== document.id));
    setDeleting(null);
    setDocumentToDelete(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">Documents</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage and organize your uploaded documents
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (limitReached) {
              setPlanModalOpen(true);
            } else {
              router.push("/documents/upload");
            }
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2b7fff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
        >
          <Upload className="size-4" />
          Upload Document
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Total Documents", value: documents.length, icon: Files, color: "blue" },
          { label: "Ready", value: readyCount, icon: CheckCircle2, color: "green" },
          { label: "Failed", value: failedCount, icon: XCircle, color: "red" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                color === "green"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : color === "red"
                    ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-blue-50 text-[#2b7fff] dark:bg-blue-950/40 dark:text-blue-400"
              }`}
            >
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
              <p className="text-xl font-bold text-zinc-950 dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        {filters.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm ${
              filter === value
                ? "border-[#2b7fff] font-semibold text-[#2b7fff]"
                : "border-transparent font-medium text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {filtered.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:block">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
              <span>Name</span>
              <span>Category</span>
              <span>Size</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {filtered.map((document, index) => (
              <div
                key={document.id}
                className={`grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-4 px-5 py-4 ${
                  index < filtered.length - 1 ? "border-b border-zinc-200 dark:border-zinc-800" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <DocumentIcon type={document.file_type} />
                  <div className="min-w-0">
                    <Link
                      href={`/documents/${document.id}`}
                      className="block truncate text-sm font-semibold text-zinc-950 transition hover:text-[#2b7fff] dark:text-white dark:hover:text-blue-400"
                    >
                      {document.name}
                    </Link>
                    <p className="mt-0.5 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                      {document.file_type} · {formatDate(document.created_at)}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2b7fff] dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                  Helpex {category === "business" ? "Business" : "Legal"}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatFileSize(document.file_size)}
                </span>
                <StatusBadge status={document.status} />
                <div className="flex items-center gap-2">
                  <Link
                    href="/conversations"
                    className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-[#2b7fff] dark:border-zinc-700 dark:text-zinc-400"
                    title="Start conversation"
                  >
                    <MessageSquare className="size-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDocumentToDelete(document)}
                    disabled={deleting === document.id}
                    className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-red-200 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
                    title="Delete document"
                  >
                    {deleting === document.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((document) => (
              <article
                key={document.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start gap-3">
                  <DocumentIcon type={document.file_type} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/documents/${document.id}`}
                      className="block truncate text-sm font-semibold text-zinc-950 transition hover:text-[#2b7fff] dark:text-white dark:hover:text-blue-400"
                    >
                      {document.name}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(document.file_size)} · {formatDate(document.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={document.status} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <span className="text-xs font-medium text-[#2b7fff]">
                    Helpex {category === "business" ? "Business" : "Legal"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDocumentToDelete(document)}
                    disabled={deleting === document.id}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                  >
                    {deleting === document.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-[#2b7fff] dark:bg-blue-950/40 dark:text-blue-400">
            <Upload className="size-8" />
          </div>
          <h3 className="mt-4 font-bold text-zinc-950 dark:text-white">
            {documents.length === 0 ? "Upload your first document" : "No matching documents"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Supported formats: PDF, DOCX, TXT
          </p>
          <button
            type="button"
            onClick={() => {
              if (limitReached) {
                setPlanModalOpen(true);
              } else {
                router.push("/documents/upload");
              }
            }}
            className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-[#2b7fff] px-4 text-sm font-semibold text-white"
          >
            <Upload className="size-4" />
            Upload Document
          </button>
        </div>
      )}

      {limitReached && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              You&apos;ve reached your plan document limit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPlanModalOpen(true)}
            className="text-left text-sm font-bold text-[#2b7fff]"
          >
            Upgrade to Pro →
          </button>
        </div>
      )}

      <DeleteDocumentModal
        open={documentToDelete !== null}
        documentName={documentToDelete?.name ?? ""}
        deleting={documentToDelete ? deleting === documentToDelete.id : false}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={() => {
          if (documentToDelete) void deleteDocument(documentToDelete);
        }}
      />
      <PlanLimitModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        used={documents.length}
        limit={maxDocuments}
      />
    </div>
  );
}
