import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { articles, useCases } from "@/lib/marketing/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const corePages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/legal"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/business"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/free-tool"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/blog/${article.slug}`),
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const useCasePages: MetadataRoute.Sitemap = useCases.map((useCase) => ({
    url: absoluteUrl(`/${useCase.category}/${useCase.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.85,
  }));
  return [...corePages, ...useCasePages, ...articlePages];
}
