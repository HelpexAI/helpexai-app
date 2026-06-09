import type { Metadata } from "next";
import { ProductLandingPage } from "@/components/marketing/product-landing-page";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI Legal Document Analysis with Citations",
  description:
    "Review contracts, agreements, policies, and legal documents faster with Helpex Legal. Ask questions and get grounded AI answers with source citations.",
  keywords: [
    "AI legal document analysis",
    "AI contract review",
    "legal document AI",
    "contract analysis software",
    "legal document summarizer",
  ],
  alternates: { canonical: "/legal" },
  openGraph: {
    title: "Helpex Legal - AI Legal Document Analysis",
    description: "Review legal documents faster with grounded AI answers and source citations.",
    url: absoluteUrl("/legal"),
  },
};

export default function LegalPage() {
  return <ProductLandingPage category="legal" />;
}

