import Link from "next/link";
import { ArrowRight, Check, MessageSquareText, ShieldCheck, Upload } from "lucide-react";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import type { UseCasePage as UseCase } from "@/lib/marketing/content";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { themeStyle } from "@/lib/theme";

export function UseCasePage({ useCase }: { useCase: UseCase }) {
  const signupHref = `/signup?category=${useCase.category}`;
  const path = `/${useCase.category}/${useCase.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: `HelpexAI ${useCase.title}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: useCase.description,
        url: absoluteUrl(path),
        provider: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: useCase.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: useCase.category, item: absoluteUrl(`/${useCase.category}`) },
          { "@type": "ListItem", position: 3, name: useCase.title, item: absoluteUrl(path) },
        ],
      },
    ],
  };

  return (
    <div className="marketing-page min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50" style={themeStyle(useCase.category)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="min-h-screen bg-[oklch(0.985_0.003_247.858)] dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col p-4 sm:p-6 lg:px-10 lg:py-8 xl:px-12">
          <MarketingHeader authCategory={useCase.category} />
          <main className="flex flex-1 flex-col gap-12 pt-10 sm:pt-14">
            <section className="mx-auto max-w-4xl text-center">
              <span className="inline-flex rounded-full bg-theme-soft px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-soft-foreground dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark">{useCase.eyebrow}</span>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">{useCase.title}</h1>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-zinc-500 dark:text-zinc-400">{useCase.description}</p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={signupHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-theme-primary px-6 py-3 text-sm font-semibold text-white">Start free <ArrowRight className="size-4" /></Link>
                <Link href="/free-tool" className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-900">Try the free tool</Link>
              </div>
            </section>
            <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <article className="rounded-3xl bg-[#0a1628] p-7 text-white sm:p-9">
                <h2 className="text-2xl font-black">The review challenge</h2>
                <p className="mt-4 text-base leading-8 text-white/70">{useCase.problem}</p>
              </article>
              <div className="grid gap-4 sm:grid-cols-2">
                {useCase.outcomes.map((outcome) => <div key={outcome} className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-5 font-semibold shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><Check className="mt-0.5 size-5 shrink-0 text-theme-primary" />{outcome}</div>)}
              </div>
            </section>
            <section>
              <h2 className="text-3xl font-black tracking-tight">A simple, verifiable workflow</h2>
              <div className="mt-7 grid gap-5 md:grid-cols-3">
                {useCase.workflow.map((step, index) => {
                  const Icon = [Upload, MessageSquareText, ShieldCheck][index] ?? Check;
                  return <article key={step.title} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><Icon className="size-6 text-theme-primary" /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-theme-primary">Step {index + 1}</p><h3 className="mt-2 text-xl font-bold">{step.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{step.description}</p></article>;
                })}
              </div>
            </section>
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-2xl font-black">Questions you can ask</h2>
                <div className="mt-5 space-y-3">{useCase.questions.map((question) => <div key={question} className="rounded-xl bg-zinc-50 p-4 text-sm font-medium dark:bg-zinc-950">{question}</div>)}</div>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-2xl font-black">Frequently asked questions</h2>
                <div className="mt-5 space-y-5">{useCase.faq.map((item) => <div key={item.question}><h3 className="font-bold">{item.question}</h3><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{item.answer}</p></div>)}</div>
              </div>
            </section>
          </main>
          <MarketingFooter />
        </div>
      </div>
    </div>
  );
}

