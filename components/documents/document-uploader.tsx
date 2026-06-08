"use client";

import { PlanLimitModal } from "@/components/dashboard/plan-limit-modal";
import { MAX_FILES_PER_UPLOAD, MAX_FILE_SIZE } from "@/lib/validations/schemas";
import { formatFileSize } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  FileText,
  FolderOpen,
  Loader2,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { queryKeys } from "@/lib/client/query";
import { useQueryClient } from "@tanstack/react-query";

type UploadStatus = "selected" | "uploading" | "processing" | "embedding" | "ready" | "failed";

interface UploadItem {
  key: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

function isAccepted(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ["pdf", "docx", "txt"].includes(extension ?? "") && file.size <= MAX_FILE_SIZE;
}

function statusLabel(status: UploadStatus) {
  if (status === "selected") return "Ready to upload";
  if (status === "embedding") return "Embedding";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function DocumentUploader() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [planLimit, setPlanLimit] = useState<{ used: number; limit: number } | null>(null);

  function addFiles(files: File[]) {
    setError("");
    const accepted = files.filter(isAccepted);
    if (accepted.length !== files.length) {
      setError("Only PDF, DOCX, and TXT files up to 10MB are supported.");
    }

    setItems((current) => {
      const existing = new Set(current.map((item) => `${item.file.name}-${item.file.size}`));
      const additions = accepted
        .filter((file) => !existing.has(`${file.name}-${file.size}`))
        .slice(0, Math.max(0, MAX_FILES_PER_UPLOAD - current.length))
        .map((file) => ({
          key: crypto.randomUUID(),
          file,
          status: "selected" as const,
          progress: 0,
        }));

      if (current.length + accepted.length > MAX_FILES_PER_UPLOAD) {
        setError(`You can upload a maximum of ${MAX_FILES_PER_UPLOAD} files at once.`);
      }
      return [...current, ...additions];
    });
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function updateItem(key: string, update: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...update } : item)),
    );
  }

  async function uploadFiles() {
    const pending = items.filter((item) => item.status === "selected" || item.status === "failed");
    if (pending.length === 0) return;

    setUploading(true);
    setError("");
    pending.forEach((item) => updateItem(item.key, { status: "uploading", progress: 20, error: undefined }));

    const formData = new FormData();
    pending.forEach((item) => formData.append("files", item.file));
    const response = await fetch("/api/documents", { method: "POST", body: formData });
    const body = await response.json();

    if (!response.ok) {
      if (body.code === "DOCUMENT_LIMIT_REACHED") {
        setPlanLimit({ used: body.used ?? 0, limit: body.limit ?? 1 });
      }
      pending.forEach((item) =>
        updateItem(item.key, { status: "failed", progress: 0, error: body.error }),
      );
      setError(body.error ?? "Upload failed.");
      setUploading(false);
      return;
    }

    const uploadedDocuments = body.documents as Array<{ id: string }>;
    await Promise.all(
      pending.map(async (item, index) => {
        updateItem(item.key, { status: "processing", progress: 65 });
        await new Promise((resolve) => setTimeout(resolve, 250));
        updateItem(item.key, { status: "embedding", progress: 82 });

        try {
          const processResponse = await fetch(`/api/documents/${uploadedDocuments[index].id}/process`, { method: "POST" });
          const processResult = await processResponse.json();
          if (!processResponse.ok) throw new Error(processResult.error ?? "Document processing failed.");
          updateItem(item.key, {
            status: "ready",
            progress: 100,
            error: processResult.embedded ? undefined : processResult.warning ?? "Semantic indexing is pending.",
          });
        } catch {
          updateItem(item.key, { status: "ready", progress: 100, error: "Document stored successfully, but semantic indexing could not be confirmed." });
        }
      }),
    );

    setUploading(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations }),
    ]);
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Link
          href="/documents"
          className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white sm:text-2xl">
            Upload Documents
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
            Add documents securely to your workspace
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        multiple
        onChange={handleInput}
        className="hidden"
      />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed bg-white p-8 text-center transition dark:bg-zinc-900 sm:p-12 ${
          dragging
            ? "border-theme-primary bg-theme-soft dark:bg-theme-soft-dark"
            : "border-zinc-300 hover:border-theme-primary/60 dark:border-zinc-700"
        }`}
      >
        <CloudUpload className="size-14 text-theme-primary" />
        <div>
          <h3 className="text-xl font-bold text-zinc-950 dark:text-white">Drop files here</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">or click to browse</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Up to 5 files · Max 10MB each
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {["PDF", "DOCX", "TXT"].map((type) => (
            <span
              key={type}
              className="rounded-full border border-theme-border bg-theme-soft px-3 py-1 text-xs font-medium text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark"
            >
              {type}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="mt-1 flex h-10 items-center gap-2 rounded-full bg-theme-primary px-6 text-sm font-semibold text-white"
        >
          <FolderOpen className="size-4" />
          Browse Files
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-950 dark:text-white">Uploading Files</h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {items.length}/{MAX_FILES_PER_UPLOAD} files
            </span>
          </div>
          <div className="grid gap-2">
            {items.map((item) => (
              <article
                key={item.key}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:gap-4 sm:px-5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                      {item.file.name}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(item.file.size)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === "failed" ? "bg-red-500" : "bg-theme-primary"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:flex ${
                      item.status === "ready"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : item.status === "failed"
                          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                          : "border-theme-border bg-theme-soft text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark"
                    }`}
                  >
                    {item.status === "ready" ? (
                      <CheckCircle2 className="size-3" />
                    ) : item.status === "failed" ? (
                      <XCircle className="size-3" />
                    ) : item.status !== "selected" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                    {statusLabel(item.status)}
                  </span>
                  {!uploading && item.status === "selected" && (
                    <button
                      type="button"
                      onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}
                      className="flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {items.every((item) => item.status === "ready") ? (
              <Link
                href="/documents"
                className="flex h-11 items-center justify-center rounded-lg bg-theme-primary px-5 text-sm font-semibold text-white"
              >
                View Documents
              </Link>
            ) : (
              <button
                type="button"
                onClick={uploadFiles}
                disabled={uploading || !items.some((item) => item.status === "selected" || item.status === "failed")}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-theme-primary px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading && <Loader2 className="size-4 animate-spin" />}
                Upload {items.filter((item) => item.status === "selected" || item.status === "failed").length} File(s)
              </button>
            )}
          </div>
        </section>
      )}

      <div className="flex items-center justify-center gap-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">
        <ShieldCheck className="size-4 text-theme-primary" />
        Documents encrypted and stored securely
      </div>

      <PlanLimitModal
        open={planLimit !== null}
        onClose={() => setPlanLimit(null)}
        used={planLimit?.used ?? 0}
        limit={planLimit?.limit ?? 1}
      />
    </div>
  );
}
