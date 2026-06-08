import { CategorySlug, Plan } from '@/types'

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

// Plans per category (same limits, separate Stripe products)
export const PLANS: Record<CategorySlug, Plan[]> = {
  legal: [
    {
      id: 'legal_free',
      name: 'Free',
      slug: 'free',
      category_slug: 'legal',
      price_monthly: 0,
      stripe_price_id: null,
      ...PLAN_LIMITS.free,
    },
    {
      id: 'legal_pro',
      name: 'Pro',
      slug: 'pro',
      category_slug: 'legal',
      price_monthly: 2900,
      stripe_price_id: process.env.STRIPE_LEGAL_PRO_PRICE_ID || null,
      ...PLAN_LIMITS.pro,
    },
    {
      id: 'legal_premium',
      name: 'Premium',
      slug: 'premium',
      category_slug: 'legal',
      price_monthly: 4900,
      stripe_price_id: process.env.STRIPE_LEGAL_PREMIUM_PRICE_ID || null,
      ...PLAN_LIMITS.premium,
    },
  ],
  business: [
    {
      id: 'business_free',
      name: 'Free',
      slug: 'free',
      category_slug: 'business',
      price_monthly: 0,
      stripe_price_id: null,
      ...PLAN_LIMITS.free,
    },
    {
      id: 'business_pro',
      name: 'Pro',
      slug: 'pro',
      category_slug: 'business',
      price_monthly: 2900,
      stripe_price_id: process.env.STRIPE_BUSINESS_PRO_PRICE_ID || null,
      ...PLAN_LIMITS.pro,
    },
    {
      id: 'business_premium',
      name: 'Premium',
      slug: 'premium',
      category_slug: 'business',
      price_monthly: 4900,
      stripe_price_id: process.env.STRIPE_BUSINESS_PREMIUM_PRICE_ID || null,
      ...PLAN_LIMITS.premium,
    },
  ],
}

export function getPlan(categorySlug: CategorySlug, planSlug: string): Plan | undefined {
  return PLANS[categorySlug]?.find(p => p.slug === planSlug)
}

export function normalizePlanSlug(plan: string | null | undefined): Plan['slug'] {
  return plan === 'premium' || plan === 'pro' ? plan : 'free'
}

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(0)}/mo`
}
