"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { SectionLoading } from "@/components/dashboard/section-loading";
import { DocumentLibrary } from "@/components/documents/document-library";
import type { CategorySlug, Document } from "@/types";
import { fetchJson, queryKeys } from "@/lib/client/query";
import { useQuery } from "@tanstack/react-query";

type DocumentsResponse = {
  error?: string;
  documents: Document[];
  category: CategorySlug;
  productName: string;
  maxDocuments: number;
  requiresResolution: boolean;
};

export function DocumentsClientPage() {
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => fetchJson<DocumentsResponse>("/api/documents"),
  });
  if (error) return <ClientPageError message={error.message} onRetry={() => void refetch()} />;
  if (!data) return <SectionLoading label="Loading documents..." />;
  return <DocumentLibrary documents={data.documents} productName={data.productName} maxDocuments={data.maxDocuments} requiresResolution={data.requiresResolution} />;
}
