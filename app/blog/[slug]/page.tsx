import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/marketing/article-page";
import { articles, getArticle } from "@/lib/marketing/content";
import { BLOG_POST_SEO, createPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  const seo = BLOG_POST_SEO[article.slug as keyof typeof BLOG_POST_SEO] ?? {
    title: article.title,
    description: article.description,
    path: `/blog/${article.slug}`,
  };
  return createPageMetadata(seo, {
    type: "article",
    publishedTime: article.publishedAt,
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  return <ArticlePage article={article} />;
}
