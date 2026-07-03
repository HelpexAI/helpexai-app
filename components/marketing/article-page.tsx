import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock3 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import type { SeoArticle } from "@/lib/marketing/content";
import {
  absoluteUrl,
  BLOG_POST_SEO,
  breadcrumbJsonLd,
  DEFAULT_OG_IMAGE,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import { themeStyle } from "@/lib/theme";

export function ArticlePage({ article }: { article: SeoArticle }) {
  const seo = BLOG_POST_SEO[article.slug as keyof typeof BLOG_POST_SEO] ?? {
    title: article.title,
    description: article.description,
    path: `/blog/${article.slug}`,
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: article.title,
        description: seo.description,
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
        mainEntityOfPage: absoluteUrl(seo.path),
        url: absoluteUrl(seo.path),
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
      },
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Guides", path: "/blog" },
        { name: article.title, path: seo.path },
      ]),
    ],
  };

  return (
    <div className="marketing-page min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50" style={themeStyle(article.category)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader authCategory={article.category} />
          <main className="mx-auto w-full max-w-4xl flex-1 pt-10 sm:pt-14">
            <nav className="text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/">Home</Link> / <Link href="/blog">Guides</Link> / <span>{article.category === "legal" ? "Legal" : "Business"}</span>
            </nav>
            <article className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-theme-soft px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-soft-foreground dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">
                <BookOpen className="size-4" /> Practical guide
              </span>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">{article.title}</h1>
              <p className="mt-5 text-lg leading-8 text-zinc-500 dark:text-zinc-400">{article.description}</p>
              <div className="mt-5 flex flex-wrap gap-4 border-b border-zinc-200 pb-7 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span>By HelpexAI</span>
                <span className="flex items-center gap-2"><CalendarDays className="size-4" /> June 9, 2026</span>
                <span className="flex items-center gap-2"><Clock3 className="size-4" /> {article.readTime}</span>
              </div>
              <p className="mt-8 text-base font-medium leading-8 text-zinc-700 dark:text-zinc-300">{article.intro}</p>
              <div className="mt-9 space-y-10">
                {article.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="text-2xl font-black tracking-tight">{section.heading}</h2>
                    <div className="mt-4 space-y-4 text-base leading-8 text-zinc-600 dark:text-zinc-300">
                      {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    </div>
                    {section.bullets && (
                      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                        {section.bullets.map((item) => <li key={item} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-950">{item}</li>)}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </article>
            <section className="mt-7 rounded-3xl bg-[#0a1628] p-7 text-white sm:p-9">
              <h2 className="text-2xl font-black">Put this workflow into practice</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Use HelpexAI to ask grounded questions, compare selected documents, and inspect supporting citations.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={article.relatedUseCase} className="inline-flex items-center justify-center gap-2 rounded-full bg-theme-primary px-6 py-3 text-sm font-semibold">Explore the use case <ArrowRight className="size-4" /></Link>
                <Link href="/pricing" className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold">View pricing</Link>
                <Link href="/free-tool" className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold">Try the free tool</Link>
              </div>
            </section>
          </main>
          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}
