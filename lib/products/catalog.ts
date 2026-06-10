import { createServiceClient } from "@/lib/supabase/server";
import { BUSINESS_OFF_TOPIC_RESPONSE, BUSINESS_SYSTEM_PROMPT } from "@/lib/ai/prompts/business";
import { DEFAULT_PRODUCT_THEME } from "@/lib/theme";
import type { CategorySlug, Product, ProductTheme } from "@/types";
import { cache } from "react";

export const FALLBACK_PRODUCT: Product = {
  slug: "business",
  name: "Helpex Business",
  short_name: "Business",
  description: "AI intelligence for business documents.",
  hero_message: "Turn business documents into clear, actionable answers",
  icon: "briefcase",
  is_active: true,
  sort_order: 1,
  system_prompt: BUSINESS_SYSTEM_PROMPT,
  off_topic_response: BUSINESS_OFF_TOPIC_RESPONSE,
  disclaimer_text:
    "AI analysis only. This does not constitute legal or financial advice. Always verify important business decisions with a qualified professional.",
  theme: DEFAULT_PRODUCT_THEME,
  marketing: {},
};

function normalizeProduct(row: Record<string, unknown>): Product {
  return {
    ...FALLBACK_PRODUCT,
    ...row,
    slug: String(row.slug),
    name: String(row.name),
    short_name: String(row.short_name || row.name),
    description: String(row.description || ""),
    hero_message: String(row.hero_message || ""),
    system_prompt: String(row.system_prompt || FALLBACK_PRODUCT.system_prompt),
    off_topic_response: String(row.off_topic_response || FALLBACK_PRODUCT.off_topic_response),
    disclaimer_text: String(row.disclaimer_text || FALLBACK_PRODUCT.disclaimer_text),
    theme: { ...DEFAULT_PRODUCT_THEME, ...((row.theme as Partial<ProductTheme>) || {}) },
    marketing: (row.marketing as Record<string, unknown>) || {},
  };
}

export const getActiveProducts = cache(async (): Promise<Product[]> => {
  const { data, error } = await createServiceClient()
    .from("categories")
    .select("slug, name, short_name, description, hero_message, icon, is_active, sort_order, system_prompt, off_topic_response, disclaimer_text, theme, marketing")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data?.length) return [FALLBACK_PRODUCT];
  return data.map((row) => normalizeProduct(row as Record<string, unknown>));
});

export async function getActiveProduct(slug: CategorySlug | null | undefined) {
  const products = await getActiveProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getDefaultProduct() {
  return (await getActiveProducts())[0] ?? FALLBACK_PRODUCT;
}

export async function isActiveProductSlug(slug: unknown): Promise<boolean> {
  return typeof slug === "string" && Boolean(await getActiveProduct(slug));
}

export async function getProductForAccount(slug: CategorySlug) {
  const { data } = await createServiceClient()
    .from("categories")
    .select("slug, name, short_name, description, hero_message, icon, is_active, sort_order, system_prompt, off_topic_response, disclaimer_text, theme, marketing")
    .eq("slug", slug)
    .maybeSingle();
  return data ? normalizeProduct(data as Record<string, unknown>) : FALLBACK_PRODUCT;
}
