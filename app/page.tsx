import { ProductLandingPage } from "@/components/marketing/product-landing-page";
import { absoluteUrl } from "@/lib/seo";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Business Knowledge Workspace",
  description:
    "Turn business documents into an AI-powered knowledge workspace. Upload contracts, policies, SOPs, reports, and company files to ask questions, generate reports, and make better decisions.",
  keywords: [
    "business knowledge workspace",
    "AI business knowledge base",
    "AI business assistant",
    "business document intelligence",
    "AI report generation",
    "business knowledge management",
    "document intelligence platform",
    "AI workspace for businesses",
    "business decision support AI",
    "AI powered business workspace",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "HelpexAI Business - AI Business Knowledge Workspace",
    description:
      "Upload business documents, generate AI reports, and get source-backed answers from your company knowledge.",
    url: absoluteUrl("/"),
  },
};

export default function HomePage() {
  return <ProductLandingPage category="business" />;
}
