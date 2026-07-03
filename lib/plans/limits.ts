import type { Plan } from "@/types";

export const PLAN_LIMITS = {
  free: {
    max_storage_bytes: 30 * 1024 * 1024,
    max_queries_day: 100,
    max_reports_month: 5,
  },
  pro: {
    max_storage_bytes: 500 * 1024 * 1024,
    max_queries_day: 500,
    max_reports_month: 30,
  },
  premium: {
    max_storage_bytes: 2 * 1024 * 1024 * 1024,
    max_queries_day: -1,
    max_reports_month: 100,
  },
} as const;

export function normalizePlanSlug(plan: string | null | undefined): Plan["slug"] {
  return plan === "premium" || plan === "pro" ? plan : "free";
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  const amount = cents / 100;
  const display = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
  return `$${display}/mo`;
}
