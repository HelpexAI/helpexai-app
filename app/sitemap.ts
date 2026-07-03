import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const blogPosts = [
  "what-is-a-business-knowledge-workspace",
  "how-to-build-an-ai-business-knowledge-base",
  "how-to-generate-business-reports-with-ai",
  "using-ai-for-business-decisions",
];

const businessPages = [
  "business-knowledge-workspace",
  "ai-document-reports",
  "contract-risk-reports",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const corePages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/free-tool"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/pricing"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/refunds"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
  const articlePages: MetadataRoute.Sitemap = blogPosts.map((slug) => ({
    url: absoluteUrl(`/blog/${slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const useCasePages: MetadataRoute.Sitemap = businessPages.map((slug) => ({
    url: absoluteUrl(`/business/${slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [...corePages, ...useCasePages, ...articlePages];
}
