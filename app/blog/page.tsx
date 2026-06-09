import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { articles } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Document AI Guides",
  description:
    "Practical guides for reviewing legal and business documents with AI, citations, and source verification.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <div className="marketing-page min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader />
          <main className="flex flex-1 flex-col gap-10 pt-10 sm:pt-14">
            <section className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <BookOpen className="size-4 text-theme-primary" /> HelpexAI Guides
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Practical document intelligence guides</h1>
              <p className="mt-4 text-lg leading-8 text-zinc-500 dark:text-zinc-400">Learn repeatable, citation-first workflows for reviewing legal and business documents with AI.</p>
            </section>
            <section className="grid gap-5 md:grid-cols-2">
              {articles.map((article) => (
                <article key={article.slug} className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
                  <p className="text-xs font-bold uppercase tracking-wider text-theme-primary">{article.category} guide</p>
                  <h2 className="mt-3 text-2xl font-black leading-tight">{article.title}</h2>
                  <p className="mt-4 flex-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{article.description}</p>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{article.readTime}</span>
                    <Link href={`/blog/${article.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-theme-primary">Read guide <ArrowRight className="size-4" /></Link>
                  </div>
                </article>
              ))}
            </section>
          </main>
          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}

