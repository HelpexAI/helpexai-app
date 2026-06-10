import type { Plan } from '@/types'

// Plan limits
export const PLAN_LIMITS = {
  free: {
    max_documents: 3,
    max_queries_day: 5,
  },
  pro: {
    max_documents: 30,
    max_queries_day: 30,
  },
  premium: {
    max_documents: 100,
    max_queries_day: 100,
  },
} as const

export function normalizePlanSlug(plan: string | null | undefined): Plan['slug'] {
  return plan === 'premium' || plan === 'pro' ? plan : 'free'
}

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(0)}/mo`
}
