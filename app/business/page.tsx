import type { Metadata } from "next";
import { ProductLandingPage } from "@/components/marketing/product-landing-page";
import { absoluteUrl } from "@/lib/seo";
import { getActiveProduct } from "@/lib/products/catalog";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "AI Document Analysis for Small Businesses",
  description:
    "Understand contracts, invoices, policies, proposals, and reports faster with Helpex Business. Get clear, source-backed answers from your business documents.",
  keywords: [
    "AI document analysis for business",
    "small business document AI",
    "invoice analysis AI",
    "vendor contract analysis",
    "business document summarizer",
  ],
  alternates: { canonical: "/business" },
  openGraph: {
    title: "Helpex Business - AI Document Analysis for SMBs",
    description: "Turn business documents into clear, actionable, source-backed answers.",
    url: absoluteUrl("/business"),
  },
};
export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  const product = await getActiveProduct("business");
  if (!product) notFound();
  return <ProductLandingPage category="business" databaseProduct={product} />;
}
