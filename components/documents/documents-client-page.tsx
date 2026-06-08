"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { SectionLoading } from "@/components/dashboard/section-loading";
import { DocumentLibrary } from "@/components/documents/document-library";
import type { CategorySlug, Document } from "@/types";
import { useCallback, useEffect, useState } from "react";

type DocumentsResponse = {
  error?: string;
  documents: Document[];
  category: CategorySlug;
  maxDocuments: number;
  requiresResolution: boolean;
};

export function DocumentsClientPage() {
  const [data, setData] = useState<DocumentsResponse | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      const result = await response.json() as DocumentsResponse;
      if (!response.ok) throw new Error(result.error ?? "Could not load documents.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load documents.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (error) return <ClientPageError message={error} onRetry={() => void load()} />;
  if (!data) return <SectionLoading label="Loading documents..." />;
  return <DocumentLibrary documents={data.documents} category={data.category} maxDocuments={data.maxDocuments} requiresResolution={data.requiresResolution} />;
}
