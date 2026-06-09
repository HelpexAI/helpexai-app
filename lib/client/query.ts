"use client";

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  documents: ["documents"] as const,
  document: (id: string) => ["documents", id] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversations", id] as const,
};

type InvalidateClient = {
  invalidateQueries: (options: { queryKey: readonly unknown[] }) => Promise<unknown>;
};

export async function invalidateWorkspaceQueries(queryClient: InvalidateClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations }),
  ]);
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}
