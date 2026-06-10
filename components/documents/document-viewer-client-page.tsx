"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { DocumentViewer } from "@/components/documents/document-viewer";
import type { Document } from "@/types";
import { fetchJson, queryKeys } from "@/lib/client/query";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type ViewerResponse = {
  error?: string;
  document: Document;
  downloadUrl: string;
  extractedText: string | null;
};

function OpeningDocument() {
  return (
    <div className="flex h-full min-h-72 items-center justify-center bg-[#18243a]">
      <div className="text-center text-white/60">
        <div className="mx-auto size-9 animate-spin rounded-full border-2 border-white/20 border-t-theme-primary" />
        <p className="mt-3 text-sm font-medium">Opening document...</p>
      </div>
    </div>
  );
}

export function DocumentViewerClientPage({
  id,
  initialPage,
  highlightExcerpt,
}: {
  id: string;
  initialPage: number;
  highlightExcerpt: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.document(id),
    queryFn: () => fetchJson<ViewerResponse>(`/api/documents/${id}`),
  });
  useEffect(() => {
    if (!data?.document.collection_id || searchParams.get("collection") === data.document.collection_id) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("collection", data.document.collection_id);
    router.replace(`/documents/${id}?${next.toString()}`, { scroll: false });
  }, [data?.document.collection_id, id, router, searchParams]);
  if (error) return <ClientPageError message={error.message} onRetry={() => void refetch()} />;
  if (!data) return <OpeningDocument />;
  return <DocumentViewer document={data.document} downloadUrl={data.downloadUrl} extractedText={data.extractedText} pageCount={1} initialPage={initialPage} highlightExcerpt={highlightExcerpt} />;
}
