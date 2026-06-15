"use client";

import { fetchJson, queryKeys } from "@/lib/client/query";
import type {
  CategorySlug,
  DocumentCollection,
  DocumentTag,
  Plan,
  Product,
} from "@/types";
import { useQuery } from "@tanstack/react-query";

export type WorkspaceReferenceData = {
  category: CategorySlug;
  product: Product;
  collections: DocumentCollection[];
  tags: DocumentTag[];
  plans: Plan[];
  reportTemplates: Array<{
    id: string;
    category_slug: CategorySlug;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    type: string;
    goal: string;
    required_sections: string[] | null;
    writing_style: Record<string, unknown> | null;
    min_plan: Plan["slug"];
    sort_order: number;
  }>;
};

export const workspaceReferenceQuery = {
  queryKey: queryKeys.workspaceReference,
  queryFn: () =>
    fetchJson<WorkspaceReferenceData>("/api/workspace/reference"),
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
} as const;

export function useWorkspaceReference() {
  return useQuery(workspaceReferenceQuery);
}
