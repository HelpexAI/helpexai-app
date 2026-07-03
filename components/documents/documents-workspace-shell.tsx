"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { DocumentsContentSkeleton } from "@/components/documents/documents-skeleton";
import { fetchJson, queryKeys } from "@/lib/client/query";
import { useWorkspaceReference } from "@/lib/client/workspace-reference";
import type {
  CategorySlug,
  Document,
  DocumentCollection,
  DocumentTag,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Folder, Folders } from "lucide-react";
import * as Icons from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";

export type DocumentsResponse = {
  error?: string;
  documents: Document[];
  category: CategorySlug;
  storageUsed: number;
  storageLimit: number;
  requiresResolution: boolean;
};

type DocumentsWorkspaceValue = DocumentsResponse & {
  activeCollection: DocumentCollection;
  productName: string;
  collections: DocumentCollection[];
  tags: DocumentTag[];
};
const DocumentsWorkspaceContext = createContext<DocumentsWorkspaceValue | null>(
  null,
);

export function useDocumentsWorkspace() {
  const context = useOptionalDocumentsWorkspace();
  if (!context)
    throw new Error(
      "useDocumentsWorkspace must be used inside DocumentsWorkspaceShell.",
    );
  return context;
}

export function useOptionalDocumentsWorkspace() {
  return useContext(DocumentsWorkspaceContext);
}

export function DocumentsWorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: documentsData, error, refetch } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => fetchJson<DocumentsResponse>("/api/documents"),
  });
  const {
    data: referenceData,
    error: referenceError,
    refetch: refetchReference,
  } = useWorkspaceReference();
  const data =
    documentsData && referenceData
      ? {
          ...documentsData,
          productName: referenceData.product.name,
          collections: referenceData.collections,
          tags: referenceData.tags,
        }
      : null;
  const requestedCollectionId = searchParams.get("collection");
  const viewerOpen = /^\/documents\/[^/]+$/.test(pathname);
  const activeCollection = useMemo(() => {
    if (!data?.collections.length) return null;
    return (
      data.collections.find(
        (collection) => collection.id === requestedCollectionId,
      ) ?? data.collections[0]
    );
  }, [data?.collections, requestedCollectionId]);

  function openCollection(collectionId: string) {
    setMobileOpen(false);
    if (pathname === "/documents")
      return router.replace(`/documents?collection=${collectionId}`, {
        scroll: false,
      });
    if (pathname === "/documents/upload")
      return router.replace(`/documents/upload?collection=${collectionId}`, {
        scroll: false,
      });
    router.push(`/documents?collection=${collectionId}`);
  }

  if (error || referenceError)
    return (
      <ClientPageError
        message={(error ?? referenceError)?.message ?? "Could not load documents."}
        onRetry={() => {
          void refetch();
          void refetchReference();
        }}
      />
    );

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close collections"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col gap-1 overflow-hidden border-r border-zinc-200 bg-white p-3 shadow-xl transition-transform dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="theme-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
          {!data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          ) : (
            data.collections.map((collection) => {
              const count = data.documents.filter(
                (document) => document.collection_id === collection.id,
              ).length;
              const active = collection.id === activeCollection?.id;
              const Icon =
                (Icons[
                  collection.icon as keyof typeof Icons
                ] as React.ElementType) ?? Folder;
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => openCollection(collection.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${active ? "border-theme-border bg-theme-soft font-semibold text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark" : "border-transparent text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {collection.name}
                  </span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800">
                    {count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <main className="theme-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="sticky top-3 z-20 ml-4 mt-3 flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold shadow-sm dark:border-zinc-700 dark:bg-zinc-900 lg:hidden"
        >
          <Folders className="size-4 text-theme-primary" />
          {activeCollection?.name ?? "Collections"}
        </button>
        {!data || !activeCollection ? (
          viewerOpen ? (
            children
          ) : (
            <DocumentsContentSkeleton />
          )
        ) : (
          <DocumentsWorkspaceContext.Provider
            value={{ ...data, activeCollection }}
          >
            {children}
          </DocumentsWorkspaceContext.Provider>
        )}
      </main>
    </div>
  );
}
