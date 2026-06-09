import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/marketing/article-page";
import { articles, getArticle } from "@/lib/marketing/content";
import { absoluteUrl } from "@/lib/seo";

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
  const path = `/blog/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: absoluteUrl(path),
      publishedTime: article.publishedAt,
    },
  };
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

