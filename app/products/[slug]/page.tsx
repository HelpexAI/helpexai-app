import { ProductLandingPage } from "@/components/marketing/product-landing-page";
import { getActiveProduct } from "@/lib/products/catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await getActiveProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.hero_message || product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default async function DynamicProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await getActiveProduct((await params).slug);
  if (!product) notFound();

  // New products receive the established Business landing structure while all
  // product identity, copy, AI behavior, and theme come from the database.
  return <ProductLandingPage category="business" />;
}
