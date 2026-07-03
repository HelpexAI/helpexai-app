import type { Metadata } from "next";

export const SITE_NAME = "HelpexAI";
export const SITE_URL = "https://helpexai.com";
export const DEFAULT_TITLE = "HelpexAI - AI Business Knowledge Workspace";
export const DEFAULT_DESCRIPTION =
  "HelpexAI helps businesses turn documents and internal knowledge into searchable AI answers, professional reports, and source-backed business insights.";
export const DEFAULT_OG_IMAGE = "/og/helpexai-og.png";
export const DEFAULT_OG_IMAGE_ALT =
  "HelpexAI - AI Business Knowledge Workspace";

export type PublicPageSeo = {
  title: string;
  description: string;
  path: string;
};

export const PUBLIC_PAGE_SEO = {
  home: {
    title:
      "HelpexAI - AI Business Knowledge Workspace for Documents and Reports",
    description:
      "Turn business documents into a searchable AI knowledge workspace. Upload company documents, ask questions, generate professional reports, and get source-backed answers.",
    path: "/",
  },
  freeTool: {
    title: "Free Document AI Tool - Ask Questions From a Document",
    description:
      "Upload one PDF, DOCX, or TXT file and ask AI questions from your document. Get grounded answers with source excerpts using HelpexAI's free document AI tool.",
    path: "/free-tool",
  },
  pricing: {
    title: "HelpexAI Pricing - AI Business Knowledge Workspace Plans",
    description:
      "Choose a HelpexAI plan for document storage, AI chat queries, business reports, and workspace capacity. Start free and upgrade as your business knowledge grows.",
    path: "/pricing",
  },
  blog: {
    title: "HelpexAI Guides - AI Document Intelligence and Business Knowledge",
    description:
      "Read practical guides about AI document intelligence, business knowledge workspaces, AI-powered knowledge bases, document reports, and better business decisions.",
    path: "/blog",
  },
  privacy: {
    title: "Privacy Policy - HelpexAI",
    description:
      "Read how HelpexAI collects, uses, stores, protects, and processes information for its AI document intelligence and business knowledge workspace.",
    path: "/privacy",
  },
  terms: {
    title: "Terms of Service - HelpexAI",
    description:
      "Read the terms for using HelpexAI, including accounts, uploaded content, AI-generated outputs, subscriptions, cancellations, and platform usage.",
    path: "/terms",
  },
  refunds: {
    title: "Refund Policy - HelpexAI",
    description:
      "Read how HelpexAI handles subscription billing, cancellations, failed payments, chargebacks, and refund requests.",
    path: "/refunds",
  },
  contact: {
    title: "Contact HelpexAI - Support, Billing, and Privacy Requests",
    description:
      "Contact HelpexAI for product questions, account support, billing inquiries, privacy requests, and general help.",
    path: "/contact",
  },
} satisfies Record<string, PublicPageSeo>;

export const BLOG_POST_SEO = {
  "what-is-a-business-knowledge-workspace": {
    title: "What Is a Business Knowledge Workspace?",
    description:
      "Learn how businesses turn contracts, policies, SOPs, reports, invoices, and internal documents into a searchable AI-powered knowledge workspace.",
    path: "/blog/what-is-a-business-knowledge-workspace",
  },
  "how-to-build-an-ai-business-knowledge-base": {
    title: "How to Build an AI-Powered Business Knowledge Base",
    description:
      "Learn how to organize business documents with categories, tags, conversations, and reports to create an AI-powered business knowledge base.",
    path: "/blog/how-to-build-an-ai-business-knowledge-base",
  },
  "how-to-generate-business-reports-with-ai": {
    title: "How to Generate Business Reports From Documents Using AI",
    description:
      "Learn how AI can transform business documents into summaries, risk reports, action items, decision briefs, and reusable business reports.",
    path: "/blog/how-to-generate-business-reports-with-ai",
  },
  "using-ai-for-business-decisions": {
    title: "Using AI to Support Better Business Decisions",
    description:
      "Discover how AI-powered knowledge workspaces help teams use contracts, policies, reports, SOPs, and business documents to support better decisions.",
    path: "/blog/using-ai-for-business-decisions",
  },
} satisfies Record<string, PublicPageSeo>;

export const BUSINESS_PAGE_SEO = {
  "business-knowledge-workspace": {
    title:
      "Business Knowledge Workspace - Turn Documents Into Searchable AI Knowledge",
    description:
      "Create one AI workspace for company documents. Upload contracts, policies, SOPs, invoices, reports, and internal files to ask questions and generate source-backed answers.",
    path: "/business/business-knowledge-workspace",
  },
  "ai-document-reports": {
    title: "AI Document Reports - Generate Business Reports From Documents",
    description:
      "Generate business summaries, risk reports, decision briefs, action item reports, and custom reports from one or more business documents.",
    path: "/business/ai-document-reports",
  },
  "contract-risk-reports": {
    title: "AI Contract Risk Reports - Understand Contract Risks Faster",
    description:
      "Upload vendor agreements, NDAs, service contracts, and business agreements to generate contract risk reports with key terms, risks, recommendations, and source citations.",
    path: "/business/contract-risk-reports",
  },
} satisfies Record<string, PublicPageSeo>;

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function canonicalUrl(path = "/") {
  return absoluteUrl(path);
}

export function createPageMetadata(
  seo: PublicPageSeo,
  options: { type?: "website" | "article"; publishedTime?: string } = {},
): Metadata {
  const image = absoluteUrl(DEFAULT_OG_IMAGE);
  const url = canonicalUrl(seo.path);
  const type = options.type ?? "website";

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      title: seo.title,
      description: seo.description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: DEFAULT_OG_IMAGE_ALT,
        },
      ],
      ...(type === "article" && options.publishedTime
        ? { publishedTime: options.publishedTime }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [image],
    },
  };
}

export function jsonLdScript(data: unknown) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webPageJsonLd(seo: PublicPageSeo) {
  return {
    "@type": "WebPage",
    name: seo.title,
    description: seo.description,
    url: absoluteUrl(seo.path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}
