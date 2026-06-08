"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { DocumentViewer } from "@/components/documents/document-viewer";
import type { Document } from "@/types";
import { useCallback, useEffect, useState } from "react";

type ViewerResponse = {
  error?: string;
  document: Document;
  downloadUrl: string;
  extractedText: string | null;
};

function OpeningDocument() {
  return (
    <div className="flex h-screen min-h-[620px] items-center justify-center bg-[#18243a]">
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
  const [data, setData] = useState<ViewerResponse | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/documents/${id}`, { cache: "no-store" });
      const result = await response.json() as ViewerResponse;
      if (!response.ok) throw new Error(result.error ?? "Could not open document.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not open document.");
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (error) return <ClientPageError message={error} onRetry={() => void load()} />;
  if (!data) return <OpeningDocument />;
  return <DocumentViewer document={data.document} downloadUrl={data.downloadUrl} extractedText={data.extractedText} pageCount={1} initialPage={initialPage} highlightExcerpt={highlightExcerpt} />;
}
