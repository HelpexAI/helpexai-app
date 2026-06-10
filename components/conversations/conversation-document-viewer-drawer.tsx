"use client";

import { fetchJson, queryKeys } from "@/lib/client/query";
import type { Document } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2, X } from "lucide-react";
import Image from "next/image";

type ViewerResponse = {
  document: Document;
  downloadUrl: string;
  extractedText: string | null;
};

export function ConversationDocumentViewerDrawer({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const { data, error } = useQuery({
    queryKey: queryKeys.document(documentId),
    queryFn: () => fetchJson<ViewerResponse>(`/api/documents/${documentId}`),
  });

  return (
    <>
      <button type="button" aria-label="Close document preview" onClick={onClose} className="fixed inset-0 z-40 bg-black/30" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-zinc-200 bg-slate-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="min-w-0"><p className="truncate font-bold">{data?.document.name ?? "Document preview"}</p><p className="text-xs text-zinc-500 dark:text-zinc-400">{data?.document.collection?.name ?? "Loading document..."}</p></div>
          <div className="flex items-center gap-2">
            {data && <a href={data.downloadUrl} className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-theme-primary dark:border-zinc-700" aria-label="Download document"><Download className="size-4" /></a>}
            <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700" aria-label="Close document preview"><X className="size-4" /></button>
          </div>
        </header>
        <div className="theme-scrollbar min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {!data && !error && <div className="flex h-full items-center justify-center"><Loader2 className="size-7 animate-spin text-theme-primary" /></div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error.message}</div>}
          {data?.document.file_type === "pdf" && <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700"><Image src={`/api/documents/${documentId}/pages/1`} alt={`${data.document.name}, first page`} width={900} height={1200} unoptimized className="h-auto w-full" /></div>}
          {data && data.document.file_type !== "pdf" && <article className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"><div className="mb-5 flex items-center gap-2 border-b border-zinc-200 pb-4 font-bold dark:border-zinc-800"><FileText className="size-5 text-theme-primary" />{data.document.name}</div>{data.extractedText || "No readable text was found."}</article>}
        </div>
      </aside>
    </>
  );
}
