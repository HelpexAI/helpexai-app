"use client";

import { PlanLimitModal } from "@/components/dashboard/plan-limit-modal";
import { DeleteDocumentModal } from "@/components/documents/delete-document-modal";
import { ResolveDocumentLimitModal } from "@/components/documents/resolve-document-limit-modal";
import { useDocumentsWorkspace } from "@/components/documents/documents-workspace-shell";
import {
  fetchJson,
  invalidateWorkspaceQueries,
  queryKeys,
} from "@/lib/client/query";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { Document as DocumentRecord, DocumentStatus } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  FileType2,
  Folders,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles = {
    ready:
      "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
    processing:
      "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
    uploading:
      "border-theme-border bg-theme-soft text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark",
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
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${type === "pdf" ? "bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400" : "bg-theme-soft text-theme-primary dark:bg-theme-soft-dark"}`}
    >
      <Icon className="size-5" />
    </div>
  );
}

function documentTags(document: DocumentRecord) {
  return (
    document.document_tag_assignments?.map((assignment) => assignment.tag) ?? []
  );
}

export function DocumentLibrary() {
  const {
    documents: initialDocuments,
    activeCollection,
    maxDocuments,
    requiresResolution,
  } = useDocumentsWorkspace();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [documents, setDocuments] = useState(initialDocuments);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentRecord | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [error, setError] = useState("");
  const filtered = useMemo(
    () =>
      documents.filter(
        (document) => document.collection_id === activeCollection.id,
      ),
    [activeCollection.id, documents],
  );
  const limitReached = documents.length >= maxDocuments;

  useEffect(() => setDocuments(initialDocuments), [initialDocuments]);

  function prefetchDocument(id: string) {
    router.prefetch(`/documents/${id}`);
    void queryClient.prefetchQuery({
      queryKey: queryKeys.document(id),
      queryFn: () => fetchJson(`/api/documents/${id}`),
    });
  }

  async function deleteDocument(document: DocumentRecord) {
    setDeleting(document.id);
    setError("");
    const response = await fetch(`/api/documents/${document.id}`, {
      method: "DELETE",
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not delete document.");
      setDeleting(null);
      return;
    }
    setDocuments((current) =>
      current.filter((item) => item.id !== document.id),
    );
    queryClient.setQueryData<{ documents: DocumentRecord[] }>(
      queryKeys.documents,
      (cached) =>
        cached
          ? {
              ...cached,
              documents: cached.documents.filter(
                (item) => item.id !== document.id,
              ),
            }
          : cached,
    );
    queryClient.removeQueries({ queryKey: queryKeys.document(document.id) });
    await invalidateWorkspaceQueries(queryClient);
    setDeleting(null);
    setDocumentToDelete(null);
  }

  function uploadToActiveCollection() {
    if (limitReached) return setPlanModalOpen(true);
    router.push(`/documents/upload?collection=${activeCollection.id}`);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Folders className="size-5 text-theme-primary" />
              <h2 className="text-xl font-bold">{activeCollection.name}</h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {activeCollection.description}
            </p>
          </div>
          <button
            type="button"
            onClick={uploadToActiveCollection}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white"
          >
            <Upload className="size-4" />
            Upload Document
          </button>
        </div>

        {error && (
          <p className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {filtered.length ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((document) => (
              <article
                key={document.id}
                className="flex flex-col gap-3 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <DocumentIcon type={document.file_type} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/documents/${document.id}?collection=${document.collection_id}`}
                      prefetch
                      onMouseEnter={() => prefetchDocument(document.id)}
                      className="block truncate text-sm font-semibold text-zinc-950 hover:text-theme-primary dark:text-white"
                    >
                      {document.name}
                    </Link>
                    <p className="mt-1 text-xs uppercase text-zinc-500">
                      {document.file_type} ·{" "}
                      {formatFileSize(document.file_size)} ·{" "}
                      {formatDate(document.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={document.status} />
                  <button
                    type="button"
                    onClick={() => setDocumentToDelete(document)}
                    disabled={deleting === document.id}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-red-200 hover:text-red-600 dark:border-zinc-700"
                  >
                    {deleting === document.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-12">
                  {documentTags(document).map((tag) => (
                    <span
                      key={tag.id}
                      title={tag.description}
                      className="rounded-full border border-theme-border bg-theme-soft px-2.5 py-1 text-[11px] font-semibold text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
              <Upload className="size-8" />
            </div>
            <h3 className="mt-4 font-bold">
              No documents in {activeCollection.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Upload a PDF, DOCX, or TXT file and attach relevant tags.
            </p>
            <button
              type="button"
              onClick={uploadToActiveCollection}
              className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white"
            >
              <Upload className="size-4" />
              Upload Document
            </button>
          </div>
        )}
      </section>

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
      {requiresResolution && (
        <ResolveDocumentLimitModal documents={documents} limit={maxDocuments} />
      )}
    </div>
  );
}
