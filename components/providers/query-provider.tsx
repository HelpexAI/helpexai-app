"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWorkspaceReference } from "@/lib/client/workspace-reference";
import { useState } from "react";

function WorkspaceReferenceBootstrap() {
  useWorkspaceReference();
  return null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: true,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceReferenceBootstrap />
      {children}
    </QueryClientProvider>
  );
}
